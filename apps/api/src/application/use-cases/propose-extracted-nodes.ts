import type { IdeaGraph, IdeaNode, NodeType } from "@bid/core";
import { canTransition, isEditable } from "@bid/core";
import type { IdeaRepository } from "../ports/idea-repository";
import { InvalidNodeError } from "../errors";

/**
 * The result of an extraction round.
 *
 * `proposals` are the nodes that were created, waiting for the user.
 * `skipped` explains, per dimension, why nothing was proposed.
 */
export interface ExtractionOutcome {
  readonly proposals: readonly ExtractedProposal[];
  readonly skipped: readonly SkippedDimension[];
}

/** A node the extraction created, waiting for confirmation. */
export interface ExtractedProposal {
  readonly id: string;
  readonly type: NodeType;
  readonly content: string;
  readonly confidence: number | null;
}

/** A dimension where nothing was proposed, and why. */
export interface SkippedDimension {
  readonly type: NodeType;
  readonly reason:
    | "already_edited"
    | "already_answered"
    | "pending_proposal"
    | "nothing_extracted"
    | "invalid_output";
}

export interface ExtractKnowledgeInput {
  readonly ideaId: string;
  readonly ownerId: string;
  /** The conversation to read. */
  readonly messages: readonly {
    readonly id: string;
    readonly role: "user" | "assistant" | "system";
    readonly content: string;
  }[];
  /** The result of the extractor, already validated. */
  readonly extraction: {
    readonly nodes: readonly {
      readonly type: NodeType;
      readonly content: string;
      readonly confidence?: number;
    }[];
  };
}

/**
 * Turns the result of an extraction into proposals.
 *
 * Two rules come from the domain and are applied here, not in the extractor:
 *
 * 1. **A proposal always enters as `inferred`.** The extraction never writes
 *    confirmed knowledge (D2).
 * 2. **An `edited` node is never overwritten** (D3, RF-33). A dimension whose
 *    node the user wrote by hand is skipped, with a reason.
 */
export async function proposeExtractedNodes(
  repository: IdeaRepository,
  input: ExtractKnowledgeInput,
): Promise<ExtractionOutcome> {
  const graph = await repository.loadGraph(input.ideaId);

  if (!graph) {
    throw new InvalidNodeError("The idea does not exist.");
  }

  const existingByType = groupByType(graph);

  const proposals: ExtractedProposal[] = [];
  const skipped: SkippedDimension[] = [];

  for (const candidate of input.extraction.nodes) {
    const existing = existingByType.get(candidate.type) ?? [];

    const edited = existing.find((node) => node.source === "edited");

    if (edited) {
      // D3: what the user wrote by hand is never overwritten automatically.
      skipped.push({ type: candidate.type, reason: "already_edited" });
      continue;
    }

    const confirmed = existing.find(
      (node) => node.source === "confirmed",
    );

    if (confirmed) {
      // The dimension is already answered with validated knowledge. A new
      // proposal would be noise for the user to review.
      skipped.push({ type: candidate.type, reason: "already_answered" });
      continue;
    }

    // There is already a proposal waiting for the user. A second one for the
    // same dimension is noise: the extraction runs again, but it does not
    // stack questions the user has not answered yet (S9).
    const pending = existing.find((node) => node.source === "inferred");

    if (pending) {
      skipped.push({ type: candidate.type, reason: "pending_proposal" });
      continue;
    }

    const content = candidate.content.trim();

    if (content.length === 0) {
      skipped.push({ type: candidate.type, reason: "nothing_extracted" });
      continue;
    }

    const created = await repository.addNode({
      ideaId: input.ideaId,
      type: candidate.type,
      content,
      // D2: the extraction proposes, it never confirms.
      source: "inferred",
      messageId: lastUserMessageId(input.messages),
      confidence: candidate.confidence ?? null,
    });

    proposals.push({
      id: created.id,
      type: created.type,
      content: created.content,
      confidence: created.confidence,
    });
  }

  return { proposals, skipped };
}

/**
 * The message the proposals come from.
 *
 * It is the last thing the user said: that is where the knowledge is.
 */
function lastUserMessageId(
  messages: ExtractKnowledgeInput["messages"],
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role === "user") {
      return message.id;
    }
  }

  return null;
}

function groupByType(graph: IdeaGraph): Map<NodeType, IdeaNode[]> {
  const byType = new Map<NodeType, IdeaNode[]>();

  for (const node of graph.nodes) {
    const list = byType.get(node.type) ?? [];
    list.push(node);
    byType.set(node.type, list);
  }

  return byType;
}

/**
 * True when a node can be edited by hand.
 *
 * It is re-exported here so the UI of the confirmation panel has a single
 * place to ask.
 */
export { canTransition, isEditable };
