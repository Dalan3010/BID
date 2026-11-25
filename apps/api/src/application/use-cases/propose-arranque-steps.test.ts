import { describe, expect, it } from "vitest";

import { InMemoryMessageRepository } from "../testing/in-memory-message-repository";
import { InMemoryIdeaRepository } from "../testing/in-memory-idea-repository";
import { IdeaNotFoundError } from "../errors";
import type { StepPlanner } from "../ports/step-planner";
import type { UsageQuota } from "./extract-knowledge";
import { createIdea } from "./create-idea";
import { proposeArranqueSteps } from "./propose-arranque-steps";

const OWNER = "owner-1";
const OTHER = "owner-2";

const VALID_PLAN = JSON.stringify({
  steps: [
    { title: "Conseguir tres clientes de prueba" },
    { title: "Fijar el primer precio", detail: "Cobrable mañana." },
  ],
});

/** A planner the test controls: it counts calls and answers one fixed text. */
class ScriptedPlanner implements StepPlanner {
  calls = 0;

  constructor(private readonly answer: string) {}

  async plan(): Promise<string> {
    this.calls += 1;

    return this.answer;
  }
}

/** A quota the test controls. */
function quota(options: {
  readonly canConsume: boolean;
}): UsageQuota & { consumedCalls(): number } {
  let consumed = 0;

  return {
    canConsume: async () => options.canConsume,
    consume: async () => {
      consumed += 1;
    },
    consumedCalls: () => consumed,
  };
}

describe("proposeArranqueSteps", () => {
  async function setup() {
    const ideas = new InMemoryIdeaRepository();
    const messages = new InMemoryMessageRepository();
    const idea = await createIdea(ideas, { ownerId: OWNER, title: "Café para oficinas" });

    return { ideas, messages, ideaId: idea.id };
  }

  it("proposes steps the boundary validated, and consumes one quota call", async () => {
    const { ideas, messages, ideaId } = await setup();
    const planner = new ScriptedPlanner(VALID_PLAN);
    const used = quota({ canConsume: true });

    const result = await proposeArranqueSteps(
      { ideas, messages, planner, quota: used },
      { ideaId, ownerId: OWNER },
    );

    expect(result.quotaReached).toBe(false);
    expect(result.proposals).toEqual([
      { title: "Conseguir tres clientes de prueba", detail: null },
      { title: "Fijar el primer precio", detail: "Cobrable mañana." },
    ]);
    expect(planner.calls).toBe(1);
    expect(used.consumedCalls()).toBe(1);
  });

  it("does not call the planner when the quota is reached", async () => {
    const { ideas, messages, ideaId } = await setup();
    const planner = new ScriptedPlanner(VALID_PLAN);
    const used = quota({ canConsume: false });

    const result = await proposeArranqueSteps(
      { ideas, messages, planner, quota: used },
      { ideaId, ownerId: OWNER },
    );

    expect(result.quotaReached).toBe(true);
    expect(result.proposals).toEqual([]);
    expect(planner.calls).toBe(0);
    expect(used.consumedCalls()).toBe(0);
  });

  it("discards a plan the boundary rejects", async () => {
    const { ideas, messages, ideaId } = await setup();
    const planner = new ScriptedPlanner("Lo siento, no pude pensar pasos.");

    const result = await proposeArranqueSteps(
      { ideas, messages, planner, quota: quota({ canConsume: true }) },
      { ideaId, ownerId: OWNER },
    );

    expect(result.quotaReached).toBe(false);
    expect(result.proposals).toEqual([]);
  });

  it("does not see another owner's idea", async () => {
    const { ideas, messages, ideaId } = await setup();
    const planner = new ScriptedPlanner(VALID_PLAN);

    await expect(
      proposeArranqueSteps(
        { ideas, messages, planner, quota: quota({ canConsume: true }) },
        { ideaId, ownerId: OTHER },
      ),
    ).rejects.toThrow(IdeaNotFoundError);
  });
});
