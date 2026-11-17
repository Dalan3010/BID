"use client";

import { animate } from "animejs";
import { useRef } from "react";

import { useAnimeScope } from "@/components/motion/use-anime-scope";
import { SourceTag, StatusTag } from "@/components/ui/status-tag";
import { cn } from "@/lib/cn";
import { dimensionIndex, type DimensionStatus, type DimensionView } from "@/lib/dimensions";
import { formatRelative } from "@/lib/format";

/**
 * The relief of each milestone card, by state.
 *
 * A validated dimension is a solid block of progress the person built: raised,
 * clay top face and a sage edge, the colour the plan already uses for
 * "validated". A pending one is raised too but edged in amber, and dotted
 * because it still waits for a decision. An open one is a pit: sunken and
 * dotted, because nothing has been placed in it yet — the same solid/dotted
 * language the tree uses.
 */
const CARD: Record<DimensionStatus, string> = {
  validated:
    "border-sage/25 bg-[linear-gradient(180deg,var(--color-ink-850)_0%,var(--color-ink-900)_62%)] shadow-clay print:bg-none",
  pending: "border-dotted border-amber/35 bg-ink-900 shadow-clay",
  open: "border-dotted border-line-strong bg-ink-900 shadow-clay-inset",
};

/**
 * One of the ten dimensions in the plan.
 *
 * - validated → the user's real content, with its provenance (confirmed /
 *   written by the user).
 * - pending   → no content is shown as if it were the plan: only a pointer to
 *   the proposal waiting in "Lo que hemos identificado".
 * - open      → the question the dimension answers, in a muted voice.
 *
 * When the dimension has just been validated (`highlightAt` changes), a bronze
 * wash fades over the card (an overlay, so the card's own fill survives).
 */
export function DimensionEntry({
  view,
  highlightAt,
  onReview,
  onTrace,
}: {
  view: DimensionView;
  /** Timestamp of the last change to light up; `undefined` for none. */
  highlightAt: number | undefined;
  onReview: () => void;
  /**
   * Builds the action that jumps to the message a node came from (RF-52).
   * Returns `undefined` when that message is not in the loaded conversation.
   */
  onTrace: (messageId: string | null) => (() => void) | undefined;
}) {
  const root = useRef<HTMLLIElement>(null);

  useAnimeScope(
    root,
    () => {
      if (!highlightAt || !root.current) return;
      root.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
      const wash = root.current.querySelector<HTMLElement>("[data-highlight]");
      if (!wash) return;
      animate(wash, { opacity: [1, 0], duration: 2400, ease: "outQuad" });
    },
    [highlightAt],
  );

  const { copy, status, validated, proposals } = view;

  return (
    <li
      ref={root}
      className={cn(
        "relative isolate grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 overflow-hidden rounded-clay-lg border p-4 break-inside-avoid",
        CARD[status],
      )}
    >
      {/* The "just updated" wash. Decorative only; the card fill stays intact. */}
      <span
        aria-hidden="true"
        data-highlight
        className="pointer-events-none absolute inset-0 -z-10 rounded-clay-lg bg-bronze/20 opacity-0"
      />

      <span className="eyebrow pt-1.5 text-stone">{dimensionIndex(view.type)}</span>

      <div className="flex min-w-0 flex-col gap-3">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-serif text-xl leading-tight text-paper">{copy.title}</h3>
          <StatusTag status={status} />
        </header>

        {status === "validated" ? (
          <ul className="flex flex-col gap-4">
            {validated.map((node) => (
              <li key={node.id} className="flex flex-col gap-2">
                <p className="text-[0.9375rem] leading-relaxed whitespace-pre-line text-mist">
                  {node.content}
                </p>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <SourceTag source={node.source} />
                  <time dateTime={node.updatedAt} className="text-[0.6875rem] text-stone">
                    {formatRelative(node.updatedAt)}
                  </time>
                  <TraceButton onClick={onTrace(node.messageId)} />
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        {status === "pending" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.8125rem] leading-relaxed text-stone">
              {proposals.length === 1
                ? "Hay una propuesta esperando tu decisión."
                : `Hay ${proposals.length} propuestas esperando tu decisión.`}
            </p>
            <button
              type="button"
              onClick={onReview}
              className="eyebrow inline-flex min-h-9 items-center gap-2 text-amber transition-colors hover:text-paper print:hidden"
            >
              Revisar <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}

        {status === "open" ? (
          <p className="text-[0.8125rem] leading-relaxed text-stone italic">{copy.question}</p>
        ) : null}
      </div>
    </li>
  );
}

/** "Ver en la conversación" — rendered only when the origin can be shown. */
export function TraceButton({ onClick }: { onClick: (() => void) | undefined }) {
  if (!onClick) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[0.6875rem] text-stone underline decoration-line-strong underline-offset-4 transition-colors hover:text-paper hover:decoration-bronze print:hidden"
    >
      Ver en la conversación
    </button>
  );
}
