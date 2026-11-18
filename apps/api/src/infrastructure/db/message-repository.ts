import { asc, desc, eq } from "drizzle-orm";

import type {
  MessageRepository,
} from "../../application/ports/message-repository";
import type { ChatMessage, NewChatMessage } from "@bid/core";
import { getDatabase, type Database } from "../db/client";
import { messages } from "../db/schema";

/**
 * Postgres implementation of `MessageRepository`.
 *
 * The messages of one idea are ordered by creation time, so the conversation
 * always reads in the order it happened.
 */
export class DrizzleMessageRepository implements MessageRepository {
  constructor(private readonly db: Database = getDatabase()) {}

  async listByIdea(ideaId: string): Promise<ChatMessage[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.ideaId, ideaId))
      .orderBy(asc(messages.createdAt));

    return rows.map(toChatMessage);
  }

  async listRecent(ideaId: string, limit: number): Promise<ChatMessage[]> {
    // "Recent" means the newest ones, so the query has to sort descending to
    // make LIMIT cut the old turns instead of the new ones. Ascending + LIMIT
    // would return the *first* messages of the conversation forever once it
    // grows past the limit: the coach and the extractor would never see what
    // the user just said, and the agenda would stay stuck on the same
    // dimension. The rows are reversed afterwards so callers still read the
    // conversation oldest-first, like `listByIdea`.
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.ideaId, ideaId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return rows.reverse().map(toChatMessage);
  }

  async add(message: NewChatMessage): Promise<ChatMessage> {
    const [row] = await this.db
      .insert(messages)
      .values({
        ideaId: message.ideaId,
        role: message.role,
        content: message.content,
      })
      .returning();

    return toChatMessage(row);
  }

  async clear(ideaId: string): Promise<void> {
    await this.db.delete(messages).where(eq(messages.ideaId, ideaId));
  }
}

function toChatMessage(row: typeof messages.$inferSelect): ChatMessage {
  return {
    id: row.id,
    ideaId: row.ideaId,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}
