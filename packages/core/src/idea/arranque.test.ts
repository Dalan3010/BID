import { describe, expect, it } from "vitest";

import { type ArranqueStep, nextStep, openSteps } from "./arranque";

function step(partial: Partial<ArranqueStep>): ArranqueStep {
  return {
    id: "step-a",
    ideaId: "idea-1",
    title: "Definir el primer precio",
    detail: null,
    status: "open",
    createdAt: "2026-11-19T10:00:00.000Z",
    ...partial,
  };
}

describe("openSteps", () => {
  it("keeps only open steps, oldest first", () => {
    const steps = [
      step({
        id: "step-b",
        status: "done",
        createdAt: "2026-11-19T12:00:00.000Z",
      }),
      step({ id: "step-a" }),
      step({ id: "step-c", createdAt: "2026-11-19T11:00:00.000Z" }),
    ];

    expect(openSteps(steps).map((entry) => entry.id)).toEqual([
      "step-a",
      "step-c",
    ]);
  });

  it("does not mutate the input", () => {
    const steps = [
      step({ id: "step-c", createdAt: "2026-11-19T11:00:00.000Z" }),
      step({ id: "step-a" }),
    ];

    openSteps(steps);

    expect(steps.map((entry) => entry.id)).toEqual(["step-c", "step-a"]);
  });
});

describe("nextStep", () => {
  it("returns the oldest open step", () => {
    const steps = [
      step({ id: "step-b", status: "done" }),
      step({ id: "step-c", createdAt: "2026-11-19T11:00:00.000Z" }),
      step({ id: "step-a" }),
    ];

    expect(nextStep(steps)?.id).toBe("step-a");
  });

  it("returns null when every step is done", () => {
    expect(nextStep([step({ status: "done" })])).toBeNull();
  });

  it("returns null when there are no steps", () => {
    expect(nextStep([])).toBeNull();
  });
});
