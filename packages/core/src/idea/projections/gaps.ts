import { NODE_TYPES, isFilled, type IdeaGraph, type NodeType } from "../types";

/** A dimension of the idea that still needs work. */
export interface Gap {
  readonly type: NodeType;
  /**
   * True when the dimension has AI proposals that the user has not validated
   * yet. Those are open questions, not answers.
   */
  readonly hasProposals: boolean;
}

/**
 * Projection: graph -> missing dimensions.
 *
 * This is the coach's agenda. It is deliberately deterministic: no model call
 * is involved, so it costs nothing and never fails. The AI is only used later
 * to phrase the question, never to decide what is missing.
 */
export function findGaps(graph: IdeaGraph): Gap[] {
  return NODE_TYPES.flatMap((type) => {
    const nodes = graph.nodes.filter((node) => node.type === type);
    if (nodes.some(isFilled)) {
      return [];
    }
    return [{ type, hasProposals: nodes.length > 0 }];
  });
}

/** Projection: graph -> share of dimensions with at least one validated node. */
export function completionRatio(graph: IdeaGraph): number {
  const filled = NODE_TYPES.filter((type) =>
    graph.nodes.some((node) => node.type === type && isFilled(node)),
  ).length;

  return filled / NODE_TYPES.length;
}
