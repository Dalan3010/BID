import { describe, expect, it } from "vitest";

import type { IdeaGraph, IdeaNode, NodeType } from "../types";
import { NODE_TYPES } from "../types";
import { buildTree } from "./tree";
import { COLUMN_WIDTH, ROW_HEIGHT, layoutGraph, layoutTree } from "./layout";

function node(type: NodeType, content: string): IdeaNode {
  return {
    id: `${type}-1`,
    ideaId: "idea-1",
    type,
    content,
    source: "confirmed",
    messageId: null,
    confidence: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const emptyGraph: IdeaGraph = { ideaId: "idea-1", nodes: [] };

describe("layoutTree", () => {
  it("places every dimension of the canonical model", () => {
    const layout = layoutTree(buildTree(emptyGraph));

    expect(layout.nodes.map((n) => n.type).sort()).toEqual(
      [...NODE_TYPES].sort(),
    );
  });

  it("places roots on the first row and their children one level down", () => {
    const layout = layoutTree(buildTree(emptyGraph));

    const problem = layout.nodes.find((n) => n.type === "problem");
    const segment = layout.nodes.find((n) => n.type === "segment");
    const solution = layout.nodes.find((n) => n.type === "solution");

    expect(problem?.position.y).toBe(0);
    expect(segment?.position.y).toBe(ROW_HEIGHT);
    expect(solution?.position.y).toBe(ROW_HEIGHT * 2);
  });

  it("gives each root its own column", () => {
    const layout = layoutTree(buildTree(emptyGraph));

    const problem = layout.nodes.find((n) => n.type === "problem");
    const risks = layout.nodes.find((n) => n.type === "risks");

    expect(problem?.position.x).toBe(0);
    expect(risks?.position.x).toBe(COLUMN_WIDTH);
  });

  it("edges every non-root dimension to its parent", () => {
    const layout = layoutTree(buildTree(emptyGraph));

    expect(layout.edges).toContainEqual({
      source: "problem",
      target: "value_proposition",
    });
    expect(layout.edges).toContainEqual({
      source: "value_proposition",
      target: "solution",
    });
    expect(layout.edges).toContainEqual({
      source: "solution",
      target: "revenue",
    });
  });

  it("does not edge the roots to anything", () => {
    const layout = layoutTree(buildTree(emptyGraph));

    const rootTargets = layout.edges
      .filter((edge) => edge.target === "problem" || edge.target === "risks")
      .map((edge) => edge.target);

    expect(rootTargets).toEqual([]);
  });

  it("counts one edge per non-root dimension", () => {
    const layout = layoutTree(buildTree(emptyGraph));

    expect(layout.edges).toHaveLength(NODE_TYPES.length - 2);
  });

  it("carries the nodes of each dimension into the layout", () => {
    const graph: IdeaGraph = {
      ideaId: "idea-1",
      nodes: [node("problem", "Offices lack good coffee")],
    };

    const layout = layoutGraph(graph);

    const problem = layout.nodes.find((n) => n.type === "problem");
    expect(problem?.nodes).toHaveLength(1);
    expect(problem?.nodes[0].content).toBe("Offices lack good coffee");
  });

  it("is deterministic", () => {
    const first = layoutTree(buildTree(emptyGraph));
    const second = layoutTree(buildTree(emptyGraph));

    expect(first).toEqual(second);
  });
});
