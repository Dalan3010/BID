import type { IdeaNode, NodeType } from "@bid/core";
import {
  DimensionNotEmptyError,
  IdeaNotFoundError,
  InvalidNodeError,
} from "../errors";
import type { IdeaRepository } from "../ports/idea-repository";
import { loadIdeaGraph } from "./load-idea-graph";

export interface CreateManualNodeInput {
  readonly ideaId: string;
  readonly ownerId: string;
  readonly type: NodeType;
  readonly content: string;
}

/**
 * Lets the user answer an open dimension by hand, without AI.
 *
 * Manual authoring only fills empty dimensions. A dimension that already holds
 * a node — validated or still an inferred proposal — is edited or resolved
 * instead, so the same dimension never ends up with competing answers.
 */
export async function createManualNode(
  repository: IdeaRepository,
  input: CreateManualNodeInput,
): Promise<IdeaNode> {
  const idea = await repository.findById(input.ideaId);

  if (!idea || idea.ownerId !== input.ownerId) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  const content = input.content.trim();
  if (content.length === 0) {
    throw new InvalidNodeError("A manual node needs non-empty content.");
  }

  const graph = await loadIdeaGraph(repository, input.ideaId);

  if (graph.nodes.some((node) => node.type === input.type)) {
    throw new DimensionNotEmptyError(input.ideaId, input.type);
  }

  const node = await repository.addNode({
    ideaId: input.ideaId,
    type: input.type,
    content,
    source: "edited",
    messageId: null,
    confidence: null,
  });

  await repository.saveVersion(input.ideaId);

  return node;
}
