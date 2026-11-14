/**
 * Who said a message in the conversation with the coach.
 *
 * The same three values the database accepts, declared here so the domain does
 * not depend on the schema.
 */
export type MessageRole = "user" | "assistant" | "system";

/** One message in the conversation about an idea. */
export interface ChatMessage {
  readonly id: string;
  readonly ideaId: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly createdAt: string;
}

/** A message that has not been stored yet. */
export interface NewChatMessage {
  readonly ideaId: string;
  readonly role: MessageRole;
  readonly content: string;
}
