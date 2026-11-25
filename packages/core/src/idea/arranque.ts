/**
 * The arranque stage: after the ten dimensions are validated, the coach drives
 * a list of concrete next steps with the person.
 *
 * Steps live in the accompaniment and never in the plan: once the graph is
 * complete it is closed, and what follows is work, not more structure. This
 * module is pure on purpose — the same rules run in the API, in the client and
 * in a test.
 */

/** Whether a step is still to be worked or already finished. */
export type StepStatus = "open" | "done";

/** One concrete next step of the arranque. */
export interface ArranqueStep {
  readonly id: string;
  readonly ideaId: string;
  readonly title: string;
  /** Context the coach gave when proposing the step, when there was any. */
  readonly detail: string | null;
  readonly status: StepStatus;
  readonly createdAt: string;
}

/**
 * Steps still to be worked, oldest first — that is the working order.
 *
 * The input is never mutated: like every projection, this is a function of the
 * data, not a change to it.
 */
export function openSteps(
  steps: readonly ArranqueStep[],
): ArranqueStep[] {
  return [...steps]
    .filter((step) => step.status === "open")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * The agenda of the arranque: the next step to work on, or `null` when the
 * list is clear.
 *
 * It plays the role `findGaps` plays during the structuring. **What to work on
 * next is a domain decision** (D6): the coach only phrases it and, when it
 * helps, grounds it with real data from the web.
 */
export function nextStep(
  steps: readonly ArranqueStep[],
): ArranqueStep | null {
  return openSteps(steps)[0] ?? null;
}
