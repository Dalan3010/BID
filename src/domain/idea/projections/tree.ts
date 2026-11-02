import {
  NODE_PARENT,
  type IdeaGraph,
  type IdeaNode,
  type NodeType,
} from "../types";

/** One dimension of the idea rendered as a tree node. */
export interface TreeNode {
  readonly type: NodeType;
  readonly nodes: readonly IdeaNode[];
  readonly children: readonly TreeNode[];
}

/**
 * Projection: graph -> hierarchy.
 *
 * The tree is not stored. It is derived from `NODE_PARENT`, so changing the
 * hierarchy changes every view without migrating any data. Empty dimensions are
 * kept on purpose: they are what the coach points at.
 */
export function buildTree(graph: IdeaGraph): TreeNode[] {
  const nodesByType = groupNodesByType(graph);

  const childrenByParent = new Map<NodeType | null, NodeType[]>();
  for (const type of Object.keys(NODE_PARENT) as NodeType[]) {
    const parent = NODE_PARENT[type];
    const siblings = childrenByParent.get(parent) ?? [];
    siblings.push(type);
    childrenByParent.set(parent, siblings);
  }

  const build = (type: NodeType): TreeNode => ({
    type,
    nodes: nodesByType.get(type) ?? [],
    children: (childrenByParent.get(type) ?? []).map(build),
  });

  return (childrenByParent.get(null) ?? []).map(build);
}

function groupNodesByType(graph: IdeaGraph): Map<NodeType, IdeaNode[]> {
  const nodesByType = new Map<NodeType, IdeaNode[]>();

  for (const node of graph.nodes) {
    const bucket = nodesByType.get(node.type) ?? [];
    bucket.push(node);
    nodesByType.set(node.type, bucket);
  }

  return nodesByType;
}
