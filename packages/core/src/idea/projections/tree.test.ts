import { describe, expect, it } from "vitest";
import type { IdeaGraph, IdeaNode, NodeType } from "../types";
import { buildTree, type TreeNode } from "./tree";

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

function findType(tree: readonly TreeNode[], type: NodeType): TreeNode | undefined {
  for (const node of tree) {
    if (node.type === type) {
      return node;
    }
    const found = findType(node.children, type);
    if (found) {
      return found;
    }
  }
  return undefined;
}

describe("buildTree", () => {
  it("keeps empty dimensions visible for an empty graph", () => {
    const tree = buildTree(makeGraph());

    expect(tree.map((node) => node.type)).toEqual(["problem", "risks"]);
    expect(tree.every((node) => node.nodes.length === 0)).toBe(true);
  });

  it("places nodes under their dimension", () => {
    const tree = buildTree(
      makeGraph(
        makeNode({ type: "problem", source: "confirmed", content: "Lento al facturar" }),
      ),
    );

    expect(findType(tree, "problem")?.nodes).toHaveLength(1);
  });

  it("derives the hierarchy from the canonical parent map", () => {
    const tree = buildTree(makeGraph());

    const solution = findType(tree, "solution");
    const revenue = findType(tree, "revenue");

    expect(solution?.children.map((node) => node.type)).toContain("revenue");
    expect(revenue).toBeDefined();
  });
});
