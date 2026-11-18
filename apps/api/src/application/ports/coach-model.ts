import type { IdeaGraph } from "@bid/core";
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
}
