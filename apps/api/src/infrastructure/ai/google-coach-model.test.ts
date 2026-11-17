import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";

import type { CoachRequest } from "../../application/ports/coach-model";
import { GoogleCoachModel } from "./google-coach-model";

const REQUEST: CoachRequest = {
  idea: { ideaId: "idea-1", nodes: [] },
  title: "Café para oficinas",
  messages: [
    {
      id: "m1",
      ideaId: "idea-1",
      role: "user",
      content: "Hola",
      createdAt: new Date().toISOString(),
    },
  ],
  agenda: ["problem"],
};

function answering(...deltas: string[]) {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "t" },
          ...deltas.map((delta) => ({ type: "text-delta" as const, id: "t", delta })),
          { type: "text-end", id: "t" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: "stop" },
            usage: {
              inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 1, text: 1, reasoning: 0 },
            },
          },
        ],
      }),
    }),
  });
}

async function collect(stream: AsyncIterable<string>): Promise<string> {
  let text = "";

  for await (const chunk of stream) {
    text += chunk;
  }

  return text;
}

describe("GoogleCoachModel", () => {
  it("streams the answer, with the system prompt sent as instructions", async () => {
    const model = answering("¿Qué ", "problema?");
    const coach = new GoogleCoachModel(model);

    expect(await collect(coach.stream(REQUEST))).toBe("¿Qué problema?");

    const prompt = model.doStreamCalls[0]?.prompt ?? [];
    expect(prompt[0]?.role).toBe("system");
    expect(prompt.slice(1).some((message) => message.role === "system")).toBe(false);
  });

  it("throws when the provider fails, so the fallback can answer", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => {
        throw new Error("quota exceeded");
      },
    });

    await expect(collect(new GoogleCoachModel(model).stream(REQUEST))).rejects.toThrow();
  });
});
