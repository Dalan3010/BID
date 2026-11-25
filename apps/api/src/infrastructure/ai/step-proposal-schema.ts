import { z } from "zod";

import { unwrapJson } from "./json";

/**
 * The schema of what the step planner returns.
 *
 * This is the boundary of the model: **nothing enters the domain without
 * passing through here**. A malformed response is discarded, not repaired and
 * not partially applied (D6) — the same rule the extractor follows.
 */
export const stepProposalSchema = z.object({
  /** The step, in the person's terms: short and concrete. */
  title: z.string().min(1).max(160),
  /** Optional context the coach gave when proposing the step. */
  detail: z.string().min(1).max(600).optional(),
});

/** A whole plan: between one and eight steps. */
export const stepPlanSchema = z.object({
  steps: z.array(stepProposalSchema).min(1).max(8),
});

export type StepProposal = z.infer<typeof stepProposalSchema>;
export type StepPlan = z.infer<typeof stepPlanSchema>;

/** Parses whatever the planner returned; null when it is not a valid plan. */
export function parseStepPlan(raw: string): StepPlan | null {
  const candidate = unwrapJson(raw);

  if (candidate === null) {
    return null;
  }

  const parsed = stepPlanSchema.safeParse(candidate);

  return parsed.success ? parsed.data : null;
}
