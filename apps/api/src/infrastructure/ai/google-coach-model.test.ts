import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";

import type { CoachRequest } from "../../application/ports/coach-model";
import type { WebSearch } from "../../application/ports/web-search";
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

  it("answers without the search tool when the grounded call fails", async () => {
    let calls = 0;
    const model = new MockLanguageModelV4({
      doStream: async () => {
        calls += 1;

        // The search tool has its own quota: the model may be fine and the
        // grounded call fail anyway.
        if (calls === 1) throw new Error("429 grounding quota");

        return {
          stream: simulateReadableStream({
            chunks: [
              { type: "text-start", id: "t" },
              { type: "text-delta", id: "t", delta: "¿Cambiar de tostador?" },
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
        };
      },
    });

    const text = await collect(new GoogleCoachModel(model).stream(REQUEST));

    expect(text).toBe("¿Cambiar de tostador?");
    expect(calls).toBe(2);
  });

  it("retries without tools when the search step ends without a word", async () => {
    // First call: the model only called the tool and the stream closed with no
    // text at all. `textStream` would report an empty answer.
    const empty = {
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start" as const, id: "t" },
          { type: "text-end" as const, id: "t" },
          {
            type: "finish" as const,
            finishReason: { unified: "tool-calls" as const, raw: "tool_calls" },
            usage: {
              inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 1, text: 0, reasoning: 0 },
            },
          },
        ],
      }),
    };

    let calls = 0;
    const spoken = answering("Te consigo dos proveedores.");
    const model = new MockLanguageModelV4({
      doStream: async (options) => {
        calls += 1;
        return calls === 1 ? empty : spoken.doStream(options);
      },
    });

    const text = await collect(new GoogleCoachModel(model).stream(REQUEST));

    expect(text).toBe("Te consigo dos proveedores.");
    expect(calls).toBe(2);
  });

  it("asks for grounded answers: the search tool travels with every call", async () => {
    const model = answering("¿Dónde consigo granos?");
    const coach = new GoogleCoachModel(model);

    await collect(coach.stream(REQUEST));

    const call = model.doStreamCalls[0] as unknown as { tools?: unknown[] };

    expect(call.tools?.length).toBeGreaterThan(0);
    expect(JSON.stringify(call.tools)).toContain("google.google_search");
  });

  it("searches with our own web search when one is configured", async () => {
    const model = answering("Encontré dos tostadores: https://example.com");
    const webSearch: WebSearch = {
      search: async () => [
        {
          title: "Tostadores del Sur",
          url: "https://example.com/tostadores",
          snippet: "Tuestan granos a pedido.",
        },
      ],
    };
    const coach = new GoogleCoachModel(model, webSearch);

    await collect(coach.stream(REQUEST));

    const call = model.doStreamCalls[0] as unknown as { tools?: unknown[] };
    const tools = JSON.stringify(call.tools);

    expect(tools).toContain("web_search");
    expect(tools).not.toContain("google_search");
  });
});
