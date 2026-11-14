"use client";

import {
  completionRatio,
  type ChatMessage,
  type Idea,
  type IdeaNode,
  type NodeType,
} from "@bid/core";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { buildDimensionViews } from "@/lib/dimensions";
import { toPercent } from "@/lib/format";

import { CanvasDialog } from "./canvas-dialog";
import { DimensionEntry } from "./dimension-entry";
import { IdeaTimeline } from "./idea-timeline";

/** React Flow is heavy and secondary: it loads only when the tree is opened. */
const StructureTree = dynamic(() => import("./structure-tree"), {
  ssr: false,
  loading: () => <Skeleton className="h-[26rem] w-full" />,
});

/**
 * "Así va quedando tu plan" — how the idea is being built.
 *
 * The completion figure comes from `completionRatio` in `@bid/core`, the same
 * projection the API uses for the dashboard, so the two can never disagree.
 * Only `confirmed` and `edited` nodes count; proposals are shown as pending.
 */
export function PlanPanel({
  idea,
  nodes,
  highlight,
  onReview,
  onTrace,
  messages,
}: {
  /** The conversation, for the timeline. */
  messages: readonly Pick<ChatMessage, "id" | "role" | "content" | "createdAt">[];
  idea: Idea;
  nodes: readonly IdeaNode[];
  highlight: { type: NodeType; at: number } | null;
  /** Brings the proposals tray into view. */
  onReview: () => void;
  /** Builds the "Ver en la conversación" action for a message, if loaded. */
  onTrace: (messageId: string | null) => (() => void) | undefined;
}) {
  const [treeOpen, setTreeOpen] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const graph = useMemo(() => ({ ideaId: idea.id, nodes }), [idea.id, nodes]);
  const views = useMemo(() => buildDimensionViews(nodes), [nodes]);
  const percent = toPercent(completionRatio(graph));
  const validatedCount = views.filter((view) => view.status === "validated").length;
  const pendingCount = views.filter((view) => view.status === "pending").length;

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-ink-950/95 px-gutter py-6 backdrop-blur-sm lg:px-8 print:static print:px-0">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="eyebrow mb-3 text-bronze">El plan</p>
            <h2 className="font-serif text-title text-paper">Así va quedando</h2>
            <p className="mt-2 text-[0.8125rem] text-stone" aria-live="polite">
              {validatedCount} de 10 validadas
              {pendingCount > 0 ? ` · ${pendingCount} por revisar` : ""}
            </p>
          </div>
          <ProgressRing value={percent} label="Plan validado" size={72} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2 print:hidden">
          <Button variant="secondary" size="sm" onClick={() => setCanvasOpen(true)}>
            Ver como lienzo
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            Imprimir / PDF
          </Button>
        </div>
        <p className="mt-4 hidden text-[0.75rem] text-stone print:block">
          {idea.title} · Plan de negocio · {new Date().toLocaleDateString("es")}
        </p>
        {idea.summary ? (
          <p className="mt-5 border-t border-line pt-4 text-sm leading-relaxed text-mist">
            {idea.summary}
          </p>
        ) : null}
      </header>

      <ol aria-label="Las diez dimensiones" className="px-gutter lg:px-8 print:px-0">
        {views.map((view) => (
          <DimensionEntry
            key={view.type}
            view={view}
            highlightAt={highlight?.type === view.type ? highlight.at : undefined}
            onReview={onReview}
            onTrace={onTrace}
          />
        ))}
      </ol>

      <section className="px-gutter pt-8 lg:px-8 print:hidden">
        <h3>
          <button
            type="button"
            aria-expanded={timelineOpen}
            aria-controls="idea-timeline"
            onClick={() => setTimelineOpen((open) => !open)}
            className="flex min-h-11 w-full items-center justify-between border-t border-line py-3 text-left"
          >
            <span className="eyebrow text-mist">Ver línea de tiempo</span>
            <span aria-hidden="true" className={`text-stone transition-transform duration-300 ${timelineOpen ? "rotate-180" : ""}`}>
              ▾
            </span>
          </button>
        </h3>
        <div id="idea-timeline" hidden={!timelineOpen} className="pt-2 pb-4">
          {timelineOpen ? <IdeaTimeline messages={messages} nodes={nodes} onTrace={onTrace} /> : null}
        </div>
      </section>

      <section className="px-gutter pb-8 lg:px-8 print:hidden">
        <h3>
          <button
            type="button"
            aria-expanded={treeOpen}
            aria-controls="structure-tree"
            onClick={() => setTreeOpen((open) => !open)}
            className="flex min-h-11 w-full items-center justify-between border-y border-line py-3 text-left"
          >
            <span className="eyebrow text-mist">Ver estructura técnica</span>
            <span aria-hidden="true" className={`text-stone transition-transform duration-300 ${treeOpen ? "rotate-180" : ""}`}>
              ▾
            </span>
          </button>
        </h3>
        <div id="structure-tree" hidden={!treeOpen} className="pt-4">
          {treeOpen ? (
            <>
              <p className="mb-4 text-[0.8125rem] leading-relaxed text-stone">
                La misma idea vista como jerarquía: de qué depende cada decisión. Borde sólido:
                validada. Punteado: abierta o por revisar.
              </p>
              <StructureTree graph={graph} />
            </>
          ) : null}
        </div>
      </section>
      <CanvasDialog
        open={canvasOpen}
        onClose={() => setCanvasOpen(false)}
        title={idea.title}
        views={views}
        percent={percent}
      />
    </div>
  );
}
