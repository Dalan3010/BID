/**
 * Typed HTTP client for the BID API.
 *
 * This module is the client's **only** point of contact with the API
 * (`docs/HANDOVER/04_CONTRATOS_API.md`). Rules it keeps:
 *
 * - Every request carries the session cookie (`credentials: "include"`).
 * - The client never sends an `ownerId`: the API resolves the owner from the
 *   session.
 * - Domain types come from `@bid/core`; the transport shapes (what travels over
 *   HTTP) are declared here, never imported from `apps/api`.
 */
import type {
  ChatMessage,
  Gap,
  Idea,
  IdeaGraph,
  IdeaNode,
  NodeType,
} from "@bid/core";

import { API_URL } from "./config";

/* -------------------------------------------------------------------------- */
/* Transport types                                                            */
/* -------------------------------------------------------------------------- */

/** One row of `GET /api/ideas`: an idea with its progress. */
export interface IdeaProgress {
  readonly idea: Idea;
  /** Share of validated dimensions, 0..1. */
  readonly completion: number;
  /** Dimensions still open. */
  readonly gaps: number;
  /** Every node, `inferred` included. */
  readonly nodeCount: number;
  /** Open dimensions in the order the coach will ask about them. */
  readonly agenda: readonly Gap[];
}

/** `GET /api/ideas/:id`: everything the workspace needs in one round trip. */
export interface IdeaDetail {
  readonly idea: Idea;
  readonly graph: IdeaGraph;
  readonly messages: readonly ChatMessage[];
  /** Shortcut for `graph.nodes.filter(n => n.source === "inferred")`. */
  readonly proposals: readonly IdeaNode[];
}

/** A proposal as returned by `POST /api/ideas/:id/extractions`. */
export interface ExtractedProposal {
  readonly id: string;
  readonly type: NodeType;
  readonly content: string;
  readonly confidence: number | null;
}

/**
 * The outcome of an extraction, already interpreted.
 *
 * The 429 is not an error for the user: it is an announced limit, and the
 * conversation goes on. That is why it is a variant and not a thrown error.
 */
export type ExtractionResult =
  | { readonly kind: "ok"; readonly proposals: readonly ExtractedProposal[] }
  | { readonly kind: "quota"; readonly message: string };

/** What the user decided about a proposal. */
export type ProposalDecision = "accept" | "correct" | "discard";

/** `POST /api/ideas/:id/proposals/:nodeId`. */
export interface ProposalResolution {
  readonly source: "confirmed" | "edited" | null;
  /** The node after the decision; `null` when discarded. */
  readonly node: IdeaNode | null;
}

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

/** Fallback copy when the API did not send a readable message. */
export const GENERIC_ERROR = "Algo salió mal.";

/** Copy when the request never reached the API. */
export const NETWORK_ERROR =
  "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";

/**
 * A failed request, with the status and the API's own message.
 *
 * The API always answers errors as `{ "error": "…" }`; that message is written
 * for the user, so the UI shows it as is.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True when the session is missing or expired. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** True when the resource does not exist or belongs to someone else. */
  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/** Reads `{ error }` from a failed response without ever throwing. */
export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();

    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      if (typeof record.error === "string" && record.error.trim()) {
        return record.error;
      }
      if (typeof record.message === "string" && record.message.trim()) {
        return record.message;
      }
    }
  } catch {
    // Not JSON: fall through to the generic copy.
  }

  return GENERIC_ERROR;
}

/** Turns any thrown value into a sentence the UI can show. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return NETWORK_ERROR;
  return GENERIC_ERROR;
}

/* -------------------------------------------------------------------------- */
/* Low level                                                                  */
/* -------------------------------------------------------------------------- */

/** Builds an absolute API URL. */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

/**
 * `fetch` with the session cookie and a JSON body.
 *
 * Returns the raw `Response`; callers decide how to read it (JSON or stream).
 */
export async function request(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; signal?: AbortSignal } = {},
): Promise<Response> {
  const hasBody = init.body !== undefined;

  return fetch(apiUrl(path), {
    method: init.method ?? "GET",
    credentials: "include",
    cache: "no-store",
    signal: init.signal,
    headers: hasBody ? { "content-type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(init.body) : undefined,
  });
}

/** Requests JSON and throws an `ApiError` on any non-2xx status. */
async function requestJson<T>(
  path: string,
  init?: Parameters<typeof request>[1],
): Promise<T> {
  const response = await request(path, init);

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  return (await response.json()) as T;
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

/** `GET /api/ideas` — the dashboard. */
export async function listIdeas(signal?: AbortSignal): Promise<IdeaProgress[]> {
  const body = await requestJson<{ ideas: IdeaProgress[] }>("/api/ideas", {
    signal,
  });
  return body.ideas;
}

/** `POST /api/ideas` — creates an idea; the title is trimmed, 1..120. */
export async function createIdea(title: string): Promise<Idea> {
  const body = await requestJson<{ idea: Idea }>("/api/ideas", {
    method: "POST",
    body: { title },
  });
  return body.idea;
}

/** `GET /api/ideas/:id` — idea, graph, conversation and proposals. */
export async function loadIdea(
  id: string,
  signal?: AbortSignal,
): Promise<IdeaDetail> {
  return requestJson<IdeaDetail>(`/api/ideas/${encodeURIComponent(id)}`, {
    signal,
  });
}

/**
 * `POST /api/ideas/:id/messages` — one turn of the conversation.
 *
 * The answer is **plain text, streamed**. This returns the raw `Response` once
 * the status is known to be OK, so the caller can read `response.body` with
 * `readTextStream`. Errors are thrown before any stream is read.
 */
export async function sendMessage(
  id: string,
  content: string,
  signal?: AbortSignal,
): Promise<Response> {
  const response = await request(
    `/api/ideas/${encodeURIComponent(id)}/messages`,
    { method: "POST", body: { content }, signal },
  );

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  return response;
}

/**
 * `POST /api/ideas/:id/extractions` — reads the conversation and proposes
 * structure. A separate call from the chat (D6).
 */
export async function requestExtraction(id: string): Promise<ExtractionResult> {
  const response = await request(
    `/api/ideas/${encodeURIComponent(id)}/extractions`,
    { method: "POST", body: {} },
  );

  if (response.status === 429) {
    return { kind: "quota", message: await readErrorMessage(response) };
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  const body = (await response.json()) as {
    proposals?: readonly ExtractedProposal[];
  };

  return { kind: "ok", proposals: body.proposals ?? [] };
}

/**
 * `POST /api/ideas/:id/proposals/:nodeId` — the only path that turns a
 * proposal into knowledge, always on the user's decision.
 */
export async function resolveProposal(
  id: string,
  nodeId: string,
  decision: ProposalDecision,
  content?: string,
): Promise<ProposalResolution> {
  return requestJson<ProposalResolution>(
    `/api/ideas/${encodeURIComponent(id)}/proposals/${encodeURIComponent(nodeId)}`,
    {
      method: "POST",
      body: decision === "correct" ? { decision, content } : { decision },
    },
  );
}

/** `POST /api/demo/reset` — only the demo account; others get a 403. */
export async function resetDemo(): Promise<void> {
  const response = await request("/api/demo/reset", {
    method: "POST",
    body: {},
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }
}

/**
 * `GET /api/account/export` as a URL.
 *
 * The export is downloaded through a top-level navigation, so the browser
 * treats it as a file (`content-disposition: attachment`) and sends the cookie.
 */
export function exportUrl(): string {
  return apiUrl("/api/account/export");
}
