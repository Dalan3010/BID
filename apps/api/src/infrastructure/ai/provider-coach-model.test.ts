import { describe, expect, it } from "vitest";

import type { ChatMessage } from "@bid/core";

import type { CoachRequest } from "../../application/ports/coach-model";
import { buildProviderMessages } from "./provider-coach-model";

/** One stored message, as the conversation repository returns it. */
function message(content: string, role: ChatMessage["role"], createdAt: string): ChatMessage {
  return { id: `${role}-${createdAt}`, ideaId: "idea-1", role, content, createdAt };
}

const REQUEST: CoachRequest = {
  idea: { ideaId: "idea-1", nodes: [] },
  title: "Café para oficinas",
  messages: [],
  agenda: [],
};

describe("buildProviderMessages", () => {
  it("points the coach at the next dimension when one is open", () => {
    const messages = buildProviderMessages("system", {
      ...REQUEST,
      agenda: ["problem"],
    });

    const focus = messages.at(-1);
    expect(focus?.role).toBe("user");
    expect(focus?.content).toContain("problem");
  });

  it("directs the coach to the proposal mechanism when the idea is complete", () => {
    const messages = buildProviderMessages("system", REQUEST);

    const focus = messages.at(-1);
    expect(focus?.content).toContain("arranque");
    expect(focus?.content).toContain("El arranque");
    expect(focus?.content).not.toContain("empezar otra");
  });

  it("focuses the coach on the next arranque step when the plan is complete", () => {
    const messages = buildProviderMessages("system", {
      ...REQUEST,
      nextStep: {
        id: "step-1",
        ideaId: "idea-1",
        title: "Fijar el primer precio",
        detail: null,
        status: "open",
        createdAt: "2026-11-19T10:00:00.000Z",
      },
    });

    const focus = messages.at(-1);
    expect(focus?.content).toContain("Fijar el primer precio");
    expect(focus?.content).toContain("una sola pregunta");
    expect(focus?.content).not.toContain("empezar otra");
  });

  it("stops asking about a step the person already answered", () => {
    const messages = buildProviderMessages("system", {
      ...REQUEST,
      nextStep: {
        id: "step-1",
        ideaId: "idea-1",
        title: "Fijar el primer precio",
        detail: null,
        status: "open",
        createdAt: "2026-11-19T10:00:00.000Z",
      },
      messages: [
        message("Ya cobré 5000 el primer mes", "user", "2026-11-19T10:05:00.000Z"),
        message("El paso que sigue es…", "assistant", "2026-11-19T10:05:30.000Z"),
        message("Me sirve, ¿y ahora?", "user", "2026-11-19T10:06:00.000Z"),
      ],
    });

    const focus = messages.at(-1);
    expect(focus?.content).toContain("Fijar el primer precio");
    expect(focus?.content).toContain("ya lo hablaron");
    expect(focus?.content).not.toContain("Haz una sola pregunta");
  });
});
