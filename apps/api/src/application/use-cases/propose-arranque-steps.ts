import type { IdeaRepository } from "../ports/idea-repository";
import type { MessageRepository } from "../ports/message-repository";
import type { StepPlanner } from "../ports/step-planner";
import { IdeaNotFoundError } from "../errors";
import { parseStepPlan } from "../../infrastructure/ai/step-proposal-schema";
import { CONTEXT_MESSAGE_LIMIT } from "./build-coach-context";
import type { UsageQuota } from "./extract-knowledge";

/** One step proposal: the person decides whether it becomes a real step. */
export interface ProposedStep {
  readonly title: string;
  readonly detail: string | null;
}

export interface ProposeArranqueStepsResult {
  readonly proposals: readonly ProposedStep[];
  /** True when the quota was reached and the planner was not called. */
  readonly quotaReached: boolean;
}

/**
 * Reads the confirmed idea and proposes the first concrete steps of the
 * arranque.
 *
 * The order is deliberate, and mirrors `extractKnowledge`:
 *
 * 1. The idea is loaded **for the owner**: another user's idea is not found.
 * 2. The quota is checked **before** the model is called: the person is
 *    told, not left wondering (RF-24).
 * 3. The planner runs and its answer is **validated** at the boundary. An
 *    invalid plan is discarded: nothing is proposed and nothing is
 *    persisted (D6).
 * 4. What becomes a step is the person's decision (D3): this use case only
 *    proposes; `addArranqueSteps` is what persists what the user accepted.
 */
export async function proposeArranqueSteps(
  dependencies: {
    readonly ideas: IdeaRepository;
    readonly messages: MessageRepository;
    readonly planner: StepPlanner;
    readonly quota: UsageQuota;
  },
  input: {
    readonly ideaId: string;
    readonly ownerId: string;
  },
): Promise<ProposeArranqueStepsResult> {
  const idea = await dependencies.ideas.findById(input.ideaId);

  if (!idea || idea.ownerId !== input.ownerId) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  const quotaReached = !(await dependencies.quota.canConsume(input.ownerId));

  if (quotaReached) {
    return { proposals: [], quotaReached: true };
  }

  const graph = (await dependencies.ideas.loadGraph(input.ideaId)) ?? {
    ideaId: input.ideaId,
    nodes: [],
  };

  const recent = await dependencies.messages.listRecent(
    input.ideaId,
    CONTEXT_MESSAGE_LIMIT,
  );

  const raw = await dependencies.planner.plan({
    idea: graph,
    title: idea.title,
    messages: recent,
  });

  await dependencies.quota.consume(input.ownerId);

  const plan = parseStepPlan(raw);

  if (!plan) {
    // The model answered something that is not a valid plan. Nothing is
    // proposed: a broken answer is not a step (D6).
    return { proposals: [], quotaReached: false };
  }

  return {
    proposals: plan.steps.map((step) => ({
      title: step.title,
      detail: step.detail ?? null,
    })),
    quotaReached: false,
  };
}
