"use client";

import type { ArranqueStep, StepStatus } from "@bid/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ApiError,
  addArranqueSteps,
  errorMessage,
  listArranqueSteps,
  requestStepProposals,
  updateArranqueStepStatus,
  type StepProposal,
} from "@/lib/api";

/**
 * State and server orchestration of the arranque steps (`/ideas/[id]`, once
 * the plan is complete).
 *
 * The rules mirror the workspace hook (`use-workspace.ts`):
 *
 * - Every change goes through the API; nothing is promoted locally.
 * - A proposal is never stored on its own: only `accept` calls
 *   `addArranqueSteps` (product rule 1 — the coach proposes, the person
 *   validates).
 * - The quota is announced, never an error: the API answers
 *   `quotaReached: true` before the model is called, and the person is told.
 * - A missing step (resolved elsewhere) reloads the list: the truth is shown,
 *   not a stale row.
 */

/** Copy shown when the proposals quota is reached (the API announces no message). */
export const STEPS_QUOTA_MESSAGE =
  "Llegaste al límite de propuestas disponibles. Puedes seguir conversando con el coach con normalidad.";

/** Copy shown when the coach answered nothing valid: nothing was proposed or stored. */
export const STEPS_EMPTY_MESSAGE =
  "Esta vez el coach no propuso pasos. Puedes pedírselo de nuevo más adelante.";

type StepsLoad =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

/** A proposal on the table, with its own local key. */
export interface PanelProposal extends StepProposal {
  readonly key: number;
}

export function useArranqueSteps(
  ideaId: string,
  options: { enabled?: boolean } = {},
) {
  const router = useRouter();
  /** False until the plan is complete: nothing to load before the arranque. */
  const enabled = options.enabled ?? true;

  const [load, setLoad] = useState<StepsLoad>({ status: "loading" });
  const [steps, setSteps] = useState<ArranqueStep[]>([]);
  /** Proposals waiting for a decision; nothing here is stored anywhere. */
  const [proposals, setProposals] = useState<readonly PanelProposal[]>([]);
  const [asking, setAsking] = useState(false);
  const [quotaNotice, setQuotaNotice] = useState<string | null>(null);
  const [proposeError, setProposeError] = useState<string | null>(null);
  /** True when the last ask came back with nothing to propose. */
  const [askedEmpty, setAskedEmpty] = useState(false);
  /** The accept in flight, by proposal key. */
  const [accepting, setAccepting] = useState<ReadonlySet<number>>(new Set());
  /** The PATCH in flight, by step id. */
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());
  /** The errors of finished actions, keyed the same way. */
  const [acceptErrors, setAcceptErrors] = useState<Record<number, string>>({});
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  /** Local identity of the next proposal that arrives. */
  const nextKey = useRef(1);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
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

  /** Loads the step list from the server and replaces local state with it. */
  const refresh = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      try {
        const loaded = await listArranqueSteps(ideaId, signal);
        if (!mounted.current) return;
        setSteps([...loaded]);
        setLoad({ status: "ready" });
      } catch (error) {
        if (signal?.aborted || !mounted.current) return;
        if (handleAuthError(error)) return;
        setLoad((current) =>
          current.status === "ready" ? current : { status: "error", message: errorMessage(error) },
        );
      }
    },
    [ideaId, handleAuthError],
  );

  useEffect(() => {
    if (!enabled) {
      setLoad({ status: "ready" });
      setSteps([]);
      return;
    }

    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh, enabled]);

  /** Asks the coach for step proposals. Nothing is stored by this call. */
  const ask = useCallback(async () => {
    if (asking) return;
    setAsking(true);
    setQuotaNotice(null);
    setProposeError(null);
    setAskedEmpty(false);

    try {
      const result = await requestStepProposals(ideaId);
      if (!mounted.current) return;

      if (result.kind === "quota") {
        setQuotaNotice(STEPS_QUOTA_MESSAGE);
        return;
      }

      setProposals(
        result.proposals.map((proposal) => ({ ...proposal, key: nextKey.current++ })),
      );
      if (result.proposals.length === 0) setAskedEmpty(true);
    } catch (error) {
      if (!mounted.current || handleAuthError(error)) return;
      setProposeError(errorMessage(error));
    } finally {
      if (mounted.current) setAsking(false);
    }
  }, [ideaId, asking, handleAuthError]);

  /** Stores one accepted proposal; the API answer joins the list. */
  const accept = useCallback(
    async (proposal: PanelProposal) => {
      setAccepting((current) => new Set(current).add(proposal.key));
      setAcceptErrors((current) => withoutKey(current, String(proposal.key)));

      try {
        const stored = await addArranqueSteps(ideaId, [
          proposal.detail === null
            ? { title: proposal.title }
            : { title: proposal.title, detail: proposal.detail },
        ]);
        if (!mounted.current) return;

        setProposals((current) => current.filter((item) => item.key !== proposal.key));
        setSteps((current) => [...current, ...stored]);
      } catch (error) {
        if (!mounted.current || handleAuthError(error)) return;
        setAcceptErrors((current) => ({
          ...current,
          [proposal.key]: errorMessage(error),
        }));
      } finally {
        if (mounted.current) {
          setAccepting((current) => {
            const copy = new Set(current);
            copy.delete(proposal.key);
            return copy;
          });
        }
      }
    },
    [ideaId, handleAuthError],
  );

  /**
   * Removes a proposal from the table. No request: nothing was stored, so
   * there is nothing to undo either — asking again always brings new ones.
   */
  const discard = useCallback((proposal: PanelProposal) => {
    setProposals((current) => current.filter((item) => item.key !== proposal.key));
    setAcceptErrors((current) => withoutKey(current, String(proposal.key)));
  }, []);

  /** Completes a step, or reopens one that was closed — only through the API. */
  const toggle = useCallback(
    async (step: ArranqueStep) => {
      const next: StepStatus = step.status === "open" ? "done" : "open";
      setSaving((current) => new Set(current).add(step.id));
      setStepErrors((current) => withoutKey(current, step.id));

      try {
        const updated = await updateArranqueStepStatus(ideaId, step.id, next);
        if (!mounted.current) return;

        setSteps((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } catch (error) {
        if (!mounted.current) return;
        if (handleAuthError(error)) return;

        if (error instanceof ApiError && error.isNotFound) {
          // The step no longer exists (changed elsewhere): show the truth.
          await refresh().catch(() => undefined);
          return;
        }

        setStepErrors((current) => ({ ...current, [step.id]: errorMessage(error) }));
      } finally {
        if (mounted.current) {
          setSaving((current) => {
            const copy = new Set(current);
            copy.delete(step.id);
            return copy;
          });
        }
      }
    },
    [ideaId, refresh, handleAuthError],
  );

  return {
    load,
    steps,
    proposals,
    asking,
    quotaNotice,
    proposeError,
    askedEmpty,
    accepting,
    acceptErrors,
    stepErrors,
    saving,
    ask,
    accept,
    discard,
    toggle,
    retryLoad: () => {
      setLoad({ status: "loading" });
      void refresh();
    },
    dismissQuota: () => setQuotaNotice(null),
    dismissProposeError: () => setProposeError(null),
  };
}

export type ArranqueSteps = ReturnType<typeof useArranqueSteps>;

/** A copy of `record` without `key`. */
function withoutKey<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  const copy = { ...record };
  delete copy[key];
  return copy;
}
