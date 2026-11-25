import { describe, expect, it } from "vitest";

import { InMemoryArranqueStepRepository } from "../testing/in-memory-arranque-step-repository";
import { InMemoryIdeaRepository } from "../testing/in-memory-idea-repository";
import { IdeaNotFoundError, StepNotFoundError } from "../errors";
import { createIdea } from "./create-idea";
import { addArranqueSteps } from "./add-arranque-steps";
import { loadArranqueSteps } from "./load-arranque-steps";
import { updateArranqueStepStatus } from "./update-arranque-step-status";

const OWNER = "owner-1";
const OTHER = "owner-2";

describe("the arranque steps", () => {
  async function setup() {
    const ideas = new InMemoryIdeaRepository();
    const steps = new InMemoryArranqueStepRepository();
    const idea = await createIdea(ideas, {
      ownerId: OWNER,
      title: "Café para oficinas",
    });

    return { ideas, steps, ideaId: idea.id };
  }

  const ONE_STEP = [{ title: "Fijar el primer precio", detail: null }];

  it("adds accepted proposals as open steps", async () => {
    const { ideas, steps, ideaId } = await setup();

    const created = await addArranqueSteps({ ideas, steps }, {
      ideaId,
      ownerId: OWNER,
      steps: [
        { title: "Fijar el primer precio", detail: "Cobrable mañana." },
        { title: "Llamar a dos proveedores", detail: null },
      ],
    });

    expect(created.map((step) => step.title)).toEqual([
      "Fijar el primer precio",
      "Llamar a dos proveedores",
    ]);
    expect(created.every((step) => step.status === "open")).toBe(true);

    const list = await loadArranqueSteps(
      { ideas, steps },
      { ideaId, ownerId: OWNER },
    );

    expect(list.map((step) => step.title)).toEqual([
      "Fijar el primer precio",
      "Llamar a dos proveedores",
    ]);
  });

  it("completes a step", async () => {
    const { ideas, steps, ideaId } = await setup();
    const created = await addArranqueSteps(
      { ideas, steps },
      { ideaId, ownerId: OWNER, steps: ONE_STEP },
    );

    const updated = await updateArranqueStepStatus(
      { ideas, steps },
      { ideaId, ownerId: OWNER, stepId: created[0]!.id, status: "done" },
    );

    expect(updated.status).toBe("done");

    const list = await loadArranqueSteps(
      { ideas, steps },
      { ideaId, ownerId: OWNER },
    );

    expect(list.find((step) => step.id === created[0]!.id)?.status).toBe("done");
  });

  it("reopens a completed step", async () => {
    const { ideas, steps, ideaId } = await setup();
    const created = await addArranqueSteps(
      { ideas, steps },
      { ideaId, ownerId: OWNER, steps: ONE_STEP },
    );
    await updateArranqueStepStatus(
      { ideas, steps },
      { ideaId, ownerId: OWNER, stepId: created[0]!.id, status: "done" },
    );

    const updated = await updateArranqueStepStatus(
      { ideas, steps },
      { ideaId, ownerId: OWNER, stepId: created[0]!.id, status: "open" },
    );

    expect(updated.status).toBe("open");
  });

  it("does not see another owner's idea", async () => {
    const { ideas, steps, ideaId } = await setup();

    await expect(
      loadArranqueSteps({ ideas, steps }, { ideaId, ownerId: OTHER }),
    ).rejects.toThrow(IdeaNotFoundError);
  });

  it("fails honestly when the step does not exist", async () => {
    const { ideas, steps, ideaId } = await setup();
    await addArranqueSteps(
      { ideas, steps },
      { ideaId, ownerId: OWNER, steps: ONE_STEP },
    );

    await expect(
      updateArranqueStepStatus(
        { ideas, steps },
        { ideaId, ownerId: OWNER, stepId: "missing-step", status: "done" },
      ),
    ).rejects.toThrow(StepNotFoundError);
  });
});
