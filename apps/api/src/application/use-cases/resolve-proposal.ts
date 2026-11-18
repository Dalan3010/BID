import { isEditable, type IdeaNode } from "@bid/core";
import {
  NodeNotEditableError,
  NodeNotFoundError,
  NotAProposalError,
} from "../errors";
import type { IdeaRepository } from "../ports/idea-repository";

export interface ResolveProposalInput {
  readonly ideaId: string;
  readonly nodeId: string;
  /** What the user decided. */
  readonly decision: "accept" | "correct" | "discard";
  /** The corrected text, when the decision is `correct`. */
  readonly content?: string;
}

/**
 * The result of resolving a proposal.
 *
 * `node` is the node after the decision: `confirmed` when accepted, `edited`
 * when corrected, and `null` when discarded.
 */
export interface ResolveProposalResult {
  readonly node: IdeaNode | null;
  readonly source: "confirmed" | "edited" | null;
}

/**
 * The user decides what happens to a proposal.
 *
 * Three ways to resolve it (RF-23):
 *
 * - **accept**: the proposal was right, it becomes `confirmed` knowledge.
 * - **correct**: the user rewrites it, it becomes `edited`.
 * - **discard**: it was wrong, it is removed.
 *
 * A proposal is a node in state `inferred`. Accepting it is the only path that
 * turns a proposal into knowledge, and it is always the user who takes it (D2).
 */
export async function resolveProposal(
  repository: IdeaRepository,
  input: ResolveProposalInput,
): Promise<ResolveProposalResult> {
  const node = await repository.findNode(input.ideaId, input.nodeId);

  if (!node) {
    throw new NodeNotFoundError(input.nodeId);
  }

  // Only a pending proposal can be resolved. A node that is already confirmed
  // or edited is knowledge, not a question anymore.
  if (node.source !== "inferred") {
    throw new NotAProposalError(node.id);
  }

  if (input.decision === "discard") {
    await repository.removeNode(input.ideaId, input.nodeId);

    // A discarded proposal was never part of a snapshot: recording its removal
    // would create an empty version. Only a deletion that actually changes the
    // latest recorded graph deserves a new one.
    const latest = await repository.findLatestVersion(input.ideaId);
    const wasSnapshotted =
      latest?.graph.nodes.some((snapshotNode) => snapshotNode.id === node.id) ??
      false;

    if (wasSnapshotted) {
      await repository.saveVersion(input.ideaId);
    }

    return { node: null, source: null };
  }

  if (input.decision === "correct") {
    const content = input.content?.trim() ?? "";

    if (content.length === 0) {
      throw new NodeNotEditableError(node.source);
    }

    const updated = await repository.updateNode(input.ideaId, input.nodeId, {
      content,
      source: "edited",
      // The user's certainty is not the model's confidence.
      confidence: null,
    });

    if (!updated) {
      throw new NodeNotFoundError(input.nodeId);
    }

    await repository.saveVersion(input.ideaId);

    return { node: updated, source: "edited" };
  }

  const updated = await repository.updateNode(input.ideaId, input.nodeId, {
    source: "confirmed",
    // Confidence describes the model's guess, not the user's certainty.
    confidence: null,
  });

  if (!updated) {
    throw new NodeNotFoundError(input.nodeId);
  }

  await repository.saveVersion(input.ideaId);

  return { node: updated, source: "confirmed" };
}

/**
 * True when the user may edit this node by hand.
 *
 * Direct editing is restricted to validated knowledge (D3): an `inferred` node
 * is a question, not an answer, and it is corrected from the confirmation
 * panel or through the conversation.
 */
export function canEditNode(node: IdeaNode): boolean {
  return isEditable(node.source);
}
