/**
 * Canonical model of a business idea.
 *
 * This module is the core of the application and is intentionally pure: it must
 * not import from `next`, `react`, a database driver, or an AI provider. Every
 * methodology (tree, card, canvas) is derived from these types by a pure
 * projection, so the same data can be rendered through many lenses without
 * duplication.
 *
 * @see docs/arquitectura.md
 */

/**
 * The ten dimensions every business idea is described by. This list is the
 * single source of truth for gap detection and for every projection.
 */
export const NODE_TYPES = [
  "problem",
  "segment",
  "value_proposition",
  "solution",
  "channels",
  "revenue",
  "costs",
  "competition",
  "metrics",
  "risks",
] as const;

export type NodeType = (typeof NODE_TYPES)[number];

/**
 * Where a node came from. This single field enables provenance, trust and
 * conflict resolution:
 *
 * - `inferred`  the AI proposed it and the user has not validated it yet
 * - `confirmed` the user validated an AI proposal
 * - `edited`    the user wrote or rewrote it by hand
 *
 * Merge precedence is `edited` > `confirmed` > `inferred`. An `edited` node is
 * never overwritten by automatic extraction.
 */
export type NodeSource = "inferred" | "confirmed" | "edited";

/** A single piece of structured knowledge about an idea. */
export interface IdeaNode {
  readonly id: string;
  readonly ideaId: string;
  readonly type: NodeType;
  readonly content: string;
  readonly source: NodeSource;
  /** Message that originated the node. Null for nodes created manually. */
  readonly messageId: string | null;
  /** Model confidence for `inferred` nodes. Null otherwise. */
  readonly confidence: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * The full structured knowledge of one idea. This is the value every
 * projection receives.
 */
export interface IdeaGraph {
  readonly ideaId: string;
  readonly nodes: readonly IdeaNode[];
}

/**
 * Parent of each dimension in the default hierarchy.
 *
 * The tree view is not authored by hand: it is a projection of this map over
 * the graph. Changing the hierarchy changes the tree for every user without
 * touching stored data.
 */
export const NODE_PARENT: Readonly<Record<NodeType, NodeType | null>> = {
  problem: null,
  segment: "problem",
  competition: "problem",
  value_proposition: "problem",
  solution: "value_proposition",
  channels: "solution",
  revenue: "solution",
  costs: "solution",
  metrics: "solution",
  risks: null,
};

/**
 * A node counts as real knowledge only once a human has validated it.
 * AI proposals alone do not close a gap: they are questions, not answers.
 */
export function isFilled(node: IdeaNode): boolean {
  return node.source === "confirmed" || node.source === "edited";
}
