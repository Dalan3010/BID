"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SourceTag, StatusTag } from "@/components/ui/status-tag";
import { CANVAS_TEMPLATE, buildCanvas } from "@/lib/canvas";
import type { DimensionView } from "@/lib/dimensions";

/**
 * "Ver como lienzo" — the whole idea on one page (RF-42).
 *
 * Another lens over the same graph: it receives the very `DimensionView`s the
 * plan renders, laid out by the pure projection `buildCanvas`
 * (`src/lib/canvas.ts`). Like the plan, it shows only validated content;
 * a dimension with proposals reads "Por revisar", and an open one shows its
 * question.
 *
 * Large screens: a 10-column grid (`CANVAS_TEMPLATE`). Small screens: the
 * blocks stack in reading order.
 */
export function CanvasDialog({
  open,
  onClose,
  title,
  views,
  percent,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  views: readonly DimensionView[];
  percent: number;
}) {
  const blocks = buildCanvas(views);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      title={<>Lienzo · <span className="italic">{title}</span></>}
      description={`La misma idea en una sola página. Plan validado: ${percent}%. Solo se muestra lo que has confirmado o escrito.`}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div
          className="grid min-h-0 flex-1 auto-rows-min gap-px overflow-y-auto border border-line bg-line lg:auto-rows-fr lg:[grid-template-areas:var(--canvas-areas)] lg:grid-cols-10"
          style={{ ["--canvas-areas" as string]: CANVAS_TEMPLATE }}
        >
          {blocks.map(({ type, area, view }) => (
            <section
              key={type}
              aria-labelledby={`lienzo-${type}`}
              className="flex min-h-36 flex-col gap-3 bg-ink-950 p-4 lg:min-h-0 lg:overflow-y-auto"
              style={{ gridArea: area }}
            >
              <header className="flex items-start justify-between gap-3">
                <h3 id={`lienzo-${type}`} className="font-serif text-lg leading-tight text-paper">
                  {view.copy.label}
                </h3>
                <StatusTag status={view.status} />
              </header>

              {view.status === "validated" ? (
                <ul className="flex flex-col gap-3">
                  {view.validated.map((node) => (
                    <li key={node.id} className="flex flex-col gap-1.5">
                      <p className="text-[0.8125rem] leading-relaxed whitespace-pre-line text-mist">
                        {node.content}
                      </p>
                      <SourceTag source={node.source} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[0.8125rem] leading-relaxed text-stone italic">
                  {view.status === "pending" ? "Hay propuestas esperando tu decisión." : view.copy.question}
                </p>
              )}
            </section>
          ))}
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
