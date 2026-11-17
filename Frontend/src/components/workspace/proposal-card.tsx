"use client";

import type { IdeaNode } from "@bid/core";
import { animate } from "animejs";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { useAnimeScope } from "@/components/motion/use-anime-scope";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SourceTag } from "@/components/ui/status-tag";
import type { ProposalDecision } from "@/lib/api";
import { DIMENSIONS, dimensionIndex } from "@/lib/dimensions";
import { EASE } from "@/lib/motion";

import { TraceButton } from "./dimension-entry";
import { DISCARD_DELAY_MS, type ProposalRequest } from "./use-workspace";

/** The API accepts a corrected text of up to 2000 characters. */
const MAX_CORRECTION = 2000;

/**
 * One proposal: what the coach identified, why, and the user's three choices.
 *
 * It is a clay card (`shadow-clay`) floating inside the tray, so each proposal
 * reads as a card the coach slid across the desk: one block, one decision.
 *
 * - "Sí, añadir al plan" → `accept`  → the node becomes `confirmed`.
 * - "Corregir"           → `correct` → the user's text, node becomes `edited`.
 * - "Descartar"          → `discard` → the proposal is removed.
 *
 * The card never changes the plan by itself: it calls `onDecide`, which waits
 * for the API and applies the node the server returned.
 */
export function ProposalCard({
  node,
  request,
  fresh,
  index,
  onDecide,
  onTrace,
  discardingUntil,
  onDiscard,
  onUndoDiscard,
}: {
  node: IdeaNode;
  request: ProposalRequest | undefined;
  /** Arrived in this session: enters with a gentle rise. */
  fresh: boolean;
  index: number;
  onDecide: (node: IdeaNode, decision: ProposalDecision, content?: string) => Promise<void>;
  /** Jumps to the message the proposal came from, when it is loaded. */
  onTrace?: () => void;
  /** Set while a discard can still be undone: when the request will be sent. */
  discardingUntil?: number;
  /** Starts the undo window (the API is called when it ends). */
  onDiscard: (node: IdeaNode) => void;
  onUndoDiscard: (nodeId: string) => void;
}) {
  const root = useRef<HTMLLIElement>(null);
  const [correcting, setCorrecting] = useState(false);
  const [draft, setDraft] = useState(node.content);
  const draftId = useId();

  const copy = DIMENSIONS[node.type];
  const busy = Boolean(request && !request.error);
  const trimmed = draft.trim();

  useAnimeScope(root, () => {
    if (!fresh || !root.current) return;
    animate(root.current, {
      opacity: [0, 1],
      y: [18, 0],
      duration: 900,
      delay: 120 + index * 110,
      ease: EASE.enter,
    });
  });

  function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed || trimmed.length > MAX_CORRECTION) return;
    void onDecide(node, "correct", trimmed);
  }

  const confidence =
    node.confidence !== null ? Math.round(Math.min(1, Math.max(0, node.confidence)) * 100) : null;

  return (
    <li
      ref={root}
      // A fresh card starts pre-hidden by CSS (only when motion is on) so its
      // entrance never flashes; the failsafe in globals.css guarantees it shows.
      data-enter={fresh ? "proposal" : undefined}
      aria-busy={busy || undefined}
      className="flex flex-col gap-4 rounded-clay-lg border border-paper/[0.07] bg-ink-850 p-4 shadow-clay sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-baseline gap-3">
          <span className="eyebrow text-stone">{dimensionIndex(node.type)}</span>
          <span className="eyebrow text-paper">{copy.title}</span>
        </p>
        <SourceTag source={node.source} />
      </header>

      {discardingUntil ? (
        <DiscardCountdown
          until={discardingUntil}
          content={node.content}
          onUndo={() => onUndoDiscard(node.id)}
        />
      ) : correcting ? (
        <form onSubmit={submitCorrection} className="flex flex-col gap-3">
          <label htmlFor={draftId} className="sr-only">
            Tu versión de {copy.title}
          </label>
          <textarea
            id={draftId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            maxLength={MAX_CORRECTION}
            autoFocus
            className="w-full resize-y rounded-clay-sm border border-black/40 bg-ink-800 p-3 text-[0.9375rem] leading-relaxed text-paper shadow-clay-inset transition-colors duration-300 focus:border-amber/70 focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[0.6875rem] text-stone tabular-nums">
              {trimmed.length}/{MAX_CORRECTION}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCorrecting(false);
                  setDraft(node.content);
                }}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!trimmed}
                loading={busy && request?.decision === "correct"}
                loadingLabel="Guardando…"
              >
                Guardar mi versión
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <>
          <blockquote className="border-l border-bronze/60 pl-4 font-serif text-xl leading-snug text-paper">
            {node.content}
          </blockquote>
          <p className="text-[0.8125rem] leading-relaxed text-stone">
            Viendo lo que me contaste: {copy.reason.charAt(0).toLowerCase() + copy.reason.slice(1)}
            {confidence !== null ? ` Confianza del coach: ${confidence}%.` : ""}{" "}
            <TraceButton onClick={onTrace} />
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => void onDecide(node, "accept")}
              disabled={busy}
              loading={busy && request?.decision === "accept"}
              loadingLabel="Añadiendo…"
            >
              Sí, añadir al plan
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCorrecting(true)} disabled={busy}>
              Corregir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDiscard(node)}
              disabled={busy}
              loading={busy && request?.decision === "discard"}
              loadingLabel="Descartando…"
            >
              Descartar
            </Button>
          </div>
        </>
      )}

      {request?.error ? <Alert tone="error">{request.error}</Alert> : null}
    </li>
  );
}

/**
 * The undo window of a discard: a line that empties over the remaining time
 * (a CSS transition, so it also works with reduced motion as a static bar)
 * and "Deshacer". Nothing has been sent to the API yet.
 */
function DiscardCountdown({
  until,
  content,
  onUndo,
}: {
  until: number;
  content: string;
  onUndo: () => void;
}) {
  const [remaining] = useState(() => Math.max(0, until - Date.now()));
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // Next frame: let the bar paint full, then let it transition to empty.
    const frame = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div role="status" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-sm text-stone line-through decoration-stone/60">
          {content}
        </p>
        <Button variant="secondary" size="sm" onClick={onUndo}>
          Deshacer
        </Button>
      </div>
      <p className="text-[0.75rem] text-stone">
        Se descartará en unos segundos. Hasta entonces no se ha guardado nada.
      </p>
      <div className="h-px w-full bg-line">
        <div
          className="h-px origin-left bg-amber/70 ease-linear motion-reduce:transition-none"
          style={{
            transform: `scaleX(${started ? 0 : remaining / DISCARD_DELAY_MS})`,
            transitionProperty: "transform",
            transitionDuration: `${started ? remaining : 0}ms`,
          }}
        />
      </div>
    </div>
  );
}
