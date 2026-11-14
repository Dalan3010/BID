import {
  NODE_PARENT,
  type IdeaGraph,
  type IdeaNode,
  type NodeType,
} from "../types";
import { buildTree, type TreeNode } from "./tree";

/** A dimension placed on the canvas. */
export interface PositionedDimension {
  readonly type: NodeType;
  readonly nodes: readonly IdeaNode[];
  readonly position: { readonly x: number; readonly y: number };
  readonly depth: number;
}

/** A parent-child relation between two dimensions. */
export interface DimensionEdge {
  readonly source: NodeType;
  readonly target: NodeType;
}

/** The whole tree, ready to be handed to a canvas. */
export interface TreeLayout {
  readonly nodes: readonly PositionedDimension[];
  readonly edges: readonly DimensionEdge[];
}

/** Horizontal distance between two sibling dimensions, in pixels. */
export const COLUMN_WIDTH = 260;

/** Vertical distance between two levels of the hierarchy, in pixels. */
export const ROW_HEIGHT = 190;

/**
 * Projection: tree -> canvas positions.
 *
 * React Flow does not lay out nodes; every one of them needs an explicit
 * position. Rather than pulling in a layout library, the positions are derived
 * here: the hierarchy is already a tree, so a depth-first walk that numbers the
 * siblings is enough.
 *
 * The result is deterministic: the same tree always produces the same canvas.
 * That makes it testable, which a layout library would not be.
 */
export function layoutTree(tree: readonly TreeNode[]): TreeLayout {
  const nodes: PositionedDimension[] = [];
  const edges: DimensionEdge[] = [];

  const walk = (
    current: readonly TreeNode[],
    depth: number,
    parent: NodeType | null,
  ): void => {
    current.forEach((branch, index) => {
      nodes.push({
        type: branch.type,
        nodes: branch.nodes,
        position: { x: index * COLUMN_WIDTH, y: depth * ROW_HEIGHT },
        depth,
      });

      if (parent) {
        edges.push({ source: parent, target: branch.type });
      }

      walk(branch.children, depth + 1, branch.type);
    });
  };

  walk(tree, 0, null);

  return { nodes, edges };
}

/**
 * Projection: graph -> canvas layout.
 *
 * The convenience path: it goes from the stored graph to a drawable tree
 * without the caller having to compose the two steps.
 */
export function layoutGraph(graph: IdeaGraph): TreeLayout {
  return layoutTree(buildTree(graph));
}

/** The parent of a dimension, or `null` for a root. */
export function parentOf(type: NodeType): NodeType | null {
  return NODE_PARENT[type];
}
