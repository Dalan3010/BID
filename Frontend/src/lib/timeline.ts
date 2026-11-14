/**
 * Projection: conversation + graph → a dated timeline of the idea.
 *
 * Rebuilt from the timestamps the API already returns:
 *
 * - every message (`createdAt`), from the person or the coach;
 * - every node's creation (`createdAt`) as "propuesto" when it came from the
 *   conversation (`messageId` set) or "añadido" otherwise;
 * - every validated node's last change (`updatedAt`) as "confirmado" or
 *   "escrito por ti".
 *
 * Limits, on purpose: this is **not** a version history (the API exposes no
 * versions endpoint). A discarded proposal no longer exists, so it cannot
 * appear; a node edited twice shows only its last change.
 */
import type { ChatMessage, IdeaNode, NodeType } from "@bid/core";

export type TimelineEvent =
  | {
      readonly kind: "message";
      readonly at: string;
      readonly id: string;
      readonly role: ChatMessage["role"];
      readonly excerpt: string;
    }
  | {
      readonly kind: "proposed" | "added" | "confirmed" | "edited";
      readonly at: string;
      readonly id: string;
      readonly type: NodeType;
      readonly content: string;
      readonly messageId: string | null;
    };

/** First `max` characters on one line, with an ellipsis when cut. */
export function excerpt(text: string, max = 140): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/** All events, oldest first. Ties keep messages before node events. */
export function buildTimeline(
  messages: readonly Pick<ChatMessage, "id" | "role" | "content" | "createdAt">[],
  nodes: readonly IdeaNode[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const message of messages) {
    if (message.role === "system") continue;
    events.push({
      kind: "message",
      at: message.createdAt,
      id: `m-${message.id}`,
      role: message.role,
      excerpt: excerpt(message.content),
    });
  }

  for (const node of nodes) {
    events.push({
      kind: node.messageId ? "proposed" : "added",
      at: node.createdAt,
      id: `c-${node.id}`,
      type: node.type,
      content: excerpt(node.content),
      messageId: node.messageId,
    });

    if (node.source !== "inferred") {
      events.push({
        kind: node.source === "edited" ? "edited" : "confirmed",
        at: node.updatedAt,
        id: `v-${node.id}`,
        type: node.type,
        content: excerpt(node.content),
        messageId: node.messageId,
      });
    }
  }

  const order = (event: TimelineEvent) => (event.kind === "message" ? 0 : 1);
  return events.sort((a, b) => a.at.localeCompare(b.at) || order(a) - order(b));
}
