import type { ChatMessage, IdeaGraph } from "@bid/core";

/**
 * Port: the model that proposes the first concrete steps of the arranque.
 *
 * Like the `Extractor`, it returns **raw text** — the validation lives at the
 * boundary (`step-proposal-schema.ts`) and nothing enters the domain without
 * passing it (D6). What becomes a step is the person's decision (D3): the use
 * case stores only the proposals the user accepts, never the raw plan.
 *
 * @see docs/arquitectura.md, "Un puerto, dos implementaciones"
 */
export interface StepPlanner {
  plan(input: PlanningRequest): Promise<string>;
}

/** What the planner reads: the confirmed idea and the recent conversation. */
export interface PlanningRequest {
  readonly idea: IdeaGraph;
  readonly title: string;
  readonly messages: readonly ChatMessage[];
}
