import { findGaps, type IdeaGraph, type NodeType } from "@bid/core";
import type { ChatMessage } from "@bid/core";
import type { CoachRequest } from "../ports/coach-model";

/**
 * How many recent messages are sent to the model.
 *
 * The model does not need the whole conversation to continue it, and sending
 * everything makes the cost grow with every turn. The graph of the idea carries
 * the durable knowledge; the messages carry the recent thread.
 */
export const CONTEXT_MESSAGE_LIMIT = 12;

/**
 * Builds what the model receives for one turn.
 *
 * The agenda is computed here, with `findGaps`, and not by the model: **what to
 * ask is a domain decision** (D6). The model only phrases it.
 */
export function buildCoachRequest(input: {
  readonly idea: IdeaGraph;
  readonly title: string;
  readonly messages: readonly ChatMessage[];
  readonly agenda: readonly NodeType[];
}): CoachRequest {
  return {
    idea: input.idea,
    title: input.title,
    messages: input.messages,
    agenda: input.agenda,
  };
}

/**
 * The dimensions the coach should ask about, in order.
 *
 * It is the same `findGaps` the card and the tree use, so the coach, the card
 * and the tree always agree about what is missing.
 */
export function coachAgenda(graph: IdeaGraph): NodeType[] {
  return findGaps(graph).map((gap) => gap.type);
}

/**
 * The system prompt of the coach.
 *
 * It states the rules the model must follow: it is a coach, not a generator of
 * business plans, it asks one question at a time, and it never invents facts
 * about the user's idea.
 */
export function buildSystemPrompt(title: string): string {
  return [
    `Sos un coach que ayuda a un emprendedor a cimentar su idea de negocio "${title}".`,
    "",
    "Reglas:",
    "- Hacés UNA pregunta por vez, sobre la dimensión que te indicamos.",
    "- Preguntás en español rioplatense, con tus palabras, corto.",
    "- No inventás datos de la idea: solo usás lo que ya está confirmado.",
    "- Si el usuario se desvía del tema, lo acompañás y volvés a la pregunta abierta.",
    "- No sos asesor legal, contable ni financiero.",
  ].join("\n");
}
