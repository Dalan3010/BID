import { isFilled, type IdeaNode, type NodeType } from "@bid/core";
import { InvalidNodeError } from "../errors";
import type { IdeaRepository } from "../ports/idea-repository";
import { loadIdeaGraph } from "./load-idea-graph";

export interface ProposeNodeInput {
  readonly ideaId: string;
  readonly type: NodeType;
  readonly content: string;
  readonly messageId?: string | null;
  readonly confidence?: number | null;
}

export interface ProposeNodeResult {
  /** The created node, or `null` when the dimension was already answered. */
  readonly node: IdeaNode | null;
  readonly skippedReason: "already_answered" | null;
}

/**
 * Records an AI proposal.
 *
 * A proposal always enters as `inferred` — the source is not a parameter, so no
 * caller can smuggle in a `confirmed` node and skip the human in the loop (D2).
 *
 * When the dimension already has validated knowledge there is nothing to ask,
 * so the proposal is discarded instead of piling noise onto a settled answer.
 */
export async function proposeNode(
  repository: IdeaRepository,
  input: ProposeNodeInput,
): Promise<ProposeNodeResult> {
  const content = input.content.trim();
  if (content.length === 0) {
    throw new InvalidNodeError("A proposal needs non-empty content.");
  }

  const graph = await loadIdeaGraph(repository, input.ideaId);

  const alreadyAnswered = graph.nodes.some(
    (node) => node.type === input.type && isFilled(node),
  );

  if (alreadyAnswered) {
    return { node: null, skippedReason: "already_answered" };
  }

  const node = await repository.addNode({
    ideaId: input.ideaId,
    type: input.type,
    content,
    source: "inferred",
    messageId: input.messageId ?? null,
    confidence: input.confidence ?? null,
  });

  return { node, skippedReason: null };
}
