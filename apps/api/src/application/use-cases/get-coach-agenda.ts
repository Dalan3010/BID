import {
  completionRatio,
  findGaps,
  type Gap,
} from "@bid/core";
import type { IdeaRepository } from "../ports/idea-repository";
import { loadIdeaGraph } from "./load-idea-graph";

export interface CoachAgenda {
  /** Dimensions that still need a validated answer, in canonical order. */
  readonly gaps: readonly Gap[];
  /** Share of dimensions already answered, from 0 to 1. */
  readonly completion: number;
}

/**
 * What the coach should ask about next.
 *
 * Deliberately model-free (D6): the agenda is a pure comparison against the ten
 * canonical dimensions. The model is used later to phrase the question, never to
 * decide what is missing. This cannot fail, cannot be slow, and costs nothing.
 */
export async function getCoachAgenda(
  repository: IdeaRepository,
  ideaId: string,
): Promise<CoachAgenda> {
  const graph = await loadIdeaGraph(repository, ideaId);

  return {
    gaps: findGaps(graph),
    completion: completionRatio(graph),
  };
}
