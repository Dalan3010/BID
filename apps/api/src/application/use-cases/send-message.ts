import type { ArranqueStep, ChatMessage } from "@bid/core";
import { nextStep as nextOpenStep } from "@bid/core";
import type { CoachModel } from "../ports/coach-model";
import type { MessageRepository } from "../ports/message-repository";
import type { IdeaRepository } from "../ports/idea-repository";
import type { ArranqueStepRepository } from "../ports/arranque-step-repository";
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
 * 1b. The **first chunk** is awaited before answering: a model that fails
 *    immediately still becomes an honest 502, while the rest of the answer
 *    streams as it is written instead of arriving all at once at the end.
 * 2. The graph is loaded **for the owner**: another user's idea is not found.
 * 3. The agenda is computed with `findGaps`, the same projection the views use.
 */
export async function sendMessage(
  dependencies: {
    readonly ideas: IdeaRepository;
    readonly messages: MessageRepository;
    readonly model: CoachModel;
    readonly steps: ArranqueStepRepository;
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

  const agenda = coachAgenda(graph);

  // When the ten dimensions are validated, the coach's subject is the next
  // open step of the arranque (D6: the domain decides what to work on next,
  // the coach only phrases it — and grounds it in the web when it helps).
  const nextStep: ArranqueStep | undefined =
    agenda.length === 0
      ? nextOpenStep(await dependencies.steps.listByIdea(input.ideaId)) ??
        undefined
      : undefined;

  const request = buildCoachRequest({
    idea: graph,
    title: idea.title,
    messages: recent,
    agenda,
    nextStep,
  });

  const source = dependencies.model.stream(request)[Symbol.asyncIterator]();

  // The first chunk decides between "the model failed" (a clean 502 before any
  // byte was sent) and "the answer is on its way".
  const first = await source.next();

  return {
    stream: store(
      dependencies.messages,
      input.ideaId,
      first,
      source,
    ),
  };
}

/**
 * Passes the answer through while it is written, and stores it at the end.
 *
 * Streaming is the whole point: a grounded turn — the model searching the web
 * before answering — takes several seconds, and buffering them left the person
 * looking at a still screen. The assistant's message is still stored **once**,
 * with the complete text: a half-written answer in the database is worse than
 * none (RF-25).
 */
async function* store(
  messages: MessageRepository,
  ideaId: string,
  first: IteratorResult<string>,
  source: AsyncIterator<string>,
): AsyncIterable<string> {
  let text = "";

  for (let step = first; !step.done; step = await source.next()) {
    text += step.value;
    yield step.value;
  }

  await messages.add({ ideaId, role: "assistant", content: text.trim() });
}

/** The conversation of one idea, oldest first. */
export async function listConversation(
  messages: MessageRepository,
  ideaId: string,
): Promise<ChatMessage[]> {
  return messages.listByIdea(ideaId);
}
