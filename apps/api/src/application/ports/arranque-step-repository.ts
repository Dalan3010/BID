import type { ArranqueStep, StepStatus } from "@bid/core";

/** A step the person accepted: it becomes real only through this input. */
export interface NewArranqueStep {
  readonly title: string;
  readonly detail: string | null;
}

/**
 * Port: persistence of the arranque steps of one idea.
 *
 * The steps of the accompaniment are NOT part of the plan: the ten-dimension
 * graph is closed once complete. They live apart, so completing or reopening
 * a step never touches the validated idea.
 *
 * Ownership is resolved by the use cases: the repository only persists and
 * reads, exactly like `MessageRepository`.
 */
export interface ArranqueStepRepository {
  /** Steps of one idea, oldest first. */
  listByIdea(ideaId: string): Promise<ArranqueStep[]>;

  /** Adds steps in one batch, in the given order. Returns them as stored. */
  addSteps(
    ideaId: string,
    steps: readonly NewArranqueStep[],
  ): Promise<ArranqueStep[]>;

  /**
   * Marks a step as `open` or `done`. Returns `null` when the idea or the
   * step does not exist — the use case turns that into an honest 404.
   */
  updateStatus(
    ideaId: string,
    stepId: string,
    status: StepStatus,
  ): Promise<ArranqueStep | null>;
}
