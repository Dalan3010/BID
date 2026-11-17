import { isEditable, type IdeaNode } from "@bid/core";
import {
  IdeaNotFoundError,
  InvalidNodeError,
  NodeNotEditableError,
  NodeNotFoundError,
} from "../errors";
import type { IdeaRepository } from "../ports/idea-repository";

export interface EditNodeInput {
  readonly ideaId: string;
  readonly nodeId: string;
  readonly ownerId: string;
  readonly content: string;
}

/**
 * Rewrites the content of a node by hand.
 *
 * Direct editing is restricted to validated knowledge (D3). An `inferred` node
 * must be confirmed first, so the user's words are never mixed with the model's
 * guess under the same provenance value.
 *
 * Saving the same text over an already edited node is a no-op: it would add a
 * version that carries no change.
 */
export async function editNode(
  repository: IdeaRepository,
  input: EditNodeInput,
): Promise<IdeaNode> {
  const idea = await repository.findById(input.ideaId);

  if (!idea || idea.ownerId !== input.ownerId) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  const content = input.content.trim();
  if (content.length === 0) {
    throw new InvalidNodeError("A node cannot be emptied by editing.");
  }

  const node = await repository.findNode(input.ideaId, input.nodeId);
  if (!node) {
    throw new NodeNotFoundError(input.nodeId);
  }

  if (!isEditable(node.source)) {
    throw new NodeNotEditableError(node.source);
  }

  if (node.source === "edited" && node.content === content) {
    return node;
  }

  const updated = await repository.updateNode(input.ideaId, input.nodeId, {
    content,
    source: "edited",
    confidence: null,
  });

  if (!updated) {
    throw new NodeNotFoundError(input.nodeId);
  }

  await repository.saveVersion(input.ideaId);

  return updated;
}
