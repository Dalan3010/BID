import type { ArranqueStep, StepStatus } from "@bid/core";
import type { ArranqueStepRepository } from "../ports/arranque-step-repository";
import type { IdeaRepository } from "../ports/idea-repository";
import { IdeaNotFoundError, StepNotFoundError } from "../errors";

/**
 * Completes a step, or reopens one that was closed.
 *
 * Completing the current step moves the agenda to the next open one by
 * itself: `nextStep` only looks at open steps.
 */
export async function updateArranqueStepStatus(
  dependencies: {
    readonly ideas: IdeaRepository;
    readonly steps: ArranqueStepRepository;
  },
  input: {
    readonly ideaId: string;
    readonly ownerId: string;
    readonly stepId: string;
    readonly status: StepStatus;
  },
): Promise<ArranqueStep> {
  const idea = await dependencies.ideas.findById(input.ideaId);

  if (!idea || idea.ownerId !== input.ownerId) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  const step = await dependencies.steps.updateStatus(
    input.ideaId,
    input.stepId,
    input.status,
  );

  if (!step) {
    throw new StepNotFoundError(input.ideaId, input.stepId);
  }

  return step;
}
