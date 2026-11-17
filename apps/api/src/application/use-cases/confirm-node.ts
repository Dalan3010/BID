import { canTransition, type IdeaNode } from "@bid/core";
import { NodeNotFoundError, SourceTransitionError } from "../errors";
import type { IdeaRepository } from "../ports/idea-repository";

export interface ConfirmNodeInput {
  readonly ideaId: string;
  readonly nodeId: string;
}

/**
 * Marks an AI proposal as validated by the user.
 *
 * This is the moment a guess becomes knowledge: `findGaps` stops reporting the
 * dimension, and the tree view shows it as answered. Confirming is one-way —
 * `edited` and `confirmed` can never fall back to `inferred`.
 */
export async function confirmNode(
  repository: IdeaRepository,
  input: ConfirmNodeInput,
): Promise<IdeaNode> {
  const node = await repository.findNode(input.ideaId, input.nodeId);
  if (!node) {
    throw new NodeNotFoundError(input.nodeId);
  }

  if (!canTransition(node.source, "confirmed")) {
    throw new SourceTransitionError(node.source, "confirmed");
  }

  const updated = await repository.updateNode(input.ideaId, input.nodeId, {
    source: "confirmed",
    // Confidence describes the model's guess, not the user's certainty.
    confidence: null,
  });

  if (!updated) {
    throw new NodeNotFoundError(input.nodeId);
  }

  return updated;
}
