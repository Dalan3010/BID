import type { ChatMessage } from "@bid/core";
import type { CoachModel } from "../ports/coach-model";
import type { MessageRepository } from "../ports/message-repository";
import type { IdeaRepository } from "../ports/idea-repository";
import { IdeaNotFoundError } from "../errors";
import {
  buildCoachRequest,
  CONTEXT_MESSAGE_LIMIT,
  coachAgenda,
} from "./build-coach-context";

export interface SendMessageInput {
  readonly ideaId: string;
  readonly ownerId: string;
  readonly content: string;
}

/**
 * The result of a turn.
 *
 * `reply` is the complete text, and `stream` yields it as it is produced. The
 * complete text is what gets stored; the stream is what the browser shows.
 */
export interface SendMessageResult {
  readonly reply: string;
  readonly stream: AsyncIterable<string>;
}

/**
 * Runs one turn of the conversation.
 *
 * The order matters:
 *
 * 1. The user's message is stored **before** the model is called. If the
 *    provider fails, the message is still there and the user can retry without
 *    losing the conversation (RF-25).
 * 2. The graph is loaded **for the owner**: another user's idea is not found.
 * 3. The agenda is computed with `findGaps`, the same projection the views use.
 */
export async function sendMessage(
  dependencies: {
    readonly ideas: IdeaRepository;
    readonly messages: MessageRepository;
    readonly model: CoachModel;
  },
  input: SendMessageInput,
): Promise<SendMessageResult> {
  const content = input.content.trim();

  if (content.length === 0) {
    throw new Error("A message needs content.");
  }

  const idea = await dependencies.ideas.findById(input.ideaId);

  if (!idea || idea.ownerId !== input.ownerId) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  // Stored first, so a provider failure does not swallow the user's turn.
  await dependencies.messages.add({
    ideaId: input.ideaId,
    role: "user",
    content,
  });

  const graph = (await dependencies.ideas.loadGraph(input.ideaId)) ?? {
    ideaId: input.ideaId,
    nodes: [],
  };

  const recent = await dependencies.messages.listRecent(
    input.ideaId,
    CONTEXT_MESSAGE_LIMIT,
  );

  const request = buildCoachRequest({
    idea: graph,
    title: idea.title,
    messages: recent,
    agenda: coachAgenda(graph),
  });

  const reply = await streamToText(
    dependencies.model.stream(request),
    async (text) => {
      await dependencies.messages.add({
        ideaId: input.ideaId,
        role: "assistant",
        content: text,
      });
    },
  );

  return { reply, stream: replay(reply) };
}

/**
 * Consumes a stream and stores the complete answer at the end.
 *
 * The assistant's message is stored once, with the whole text, and not chunk by
 * chunk: a half-written answer in the database is worse than none.
 */
async function streamToText(
  stream: AsyncIterable<string>,
  onComplete: (text: string) => Promise<void>,
): Promise<string> {
  let text = "";

  for await (const chunk of stream) {
    text += chunk;
  }

  await onComplete(text.trim());

  return text.trim();
}

/**
 * Replays a finished text as a stream, word by word.
 *
 * The answer is already computed when the route returns, so the browser gets
 * the same text in the same shape. The point of replaying it is that the client
 * code is the same in both cases: it reads a stream, it does not know whether
 * the words came from a model or from the local answer.
 *
 * The pause between words is what makes the answer arrive at a human pace.
 */
function replay(text: string): AsyncIterable<string> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const word of text.split(" ")) {
        yield `${word} `;
        await sleep(24);
      }
    },
  };
}

/** A pause, so the answer arrives at a human pace. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The conversation of one idea, oldest first. */
export async function listConversation(
  messages: MessageRepository,
  ideaId: string,
): Promise<ChatMessage[]> {
  return messages.listByIdea(ideaId);
}
