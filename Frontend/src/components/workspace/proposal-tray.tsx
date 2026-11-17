"use client";

import type { IdeaNode } from "@bid/core";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ProposalDecision } from "@/lib/api";

import { ProposalCard } from "./proposal-card";
import type { ProposalRequest } from "./use-workspace";

/**
 * "Lo que hemos identificado" — the space where AI proposals wait.
 *
 * It is docked above the composer, where the eye already is after the coach
 * answers, and it is visually distinct from the conversation: a floating clay
 * panel (`shadow-clay-panel`) with an amber hairline and its own heading. It
 * collapses to a single line so it never crowds the transcript:
 *
 * - Desktop (≥ 1024 px): starts open and opens itself when new proposals
 *   arrive.
 * - Mobile and tablet: starts folded, showing only "N por revisar", because
 *   open it would cover most of the conversation. New proposals do not unfold
 *   it; the count and the tab badge announce them.
 * - "Revisar" in the plan (`openRequest`) unfolds it on any screen.
 */
export function ProposalTray({
  proposals,
  requests,
  freshIds,
  onDecide,
  id,
  openRequest,
  onTrace,
  pendingDiscards,
  onDiscard,
  onUndoDiscard,
  bulk,
  onAcceptAll,
}: {
  proposals: readonly IdeaNode[];
  requests: Readonly<Record<string, ProposalRequest>>;
  freshIds: ReadonlySet<string>;
  onDecide: (node: IdeaNode, decision: ProposalDecision, content?: string) => Promise<void>;
  /** DOM id, so other controls (the plan) can bring the tray into view. */
  id: string;
  /** Changes (a timestamp) when someone asks to see the proposals. */
  openRequest?: number;
  /** Builds the "Ver en la conversación" action for a message, if loaded. */
  onTrace: (messageId: string | null) => (() => void) | undefined;
  /** Discards inside their undo window: id → moment the request is sent. */
  pendingDiscards: Readonly<Record<string, number>>;
  onDiscard: (node: IdeaNode) => void;
  onUndoDiscard: (nodeId: string) => void;
  /** Progress of "Añadir todas", or `null`. */
  bulk: { done: number; total: number } | null;
  onAcceptAll: () => void;
}) {
  // The workspace renders only in the browser (its data is loaded client-side),
  // so reading the viewport in the initializer is safe.
  const [open, setOpen] = useState(isWideScreen);

  // React to new batches and open requests while rendering (React's pattern
  // for adjusting state to a prop change), not in an effect.
  const [seenFresh, setSeenFresh] = useState(freshIds);
  if (seenFresh !== freshIds) {
    setSeenFresh(freshIds);
    if (freshIds.size > 0 && isWideScreen()) setOpen(true);
  }
  const [seenRequest, setSeenRequest] = useState(openRequest);
  if (seenRequest !== openRequest) {
    setSeenRequest(openRequest);
    setOpen(true);
  }

  if (proposals.length === 0) return null;

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      onKeyDown={(event) => {
        // Esc folds the tray and returns focus to its header (shortcut list:
        // `lib/shortcuts.ts`). Inside the correction textarea it does the same.
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          event.currentTarget.querySelector<HTMLButtonElement>("button[aria-expanded]")?.focus();
        }
      }}
      className="mx-gutter mb-3 overflow-hidden rounded-clay-lg border border-amber/25 bg-ink-900 shadow-clay-panel focus:outline-none lg:mx-10"
    >
      <h2 id={`${id}-title`}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left sm:px-5"
        >
          <span className="flex items-center gap-3">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-amber" />
            <span className="font-serif text-base text-paper sm:text-lg">Lo que hemos identificado</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="eyebrow whitespace-nowrap text-amber">
              {proposals.length} por revisar
            </span>
            <span
              aria-hidden="true"
              className={cn("text-stone transition-transform duration-300", open ? "rotate-180" : "")}
            >
              ▾
            </span>
          </span>
        </button>
      </h2>

      <div id={`${id}-list`} hidden={!open} className="border-t border-line">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
          <p className="text-[0.8125rem] leading-relaxed text-mist">
            Son propuestas, no respuestas: no cuentan en tu plan hasta que decidas.
          </p>
          {proposals.length > 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAcceptAll}
              disabled={bulk !== null}
              loading={bulk !== null}
              loadingLabel={bulk ? `Añadiendo ${Math.min(bulk.done + 1, bulk.total)} de ${bulk.total}…` : undefined}
            >
              Añadir todas al plan
            </Button>
          ) : null}
        </div>
        <ul className="flex max-h-[min(22rem,40dvh)] flex-col gap-3 overflow-y-auto overscroll-contain px-4 pt-4 pb-4 sm:px-5">
          {proposals.map((node, index) => (
            <ProposalCard
              key={node.id}
              node={node}
              index={index}
              fresh={freshIds.has(node.id)}
              request={requests[node.id]}
              onDecide={onDecide}
              onTrace={onTrace(node.messageId)}
              discardingUntil={pendingDiscards[node.id]}
              onDiscard={onDiscard}
              onUndoDiscard={onUndoDiscard}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

/** True on desktop widths, where the tray has room to stay open. */
function isWideScreen(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}
