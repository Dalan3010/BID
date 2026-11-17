"use client";

import type { ChatMessage, Idea, IdeaNode, NodeType } from "@bid/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Attachment } from "@/lib/attachments";
import {
  ApiError,
  errorMessage,
  loadIdea,
  requestExtraction,
  resolveProposal,
  sendMessage,
  type ProposalDecision,
} from "@/lib/api";
import { applyResolution } from "@/lib/graph";
import { readTextStream } from "@/lib/stream";

/**
 * State and server orchestration of the workspace (`/ideas/[id]`).
 *
 * The cycle of one turn follows `docs/HANDOVER/07_FLUJO_BUSINESS_COACH.md`:
 *
 * 1. The user's message appears at once (optimistic) while it is sent.
 * 2. HTTP errors are handled **before** reading any stream.
 * 3. The coach's answer is read from `response.body` and shown as it arrives.
 * 4. When it ends, the idea is reloaded: the server's messages replace the
 *    optimistic ones (real ids, real timestamps).
 * 5. The extraction runs as a **separate call**. A 429 shows the quota notice
 *    and the conversation goes on; a failure shows a soft notice and leaves
 *    messages and graph untouched.
 * 6. New proposals are loaded from the server; nothing is promoted locally.
 *
 * Proposal decisions update the graph only with the node the API returned.
 *
 * Discarding waits `DISCARD_DELAY_MS` before calling the API, so the person
 * can undo; nothing is shown as discarded-and-saved until the API answered.
 * "Añadir todas" resolves the proposals one by one, each through the API.
 */

/** How long a discard can be undone before the request is sent. */
export const DISCARD_DELAY_MS = 5000;

/** How long the local attachment turn "thinks" before the canned answer. */
const ATTACHMENT_REPLY_DELAY_MS = 900;

/**
 * Answer of the local attachment turn.
 *
 * Attachments have no endpoint yet (see the `send` comment), so the text says
 * what is true today instead of pretending the coach read the file.
 */
function simulatedAttachmentReply(name: string): string {
  return `He recibido «${name}». Todavía no puedo leerlo: los archivos aún no salen de tu navegador. Cuando conectemos la subida, podré revisarlo y proponerte nodos del plan.`;
}

/** What the conversation is doing right now. */
export type TurnPhase = "idle" | "sending" | "streaming" | "extracting";

/** A message shown in the conversation; `pending` ones are not stored yet. */
export interface ConversationMessage extends Pick<ChatMessage, "id" | "role" | "content" | "createdAt"> {
  readonly pending?: boolean;
  /**
   * Image or PDF sent with this message. Local for now: the API has no upload
   * endpoint, so only the messages of the simulated turn carry one.
   */
  readonly attachment?: Attachment;
}

/** A notice about the turn (not tied to a field). */
export interface TurnNotice {
  readonly tone: "error" | "warning" | "info";
  readonly title: string;
  readonly message: string;
  /**
   * Text that can be sent again from the notice. Only set after a 502: the
   * message is already stored, so resending it shows it twice in the history
   * (the API has no "answer again" endpoint); the notice says so.
   */
  readonly retryContent?: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "ready" };

/** Per-proposal request state. */
export interface ProposalRequest {
  readonly decision: ProposalDecision;
  readonly error?: string;
}

