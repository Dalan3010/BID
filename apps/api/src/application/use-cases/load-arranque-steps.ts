import type { ArranqueStep } from "@bid/core";
import type { ArranqueStepRepository } from "../ports/arranque-step-repository";
import type { IdeaRepository } from "../ports/idea-repository";
import { IdeaNotFoundError } from "../errors";

/**
 * The steps of one idea, loaded **for the owner**.
 *
 * The coach reads them through `nextStep` (the arranque agenda); the client
 * reads them to draw the step list. Both see the same order: oldest first.
 */
export async function loadArranqueSteps(
  dependencies: {
    readonly ideas: IdeaRepository;
    readonly steps: ArranqueStepRepository;
  },
  input: {
    readonly ideaId: string;
    readonly ownerId: string;
  },
): Promise<ArranqueStep[]> {
  const idea = await dependencies.ideas.findById(input.ideaId);

  if (!idea || idea.ownerId !== input.ownerId) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  return dependencies.steps.listByIdea(input.ideaId);
}
