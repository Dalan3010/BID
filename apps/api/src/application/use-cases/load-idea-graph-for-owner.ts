import type { IdeaGraph } from "@bid/core";
import { IdeaNotFoundError } from "../errors";
import type { IdeaRepository } from "../ports/idea-repository";

export interface LoadIdeaGraphForOwnerInput {
  readonly ideaId: string;
  readonly ownerId: string;
}

/**
 * Loads a graph only if the caller owns the idea.
 *
 * The error is `IdeaNotFoundError`, not a "forbidden" one: answering 403 would
 * confirm that the idea exists and belongs to somebody else. To a stranger, an
 * idea they do not own and an idea that was never created look the same.
 */
export async function loadIdeaGraphForOwner(
  repository: IdeaRepository,
  input: LoadIdeaGraphForOwnerInput,
): Promise<IdeaGraph> {
  const idea = await repository.findById(input.ideaId);

  if (!idea || idea.ownerId !== input.ownerId) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  const graph = await repository.loadGraph(input.ideaId);

  if (!graph) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  return graph;
}
