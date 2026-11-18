import type { IdeaGraph, IdeaNode } from "../types";

/** A node that exists in both graphs but changed its meaning. */
export interface ModifiedNode {
  readonly before: IdeaNode;
  readonly after: IdeaNode;
}

/** What changed between two versions of the same idea. */
export interface GraphDiff {
  readonly added: readonly IdeaNode[];
  readonly modified: readonly ModifiedNode[];
  readonly removed: readonly IdeaNode[];
}

/**
 * Projection: two graphs -> the difference between them.
 *
 * Nodes are matched by `id`, not by position: an edited node keeps its id, so a
 * content change is reported as `modified` instead of as a removal plus an
 * addition. Only fields that carry meaning are compared. Timestamps, the
 * originating message and the model confidence are bookkeeping: they change
 * without the knowledge changing, so they never mark a node as modified.
 *
 * `previous === null` means "no history yet": every node of `next` is added.
 * The result follows the source order of each graph, which keeps the diff
 * deterministic and testable. The inputs are never mutated.
 */
export function diffGraphs(
  previous: IdeaGraph | null,
  next: IdeaGraph,
): GraphDiff {
  const previousById = new Map<string, IdeaNode>();
  for (const node of previous?.nodes ?? []) {
    previousById.set(node.id, node);
  }

  const nextIds = new Set<string>(next.nodes.map((node) => node.id));

  const added: IdeaNode[] = [];
  const modified: ModifiedNode[] = [];

  for (const node of next.nodes) {
    const before = previousById.get(node.id);

    if (!before) {
      added.push(node);
      continue;
    }

    if (hasMeaningChanged(before, node)) {
      modified.push({ before, after: node });
    }
  }

  const removed: IdeaNode[] = [];
  for (const node of previous?.nodes ?? []) {
    if (!nextIds.has(node.id)) {
      removed.push(node);
    }
  }

  return { added, modified, removed };
}

/** Fields that define a node's knowledge; everything else is metadata. */
function hasMeaningChanged(before: IdeaNode, after: IdeaNode): boolean {
  return (
    before.type !== after.type ||
    before.content !== after.content ||
    before.source !== after.source
  );
}
