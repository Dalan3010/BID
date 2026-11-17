import type { ChatMessage } from "@bid/core";
import type { Extractor } from "../ports/extractor";
import type { MessageRepository } from "../ports/message-repository";
import type { IdeaRepository } from "../ports/idea-repository";
import { IdeaNotFoundError } from "../errors";
import { parseExtraction } from "../../infrastructure/ai/extraction-schema";
import {
  proposeExtractedNodes,
  type ExtractionOutcome,
} from "./propose-extracted-nodes";
import { CONTEXT_MESSAGE_LIMIT } from "./build-coach-context";

export interface ExtractKnowledgeResult {
  readonly outcome: ExtractionOutcome;
  /** True when the quota was reached and no extraction was attempted. */
  readonly quotaReached: boolean;
}

/**
 * Reads the conversation and proposes structure.
 *
 * The order is deliberate:
 *
 * 1. The idea is loaded **for the owner**: another user's idea is not found.
 * 2. The quota is checked **before** calling the model: the user is told, not
 *    left wondering (RF-24).
 * 3. The extractor runs and its answer is **validated**. Invalid output is
 *    discarded: nothing is proposed, and nothing is persisted (D6).
 * 4. The proposals are applied by the domain, which decides what can be
 *    overwritten (D3).
 */
export async function extractKnowledge(
  dependencies: {
    readonly ideas: IdeaRepository;
    readonly messages: MessageRepository;
    readonly extractor: Extractor;
    readonly quota: UsageQuota;
  },
  input: {
    readonly ideaId: string;
    readonly ownerId: string;
  },
): Promise<ExtractKnowledgeResult> {
  const idea = await dependencies.ideas.findById(input.ideaId);

  if (!idea || idea.ownerId !== input.ownerId) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  const quotaReached = !(await dependencies.quota.canConsume(input.ownerId));

  if (quotaReached) {
    return { outcome: { proposals: [], skipped: [] }, quotaReached: true };
  }

  const conversation = await dependencies.messages.listRecent(
    input.ideaId,
    CONTEXT_MESSAGE_LIMIT,
  );

  // Nothing the user said means nothing to extract. This is what keeps the
  // extraction from running on every single message (S9).
  if (!hasUserContent(conversation)) {
    return { outcome: { proposals: [], skipped: [] }, quotaReached: false };
  }

  const graph = (await dependencies.ideas.loadGraph(input.ideaId)) ?? {
    ideaId: input.ideaId,
    nodes: [],
  };

  const raw = await dependencies.extractor.extract({
    idea: graph,
    title: idea.title,
    messages: conversation,
  });

  await dependencies.quota.consume(input.ownerId);

  const extraction = parseExtraction(raw);

  if (!extraction) {
    // The model answered something that is not a valid extraction. Nothing is
    // persisted: a broken answer is not a proposal.
    return { outcome: { proposals: [], skipped: [] }, quotaReached: false };
  }

  const outcome = await proposeExtractedNodes(dependencies.ideas, {
    ideaId: input.ideaId,
    ownerId: input.ownerId,
    messages: conversation.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    })),
    extraction,
  });

  return { outcome, quotaReached: false };
}

/** True when the user said something worth extracting. */
function hasUserContent(messages: readonly ChatMessage[]): boolean {
  return messages.some(
    (message) => message.role === "user" && message.content.trim().length > 0,
  );
}

/**
 * Port: how many model calls a user may still make.
 *
 * It is a port because the quota can live in the database, in memory or in a
 * service, and the use case does not care.
 */
export interface UsageQuota {
  /** False when the user reached the limit. */
  canConsume(userId: string): Promise<boolean>;
  /** Counts one call. */
  consume(userId: string): Promise<void>;
}
