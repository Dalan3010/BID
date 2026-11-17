import type { ChatMessage, NewChatMessage } from "@bid/core";
import type { MessageRepository } from "../ports/message-repository";

/**
 * In-memory `MessageRepository` for tests.
 *
 * Same reasoning as the in-memory idea repository: if the use cases needed
 * Postgres, the layer would not be decoupled.
 */
export class InMemoryMessageRepository implements MessageRepository {
  private readonly byIdea = new Map<string, ChatMessage[]>();
  private counter = 0;

  async listByIdea(ideaId: string): Promise<ChatMessage[]> {
    return [...(this.byIdea.get(ideaId) ?? [])];
  }

  async listRecent(ideaId: string, limit: number): Promise<ChatMessage[]> {
    const list = this.byIdea.get(ideaId) ?? [];

    return list.slice(Math.max(0, list.length - limit));
  }

  async add(message: NewChatMessage): Promise<ChatMessage> {
    this.counter += 1;

    const stored: ChatMessage = {
      id: `message-${this.counter}`,
      ideaId: message.ideaId,
      role: message.role,
      content: message.content,
      createdAt: new Date().toISOString(),
    };

    const list = this.byIdea.get(message.ideaId) ?? [];
    list.push(stored);
    this.byIdea.set(message.ideaId, list);

    return stored;
  }

  async clear(ideaId: string): Promise<void> {
    this.byIdea.delete(ideaId);
  }
}
