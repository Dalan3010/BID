/**
 * Projection: the ten dimensions → a one-page canvas (RF-42).
 *
 * A methodology is a function of the graph, not a new data model
 * (`docs/arquitectura.md`, §5). This lays the same `DimensionView`s the plan
 * uses on a grid inspired by the Lean Canvas, whose blocks match BID's
 * dimensions almost one to one:
 *
 * ```
 * ┌──────────┬──────────┬──────────┬──────────┬──────────┐
 * │ Problema │ Solución │          │ Riesgos  │          │
 * │          ├──────────┤ Propuesta├──────────┤ Segmento │
 * │Competen- │ Métricas │ de valor │ Canales  │          │
 * │   cia    │          │          │          │          │
 * ├──────────┴──────────┴────┬─────┴──────────┴──────────┤
 * │ Costos                   │ Ingresos                  │
 * └──────────────────────────┴───────────────────────────┘
 * ```
 *
 * The Lean Canvas has an "unfair advantage" block; BID has no such dimension,
 * so that slot holds *Riesgos*. Nothing is invented to fill it.
 */
import type { NodeType } from "@bid/core";

import type { DimensionView } from "./dimensions";

/** One block of the canvas: a dimension and its grid area. */
export interface CanvasBlock {
  readonly type: NodeType;
  /** CSS grid-area name. */
  readonly area: string;
}

/** Reading order on small screens, and grid placement on large ones. */
export const CANVAS_BLOCKS: readonly CanvasBlock[] = [
  { type: "problem", area: "problem" },
  { type: "competition", area: "competition" },
  { type: "segment", area: "segment" },
  { type: "value_proposition", area: "value" },
  { type: "solution", area: "solution" },
  { type: "metrics", area: "metrics" },
  { type: "channels", area: "channels" },
  { type: "risks", area: "risks" },
  { type: "costs", area: "costs" },
  { type: "revenue", area: "revenue" },
];

/** `grid-template-areas` for the large layout (10 columns, 3 rows). */
export const CANVAS_TEMPLATE = [
  '"problem problem solution solution value value risks risks segment segment"',
  '"competition competition metrics metrics value value channels channels segment segment"',
  '"costs costs costs costs costs revenue revenue revenue revenue revenue"',
].join(" ");

/** The views placed on the canvas, in `CANVAS_BLOCKS` order. */
export function buildCanvas(
  views: readonly DimensionView[],
): Array<CanvasBlock & { readonly view: DimensionView }> {
  const byType = new Map(views.map((view) => [view.type, view]));

  return CANVAS_BLOCKS.flatMap((block) => {
    const view = byType.get(block.type);
    return view ? [{ ...block, view }] : [];
  });
}
