/**
 * The ten dimensions as the user reads them.
 *
 * The domain (`@bid/core`) owns the list, its order and the rule of what counts
 * as knowledge (`isFilled`). This module only adds copy and groups nodes for
 * display: it never decides that a dimension is complete on its own.
 */
import {
  NODE_TYPES,
  isFilled,
  type IdeaNode,
  type NodeSource,
  type NodeType,
} from "@bid/core";

/** Copy of a dimension, in product voice. */
export interface DimensionCopy {
  /** Short name, used in lists and tags. */
  readonly label: string;
  /** Human phrasing, used in the plan and in proposals. */
  readonly title: string;
  /** What the dimension answers. */
  readonly question: string;
  /** Why the coach thinks a proposal belongs here. */
  readonly reason: string;
  /**
   * How the user's answer could begin. Used by the coach's welcome to prefill
   * the composer; the user completes it with their own words.
   *
   * Each one is phrased so the extractor recognizes the dimension: the
   * scripted extractor (`apps/api/.../rehearsal-extractor.ts`) matches
   * patterns such as "el problema es", "mis clientes son" or "vendo por", and
   * a live model reads them just as naturally. See `starters.test.ts`.
   */
  readonly starter: string;
}

export const DIMENSIONS: Readonly<Record<NodeType, DimensionCopy>> = {
  problem: {
    label: "Problema",
    title: "El problema",
    question: "¿Qué dolor o necesidad resuelve tu idea?",
    reason: "Parece describir el dolor que quieres resolver.",
    starter: "El problema es que ",
  },
  segment: {
    label: "Segmento",
    title: "Cliente al que va dirigido",
    question: "¿Quién tiene ese problema y pagaría por resolverlo?",
    reason: "Parece describir a quién le hablas.",
    starter: "Mis clientes son ",
  },
  value_proposition: {
    label: "Propuesta de valor",
    title: "Propuesta de valor",
    question: "¿Por qué te elegirían a ti y no a otra opción?",
    reason: "Parece explicar por qué te elegirían.",
    starter: "La ventaja es que ",
  },
  solution: {
    label: "Solución",
    title: "La solución",
    question: "¿Qué ofreces, concretamente?",
    reason: "Parece describir lo que ofreces.",
    starter: "Lo que ofrezco es ",
  },
  channels: {
    label: "Canales",
    title: "Cómo llegar",
    question: "¿Por dónde te encuentran y te compran?",
    reason: "Parece describir cómo llegas a tus clientes.",
    starter: "Vendo por ",
  },
  revenue: {
    label: "Ingresos",
    title: "Ingresos",
    question: "¿Cómo entra el dinero?",
    reason: "Parece describir cómo cobras.",
    starter: "Cobraría ",
  },
  costs: {
    label: "Costos",
    title: "Costos",
    question: "¿Qué cuesta sostener esto?",
    reason: "Parece describir lo que cuesta operar.",
    starter: "Mis principales gastos serían ",
  },
  competition: {
    label: "Competencia",
    title: "Competencia",
    question: "¿Qué usan hoy en lugar de tu idea?",
    reason: "Parece describir las alternativas que existen.",
    starter: "Mi competencia es ",
  },
  metrics: {
    label: "Métricas",
    title: "Métricas para saber si funciona",
    question: "¿Qué número te dirá que vas por buen camino?",
    reason: "Parece describir cómo medirás el avance.",
    starter: "Quiero medir ",
  },
  risks: {
    label: "Riesgos",
    title: "Riesgos a tener en cuenta",
    question: "¿Qué podría salir mal?",
    reason: "Parece describir algo que podría salir mal.",
    starter: "Lo que más me preocupa es ",
  },
};

/** Position of a dimension in the canonical order, 1-based, as "01". */
export function dimensionIndex(type: NodeType): string {
  return String(NODE_TYPES.indexOf(type) + 1).padStart(2, "0");
}

/** The state of one dimension, as the plan shows it. */
export type DimensionStatus = "validated" | "pending" | "open";

/** One dimension with its nodes split by provenance. */
export interface DimensionView {
  readonly type: NodeType;
  readonly copy: DimensionCopy;
  /** Nodes a human validated (`confirmed` or `edited`). */
  readonly validated: readonly IdeaNode[];
  /** AI proposals waiting for a decision (`inferred`). */
  readonly proposals: readonly IdeaNode[];
  readonly status: DimensionStatus;
}

/**
 * Projection: nodes → one view per dimension, in canonical order.
 *
 * A dimension is `validated` only when it has a node that `isFilled` accepts;
 * a dimension with only proposals stays `pending`, because an inferred node is
 * a question, not an answer.
 */
export function buildDimensionViews(
  nodes: readonly IdeaNode[],
): DimensionView[] {
  return NODE_TYPES.map((type) => {
    const ofType = nodes.filter((node) => node.type === type);
    const validated = ofType.filter(isFilled);
    const proposals = ofType.filter((node) => node.source === "inferred");

    const status: DimensionStatus =
      validated.length > 0 ? "validated" : proposals.length > 0 ? "pending" : "open";

    return { type, copy: DIMENSIONS[type], validated, proposals, status };
  });
}

/** How the UI names each provenance. */
export const SOURCE_LABEL: Readonly<Record<NodeSource, string>> = {
  inferred: "Pendiente",
  confirmed: "Confirmado",
  edited: "Escrito por ti",
};

/** One topic the coach offers to start with. */
export interface WelcomeTopic {
  readonly type: NodeType;
  readonly label: string;
  readonly starter: string;
}

/**
 * The first open dimensions, in the coach's canonical order.
 *
 * Feeds the coach's welcome: the topics it offers are the same dimensions the
 * agenda (`findGaps` in `@bid/core`) will ask about first, because "open"
 * here uses the same rule — a dimension without a validated node.
 */
export function welcomeTopics(nodes: readonly IdeaNode[], limit = 3): WelcomeTopic[] {
  return buildDimensionViews(nodes)
    .filter((view) => view.status !== "validated")
    .slice(0, limit)
    .map((view) => ({ type: view.type, label: view.copy.label, starter: view.copy.starter }));
}

/**
 * Status of each of the ten dimensions from a dashboard row's `agenda`.
 *
 * `GET /api/ideas` returns only the **open** dimensions (the agenda, from
 * `findGaps`). So a dimension absent from the agenda is validated; one present
 * with `hasProposals` is pending; any other is open. No content is available
 * here — only the state.
 */
export function statusesFromAgenda(
  agenda: readonly { readonly type: NodeType; readonly hasProposals: boolean }[],
): Array<{ readonly type: NodeType; readonly status: DimensionStatus }> {
  const open = new Map(agenda.map((gap) => [gap.type, gap.hasProposals]));

  return NODE_TYPES.map((type) => {
    if (!open.has(type)) return { type, status: "validated" as const };
    return { type, status: open.get(type) ? ("pending" as const) : ("open" as const) };
  });
}

/** Copy for each dimension status. */
export const STATUS_LABEL: Readonly<Record<DimensionStatus, string>> = {
  validated: "Validada",
  pending: "Por revisar",
  open: "Sin definir",
};
