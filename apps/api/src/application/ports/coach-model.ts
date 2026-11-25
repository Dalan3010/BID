import type { ArranqueStep, IdeaGraph } from "@bid/core";
import type { ChatMessage } from "@bid/core";

/**
 * Port: the model that talks with the user.
 *
 * The application asks for "the next thing the coach says" and receives a
 * stream of text. It does not know whether that text comes from a hosted model,
 * from a local script or from a person writing the rehearsal lines.
 *
 * Two implementations ship with the project: one that talks to a provider and
 * one that replays scripted answers. Both are interchangeable (S2).
 */
export interface CoachModel {
  /**
   * Generates the coach's reply, token by token.
   *
   * The returned stream yields the text as it is produced, so the browser can
   * show it while it arrives.
   */
  stream(input: CoachRequest): AsyncIterable<string>;
}

/** Everything the model needs to answer one turn. */
export interface CoachRequest {
  /** The idea the conversation is about. */
  readonly idea: IdeaGraph;
  /** The title of the idea. */
  readonly title: string;
  /** The recent conversation, oldest first. The last one is the user's turn. */
  readonly messages: readonly ChatMessage[];
  /**
   * The dimensions that are still open, in the order the coach should ask
   * about them.
   *
   * The agenda is decided by the domain, not by the model (D6): the model only
   * phrases the question.
   */
  readonly agenda: readonly string[];
  /**
   * The next open step of the arranque, when the ten dimensions are validated
   * and the person is working the steps.
   *
   * Same rule as the agenda (D6): the domain decides what to work on next;
   * the coach only phrases it — and, when it helps, grounds it in the web.
   */
  readonly nextStep?: ArranqueStep;
}

/**
 * Whether the person already spoke after the current step was created.
 *
 * The last message of the context is always the turn being answered, so it does
 * not count: the step is "already raised" only when an earlier user message
 * exists that postdates it. It is the domain's answer to a real failure — once
 * the plan was complete, every turn repeated the same question about the same
 * step, because nothing in the conversation ever moved it (D6 applies here too:
 * the state decides, the coach only phrases).
 */
export function stepAlreadyRaised(input: CoachRequest): boolean {
  const step = input.nextStep;

  if (!step) return false;

  return input.messages
    .slice(0, -1)
    .some((message) => message.role === "user" && message.createdAt > step.createdAt);
}
