import {
  completionRatio,
  findGaps,
  type Gap,
  type IdeaGraph,
} from "@bid/core";
import type { Idea, IdeaRepository } from "../ports/idea-repository";

export interface IdeaProgress {
  readonly idea: Idea;
  /** Share of dimensions with a validated node, from 0 to 1. */
  readonly completion: number;
  /** Dimensions still open. */
  readonly gaps: number;
  readonly nodeCount: number;
  /**
   * The dimensions still open, in the order the coach will ask about them.
   *
   * The dashboard shows this as the agenda: what is missing *and* what comes
   * first. It comes from the same pure projection as `gaps`, so the number and
   * the list can never disagree.
   */
  readonly agenda: readonly Gap[];
}

/**
 * Lists an owner's ideas together with their progress.
 *
 * The progress is computed by the same pure projections the rest of the app
 * uses, so the dashboard cannot disagree with the tree view about what is
 * missing.
 */
export async function listIdeasWithProgress(
  repository: IdeaRepository,
  ownerId: string,
): Promise<IdeaProgress[]> {
  const ideas = await repository.listByOwner(ownerId);

  return Promise.all(
    ideas.map(async (idea) => {
      const graph: IdeaGraph = (await repository.loadGraph(idea.id)) ?? {
        ideaId: idea.id,
        nodes: [],
      };

      const agenda = findGaps(graph);

      return {
        idea,
        completion: completionRatio(graph),
        gaps: agenda.length,
        nodeCount: graph.nodes.length,
        agenda,
      };
    }),
  );
}