export function useWorkspace(ideaId: string) {
  const router = useRouter();

  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [idea, setIdea] = useState<Idea | null>(null);
  const [nodes, setNodes] = useState<IdeaNode[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [phase, setPhase] = useState<TurnPhase>("idle");
  const [notice, setNotice] = useState<TurnNotice | null>(null);
  const [quotaNotice, setQuotaNotice] = useState<string | null>(null);
  const [requests, setRequests] = useState<Record<string, ProposalRequest>>({});
  /** Proposals that arrived in this session, to animate their entrance. */
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(new Set());
  /** Proposals waiting to be discarded: id → moment the request will be sent. */
  const [pendingDiscards, setPendingDiscards] = useState<Record<string, number>>({});
  const discardTimers = useRef(new Map<string, { timer: number; run: () => void }>());
  /** Progress of "Añadir todas al plan", or `null` when idle. */
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  /** The dimension that just changed, so the plan can light it briefly. */
  const [highlight, setHighlight] = useState<{ type: NodeType; at: number } | null>(null);

  /** Pending "thinking" timer of a local attachment turn. */
  const attachmentTimer = useRef<{ id: number; resolve: () => void } | null>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Leaving the workspace must not leave the turn hanging on a timer.
      const pending = attachmentTimer.current;
      if (pending) {
        window.clearTimeout(pending.id);
        pending.resolve();
        attachmentTimer.current = null;
      }
    };
  }, []);

  const handleAuthError = useCallback(
    (error: unknown): boolean => {
      if (error instanceof ApiError && error.isUnauthorized) {
        router.replace(`/sign-in?next=${encodeURIComponent(`/ideas/${ideaId}`)}`);
        return true;
      }
      return false;
    },
    [router, ideaId],
  );

  /** Loads the idea from the server and replaces local state with it. */
  const refresh = useCallback(
    async (signal?: AbortSignal): Promise<IdeaNode[] | null> => {
      try {
        const detail = await loadIdea(ideaId, signal);
        if (!mounted.current) return null;
        setIdea(detail.idea);
        setNodes([...detail.graph.nodes]);
        setMessages([...detail.messages]);
        setLoad({ status: "ready" });
        return [...detail.graph.nodes];
      } catch (error) {
        if (signal?.aborted || !mounted.current) return null;
        if (handleAuthError(error)) return null;
        if (error instanceof ApiError && error.isNotFound) {
          setLoad({ status: "not-found" });
          return null;
        }
        setLoad((current) =>
          current.status === "ready" ? current : { status: "error", message: errorMessage(error) },
        );
        throw error;
      }
    },
    [ideaId, handleAuthError],
  );

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal).catch(() => {
      // Surfaced through `load`.
    });
    return () => controller.abort();
  }, [refresh]);

  /** Runs the extraction after the coach answered (D6). */
  const extract = useCallback(async () => {
    setPhase("extracting");
    try {
      const result = await requestExtraction(ideaId);
      if (!mounted.current) return;

      if (result.kind === "quota") {
        setQuotaNotice(result.message);
        return;
      }

      if (result.proposals.length > 0) {
        await refresh();
        setFreshIds(new Set(result.proposals.map((proposal) => proposal.id)));
      }
    } catch (error) {
      if (!mounted.current || handleAuthError(error)) return;
      setNotice({
        tone: "info",
        title: "No identificamos nada nuevo esta vez",
        message:
          error instanceof ApiError
            ? error.message
            : "La conversación sigue intacta: puedes seguir hablando con el coach.",
      });
    } finally {
      if (mounted.current) setPhase("idle");
    }
  }, [ideaId, refresh, handleAuthError]);

  /**
   * One turn: send, stream the answer, reconcile, then extract.
   *
   * @returns `true` when the API stored the user's message (the composer can
   *   forget the text), `false` when it did not (the text is handed back).
   */
  const send = useCallback(
    async (rawContent: string, attachment: Attachment | null = null): Promise<boolean> => {
      const content = rawContent.trim();
      // A file alone is a message; plain text still needs something to say.
      if ((!content && !attachment) || phase !== "idle") return false;

      // TODO (Backend): Enviar este objeto 'file' junto con el mensaje a la API.
      //
      // Attachments run locally: there is no upload endpoint yet.
      //
      // BACKEND: replace this block with the multipart call the contract
      // already has room for —
      //   `POST /api/ideas/:id/messages` (multipart/form-data) with `content`
      //   and the file as `files[]` —
      // and let the turn fall through to the streaming path below, so the
      // coach answers exactly like it does for a text-only message. The
      // optimistic bubble already renders `attachment`; only the transport
      // is missing.
      if (attachment) {
        const now = new Date().toISOString();
        setNotice(null);
        setPhase("sending");
        setMessages((current) => [
          ...current,
          { id: `local-user-${now}`, role: "user", content, createdAt: now, attachment },
        ]);

        await new Promise<void>((resolve) => {
          const id = window.setTimeout(() => {
            attachmentTimer.current = null;
            resolve();
          }, ATTACHMENT_REPLY_DELAY_MS);

          attachmentTimer.current = { id, resolve };
        });

        // Unmounted: the turn was still accepted, nothing else to show.
        if (!mounted.current) return true;

        setMessages((current) => [
          ...current,
          {
            id: `local-coach-${now}`,
            role: "assistant",
            content: simulatedAttachmentReply(attachment.name),
            createdAt: new Date().toISOString(),
          },
        ]);
        setPhase("idle");
        // These messages live only in the browser: the next text-only turn
        // reloads the conversation from the API and replaces them.
        return true;
      }

      setNotice(null);
      setPhase("sending");

      const now = new Date().toISOString();
      const userTempId = `pending-user-${now}`;
      const coachTempId = `pending-coach-${now}`;

      setMessages((current) => [
        ...current,
        { id: userTempId, role: "user", content, createdAt: now, pending: true },
      ]);

      let response: Response;
      try {
        response = await sendMessage(ideaId, content);
      } catch (error) {
        if (!mounted.current || handleAuthError(error)) return false;
        const stored = error instanceof ApiError && error.status === 502;
        setNotice({
          tone: "error",
          title: "El coach no pudo responder",
          message: stored
            ? `${errorMessage(error)} Si pides otra respuesta, tu mensaje aparecerá dos veces en el historial.`
            : errorMessage(error),
          retryContent: stored ? content : undefined,
        });
        setPhase("idle");
        // The API stores the user's message before calling the model, so the
        // real state may already include it: reload instead of guessing.
        await refresh().catch(() => {
          setMessages((current) => current.filter((message) => message.id !== userTempId));
        });
        // On a 502 the message is already stored (RF-25): the composer must not
        // hand the text back, or retrying would duplicate it. Any other failure
        // (validation, network) means it was not stored.
        return stored;
      }

      setPhase("streaming");
      setMessages((current) => [
        ...current,
        { id: coachTempId, role: "assistant", content: "", createdAt: now, pending: true },
      ]);

      try {
        await readTextStream(response, (text) => {
          if (!mounted.current) return;
          setMessages((current) =>
            current.map((message) =>
              message.id === coachTempId ? { ...message, content: text } : message,
            ),
          );
        });
      } catch {
        if (!mounted.current) return false;
        setNotice({
          tone: "warning",
          title: "La respuesta se interrumpió",
          message: "Se cortó la conexión mientras llegaba la respuesta. Recargamos la conversación guardada.",
        });
      }

      if (!mounted.current) return false;

      try {
        await refresh();
      } catch {
        // Keep what was streamed; the notice above or the next load fixes it.
      }

      await extract();
      return true;
    },
    [ideaId, phase, refresh, extract, handleAuthError],
  );

  /** Accept, correct or discard a proposal — only through the API. */
  const decide = useCallback(
    async (node: IdeaNode, decision: ProposalDecision, content?: string) => {
      setRequests((current) => ({ ...current, [node.id]: { decision } }));

      try {
        const resolution = await resolveProposal(ideaId, node.id, decision, content);
        if (!mounted.current) return;

        setNodes((current) => applyResolution(current, node.id, resolution));
        setRequests((current) => withoutKey(current, node.id));
        if (resolution.node) {
          setHighlight({ type: resolution.node.type, at: Date.now() });
        }
      } catch (error) {
        if (!mounted.current || handleAuthError(error)) return;

        if (error instanceof ApiError && error.isNotFound) {
          // The proposal no longer exists (resolved elsewhere): show the truth.
          setRequests((current) => withoutKey(current, node.id));
          await refresh().catch(() => undefined);
          return;
        }

        setRequests((current) => ({
          ...current,
          [node.id]: { decision, error: errorMessage(error) },
        }));
      }
    },
    [ideaId, refresh, handleAuthError],
  );

  /** Starts the undo window; the API is called only when it ends. */
  const scheduleDiscard = useCallback(
    (node: IdeaNode) => {
      if (discardTimers.current.has(node.id)) return;
      const run = () => {
        discardTimers.current.delete(node.id);
        setPendingDiscards((current) => withoutKey(current, node.id));
        void decide(node, "discard");
      };
      const timer = window.setTimeout(run, DISCARD_DELAY_MS);
      discardTimers.current.set(node.id, { timer, run });
      setPendingDiscards((current) => ({ ...current, [node.id]: Date.now() + DISCARD_DELAY_MS }));
    },
    [decide],
  );

  /** Cancels a discard that has not been sent yet. */
  const undoDiscard = useCallback((nodeId: string) => {
    const entry = discardTimers.current.get(nodeId);
    if (!entry) return;
    window.clearTimeout(entry.timer);
    discardTimers.current.delete(nodeId);
    setPendingDiscards((current) => withoutKey(current, nodeId));
  }, []);

  // Leaving the workspace inside the undo window keeps the person's decision:
  // the pending discards are sent right away (the SPA stays alive, so the
  // requests complete). Closing the tab cancels them: the proposal survives.
  useEffect(() => {
    const timers = discardTimers.current;
    return () => {
      for (const { timer, run } of timers.values()) {
        window.clearTimeout(timer);
        run();
      }
      timers.clear();
    };
  }, []);

  /** Accepts every given proposal, one request after another. */
  const acceptAll = useCallback(
    async (proposals: readonly IdeaNode[]) => {
      const targets = proposals.filter((node) => !discardTimers.current.has(node.id));
      if (targets.length === 0) return;
      setBulk({ done: 0, total: targets.length });
      for (const [index, node] of targets.entries()) {
        await decide(node, "accept");
        if (!mounted.current) return;
        setBulk({ done: index + 1, total: targets.length });
      }
      setBulk(null);
    },
    [decide],
  );

  return {
    load,
    pendingDiscards,
    scheduleDiscard,
    undoDiscard,
    bulk,
    acceptAll,
    idea,
    nodes,
    messages,
    phase,
    notice,
    quotaNotice,
    requests,
    freshIds,
    highlight,
    send,
    decide,
    retryLoad: () => {
      setLoad({ status: "loading" });
      refresh().catch(() => undefined);
    },
    dismissNotice: () => setNotice(null),
    dismissQuotaNotice: () => setQuotaNotice(null),
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;

/** A copy of `record` without `key`. */
function withoutKey<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  const copy = { ...record };
  delete copy[key];
  return copy;
}
