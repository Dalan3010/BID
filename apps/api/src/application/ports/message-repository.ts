import type { ChatMessage, NewChatMessage } from "@bid/core";

/**
 * Port: persistence of the conversation.
 *
 * It is separate from `IdeaRepository` on purpose: an idea is a graph that gets
 * versioned, while messages are appended and never edited. Two aggregates, two
 * lifecycles, two ports.
 *
 * @see docs/arquitectura.md, "Capas"
 */
export interface MessageRepository {
  /** Messages of one idea, oldest first. */
  listByIdea(ideaId: string): Promise<ChatMessage[]>;

  /**
   * The last `limit` messages, oldest first.
   *
   * The model never sees the whole conversation: only the tail that fits in
   * the context window.
   */
  listRecent(ideaId: string, limit: number): Promise<ChatMessage[]>;

  add(message: NewChatMessage): Promise<ChatMessage>;

  /** Removes every message of one idea. */
  clear(ideaId: string): Promise<void>;
}
