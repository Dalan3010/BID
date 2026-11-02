import { describe, expect, it } from "vitest";
import { NODE_TYPES, type IdeaGraph, type IdeaNode } from "../types";
import { completionRatio, findGaps } from "./gaps";

function makeNode(
  overrides: Pick<IdeaNode, "type" | "source"> & Partial<IdeaNode>,
): IdeaNode {
  return {
    id: `node-${overrides.type}`,
    ideaId: "idea-1",
    content: "content",
    messageId: null,
    confidence: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeGraph(...nodes: IdeaNode[]): IdeaGraph {
  return { ideaId: "idea-1", nodes };
}

describe("findGaps", () => {
  it("reports every dimension as a gap for an empty graph", () => {
    const gaps = findGaps(makeGraph());

    expect(gaps).toHaveLength(NODE_TYPES.length);
    expect(gaps.every((gap) => !gap.hasProposals)).toBe(true);
  });

  it("closes a gap when the dimension has a confirmed node", () => {
    const gaps = findGaps(makeGraph(makeNode({ type: "problem", source: "confirmed" })));

    expect(gaps.map((gap) => gap.type)).not.toContain("problem");
    expect(gaps).toHaveLength(NODE_TYPES.length - 1);
  });

  it("closes a gap when the dimension has a manually edited node", () => {
    const gaps = findGaps(makeGraph(makeNode({ type: "revenue", source: "edited" })));

    expect(gaps.map((gap) => gap.type)).not.toContain("revenue");
  });

  it("keeps the gap open for an inferred node but flags the proposal", () => {
    const gaps = findGaps(makeGraph(makeNode({ type: "segment", source: "inferred" })));

    const segment = gaps.find((gap) => gap.type === "segment");
    expect(segment).toEqual({ type: "segment", hasProposals: true });
  });
});

describe("completionRatio", () => {
  it("is zero for an empty graph", () => {
    expect(completionRatio(makeGraph())).toBe(0);
  });

  it("counts only validated dimensions", () => {
    const graph = makeGraph(
      makeNode({ id: "a", type: "problem", source: "confirmed" }),
      makeNode({ id: "b", type: "segment", source: "inferred" }),
    );

    expect(completionRatio(graph)).toBeCloseTo(1 / NODE_TYPES.length);
  });
});
