import { describe, expect, it } from "vitest";

import type { PlanningRequest } from "../../application/ports/step-planner";
import { parseStepPlan } from "./step-proposal-schema";
import { RehearsalStepPlanner } from "./rehearsal-step-planner";

const REQUEST: PlanningRequest = {
  idea: { ideaId: "idea-1", nodes: [] },
  title: "Café para oficinas",
  messages: [],
};

describe("RehearsalStepPlanner", () => {
  it("returns a plan that passes the boundary schema", async () => {
    const raw = await new RehearsalStepPlanner().plan(REQUEST);

    const plan = parseStepPlan(raw);

    expect(plan).not.toBeNull();
    expect((plan?.steps.length ?? 0)).toBeGreaterThan(0);
  });

  it("never mentions the provider or any tool", async () => {
    const raw = await new RehearsalStepPlanner().plan(REQUEST);

    expect(raw).not.toMatch(/modelo|prompt|token/i);
  });
});
