import { describe, expect, it } from "vitest";

import { buildPlanningPrompt } from "./google-step-planner";

describe("buildPlanningPrompt", () => {
  it("names the idea and demands strict JSON", () => {
    const prompt = buildPlanningPrompt("Café para oficinas");

    expect(prompt).toContain("Café para oficinas");
    expect(prompt).toContain("JSON");
    expect(prompt).toContain("3 y 6");
  });

  it("asks for steps written in the product voice, neutral tú", () => {
    const prompt = buildPlanningPrompt("Café para oficinas");

    expect(prompt).toContain("de tú");
  });

  it("forbids inventing data the idea does not have", () => {
    const prompt = buildPlanningPrompt("Café para oficinas");

    expect(prompt).toContain("No inventes");
  });
});
