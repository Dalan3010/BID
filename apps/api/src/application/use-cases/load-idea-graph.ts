import type { IdeaGraph } from "@bid/core";
import { IdeaNotFoundError } from "../errors";
import type { IdeaRepository } from "../ports/idea-repository";

/** Loads the full graph of one idea, or fails loudly. */
export async function loadIdeaGraph(
  repository: IdeaRepository,
  ideaId: string,
): Promise<IdeaGraph> {
  const graph = await repository.loadGraph(ideaId);
  if (!graph) {
    throw new IdeaNotFoundError(ideaId);
  }

  return graph;
}
