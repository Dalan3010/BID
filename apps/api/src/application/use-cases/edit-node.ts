import { isEditable, type IdeaNode } from "@bid/core";
import { InvalidNodeError, NodeNotEditableError, NodeNotFoundError } from "../errors";
import type { IdeaRepository } from "../ports/idea-repository";

export interface EditNodeInput {
  readonly ideaId: string;
  readonly nodeId: string;
  readonly content: string;
}

/**
 * Rewrites the content of a node by hand.
 *
 * Direct editing is restricted to validated knowledge (D3). An `inferred` node
 * must be confirmed first, so the user's words are never mixed with the model's
 * guess under the same provenance value.
 */
export async function editNode(
  repository: IdeaRepository,
  input: EditNodeInput,
): Promise<IdeaNode> {
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

  const updated = await repository.updateNode(input.ideaId, input.nodeId, {
    content,
    source: "edited",
    confidence: null,
  });

  if (!updated) {
    throw new NodeNotFoundError(input.nodeId);
  }

  return updated;
}
