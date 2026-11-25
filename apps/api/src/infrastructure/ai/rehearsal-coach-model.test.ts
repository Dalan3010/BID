import { describe, expect, it } from "vitest";

import type { ArranqueStep, ChatMessage } from "@bid/core";

import type { CoachRequest } from "../../application/ports/coach-model";
import { RehearsalCoachModel } from "./rehearsal-coach-model";

/** One stored message, as the conversation repository returns it. */
function message(content: string, role: ChatMessage["role"], createdAt: string): ChatMessage {
  return { id: `${role}-${createdAt}`, ideaId: "idea-1", role, content, createdAt };
}

function request(agenda: CoachRequest["agenda"]): CoachRequest {
  return {
    idea: { ideaId: "idea-1", nodes: [] },
    title: "Café para oficinas",
    messages: [],
    agenda,
  };
}

/** Collects a coach stream into the full text of one answer. */
async function answer(model: RehearsalCoachModel, input: CoachRequest): Promise<string> {
  let text = "";

  for await (const word of model.stream(input)) {
    text += word;
  }

  return text.trim();
}

describe("RehearsalCoachModel", () => {
  it("asks about the next open dimension when the agenda has one", async () => {
    const text = await answer(new RehearsalCoachModel(), request(["problem"]));

    expect(text).toContain("problema");
  });

  it("guides the person to the arranque panel when the idea is complete", async () => {
    const text = await answer(new RehearsalCoachModel(), request([]));

    expect(text).toContain("arrancar");
    expect(text).toContain("El arranque");
    expect(text).not.toContain("empezar otra");
  });

  it("keeps working the step instead of asking the same question again", async () => {
    const step: ArranqueStep = {
      id: "step-1",
      ideaId: "idea-1",
      title: "Fijar el primer precio",
      detail: "Un número concreto que puedas cobrar mañana.",
      status: "open",
      createdAt: "2026-11-19T10:00:00.000Z",
    };

    const sameStep: CoachRequest = {
      ...request([]),
      nextStep: step,
      messages: [
        message("Ya cobré 5000 el primer mes", "user", "2026-11-19T10:05:00.000Z"),
        message("El paso que sigue es…", "assistant", "2026-11-19T10:05:30.000Z"),
      ],
    };

    const text = await answer(new RehearsalCoachModel(), sameStep);

    expect(text).not.toContain("¿Qué necesitas para darlo esta semana?");
    expect(text).toContain("Un número concreto");
    expect(text).toContain("hecho");
  });

  it("asks about the next step when the plan is complete and a step exists", async () => {
    const text = await answer(new RehearsalCoachModel(), {
      ...request([]),
      nextStep: {
        id: "step-1",
        ideaId: "idea-1",
        title: "Fijar el primer precio",
        detail: null,
        status: "open",
        createdAt: "2026-11-19T10:00:00.000Z",
      },
    });

    expect(text).toContain("Fijar el primer precio");
    expect(text).not.toContain("arrancar");
  });
});
