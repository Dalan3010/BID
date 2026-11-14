import { NODE_TYPES, type IdeaNode, type NodeSource, type NodeType } from "@bid/core";
import { describe, expect, it } from "vitest";

import { DIMENSIONS, buildDimensionViews, dimensionIndex, welcomeTopics } from "./dimensions";

function node(type: NodeType, source: NodeSource, id = `${type}-${source}`): IdeaNode {
  return {
    id,
    ideaId: "idea",
    type,
    content: `${type} content`,
    source,
    messageId: null,
    confidence: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("buildDimensionViews", () => {
  it("returns the ten dimensions in canonical order", () => {
    expect(buildDimensionViews([]).map((view) => view.type)).toEqual([...NODE_TYPES]);
  });

  it("never counts an inferred node as validated", () => {
    const [problem] = buildDimensionViews([node("problem", "inferred")]);

    expect(problem.status).toBe("pending");
    expect(problem.validated).toHaveLength(0);
    expect(problem.proposals).toHaveLength(1);
  });

  it("counts confirmed and edited nodes as validated", () => {
    const views = buildDimensionViews([node("problem", "confirmed"), node("segment", "edited")]);

    expect(views[0].status).toBe("validated");
    expect(views[1].status).toBe("validated");
    expect(views[2].status).toBe("open");
  });

  it("keeps a validated dimension validated even with a pending proposal", () => {
    const [problem] = buildDimensionViews([
      node("problem", "confirmed"),
      node("problem", "inferred"),
    ]);

    expect(problem.status).toBe("validated");
    expect(problem.validated.map((item) => item.source)).toEqual(["confirmed"]);
  });
});

describe("copy", () => {
  it("has copy for every dimension", () => {
    for (const type of NODE_TYPES) {
      expect(DIMENSIONS[type].label.length).toBeGreaterThan(0);
    }
  });

  it("numbers dimensions from 01 to 10", () => {
    expect(dimensionIndex("problem")).toBe("01");
    expect(dimensionIndex("risks")).toBe("10");
  });
});

describe("welcomeTopics", () => {
  it("offers the first three dimensions of an empty idea, in canonical order", () => {
    expect(welcomeTopics([]).map((topic) => topic.type)).toEqual([
      "problem",
      "segment",
      "value_proposition",
    ]);
  });

  it("skips validated dimensions but keeps ones that only have proposals", () => {
    const topics = welcomeTopics([node("problem", "confirmed"), node("segment", "inferred")]);

    expect(topics.map((topic) => topic.type)).toEqual(["segment", "value_proposition", "solution"]);
  });

  it("gives every topic a sentence start for the composer", () => {
    for (const topic of welcomeTopics([], 10)) {
      expect(topic.starter.endsWith(" ")).toBe(true);
    }
  });
});
