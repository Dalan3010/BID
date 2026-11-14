import type { IdeaNode } from "@bid/core";
import { describe, expect, it } from "vitest";

import { buildTimeline, excerpt } from "./timeline";

const node = (overrides: Partial<IdeaNode>): IdeaNode => ({
  id: "n1",
  ideaId: "idea",
  type: "problem",
  content: "Falta café",
  source: "inferred",
  messageId: "m1",
  confidence: null,
  createdAt: "2026-01-01T10:01:00.000Z",
  updatedAt: "2026-01-01T10:01:00.000Z",
  ...overrides,
});

describe("buildTimeline", () => {
  it("orders messages and node events by time", () => {
    const events = buildTimeline(
      [
        { id: "m1", role: "user", content: "Hola", createdAt: "2026-01-01T10:00:00.000Z" },
        { id: "m2", role: "assistant", content: "¿Qué problema?", createdAt: "2026-01-01T10:00:30.000Z" },
      ],
      [node({ source: "confirmed", updatedAt: "2026-01-01T10:05:00.000Z" })],
    );

    expect(events.map((event) => event.kind)).toEqual(["message", "message", "proposed", "confirmed"]);
  });

  it("shows a pending proposal only as proposed, and a manual node as added", () => {
    const events = buildTimeline([], [node({}), node({ id: "n2", messageId: null, source: "edited" })]);

    expect(events.filter((event) => event.kind === "confirmed")).toHaveLength(0);
    expect(events.map((event) => event.kind)).toContain("added");
    expect(events.map((event) => event.kind)).toContain("edited");
  });

  it("skips system messages", () => {
    expect(
      buildTimeline([{ id: "s", role: "system", content: "x", createdAt: "2026-01-01T00:00:00.000Z" }], []),
    ).toEqual([]);
  });
});

describe("excerpt", () => {
  it("flattens whitespace and cuts long text", () => {
    expect(excerpt("a\n\n b")).toBe("a b");
    expect(excerpt("x".repeat(200), 10)).toHaveLength(10);
  });
});
