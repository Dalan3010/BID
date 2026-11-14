/**
 * Pure helpers to keep the workspace's copy of the graph in sync with what the
 * server answered.
 *
 * None of them invents state: they apply a response the API already returned.
 * The client never promotes a proposal on its own.
 */
import type { IdeaNode } from "@bid/core";

import type { ProposalResolution } from "./api";

/**
 * Applies the server's answer to a proposal decision.
 *
 * - accept / correct → the node returned by the API replaces the proposal.
 * - discard → the proposal is removed.
 */
export function applyResolution(
  nodes: readonly IdeaNode[],
  nodeId: string,
  resolution: ProposalResolution,
): IdeaNode[] {
  if (!resolution.node) {
    return nodes.filter((node) => node.id !== nodeId);
  }

  const updated = resolution.node;
  return nodes.map((node) => (node.id === nodeId ? updated : node));
}

/** Proposals (inferred nodes), oldest first: the order they were made. */
export function pendingProposals(nodes: readonly IdeaNode[]): IdeaNode[] {
  return nodes
    .filter((node) => node.source === "inferred")
    .toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
}
