import type { ArranqueStep } from "@bid/core";
import type {
  ArranqueStepRepository,
  NewArranqueStep,
} from "../ports/arranque-step-repository";
import type { IdeaRepository } from "../ports/idea-repository";
import { IdeaNotFoundError } from "../errors";

/**
 * Persists the steps the person accepted.
 *
 * This is the "person validates" half of the arranque (rule 1 of the product):
 * the planner only proposes — nothing becomes a step until it goes through
 * here, in the order the person saw them.
 */
export async function addArranqueSteps(
  dependencies: {
    readonly ideas: IdeaRepository;
    readonly steps: ArranqueStepRepository;
  },
  input: {
    readonly ideaId: string;
    readonly ownerId: string;
    readonly steps: readonly NewArranqueStep[];
  },
): Promise<ArranqueStep[]> {
  const idea = await dependencies.ideas.findById(input.ideaId);

  if (!idea || idea.ownerId !== input.ownerId) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  return dependencies.steps.addSteps(input.ideaId, input.steps);
}
