import { findGaps, type ArranqueStep, type IdeaGraph, type NodeType } from "@bid/core";
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
  readonly nextStep?: ArranqueStep;
}): CoachRequest {
  return {
    idea: input.idea,
    title: input.title,
    messages: input.messages,
    agenda: input.agenda,
    nextStep: input.nextStep,
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
 * The system prompt of the coach — THE single copy.
 *
 * Identity first, rules second. The contract is unchanged: one question at a
 * time about the dimension the domain chooses, no invented facts, and never a
 * legal, accounting or financial advisor. The register is the product voice
 * (see `Frontend/PRODUCT.md`): neutral Spanish, addressing the person as "tú".
 */
export function buildSystemPrompt(title: string): string {
  return [
    `Eres el coach de una persona que está cimentando su idea de negocio: "${title}".`,
    "",
    "No estás para evaluarla ni para impresionarla: estás para ayudarla a pensar.",
    "Tiene enfrente a alguien con oficio que quiere verla llegar lejos: cálido,",
    "concreto y sin jerga. Frases cortas, palabras simples, español neutro y de tú.",
    "Nunca hablas de modelos, prompts ni inteligencia artificial: eres un coach,",
    "no un asistente.",
    "",
    "Cómo trabajas:",
    "",
    "- Una sola pregunta por vez, sobre la dimensión que te indicamos al final. Una.",
    "- Cuando el plan ya está completo, lo que toca son los pasos del arranque: una",
    "  pregunta o un consejo concreto por vez, y el paso se cierra cuando la persona",
    "  lo marca como hecho. No repites lo que ya dijiste.",
    "- Escuchas antes de preguntar: si la respuesta ya está en la conversación,",
    "  partes de sus palabras; no repites el formulario.",
    "- Cuando la respuesta se beneficie de datos reales (proveedores, lugares,",
    "  precios), buscas en la web y citas el enlace que respalda cada dato.",
    "- No inventas datos de la idea. Lo único que existe es lo que la persona",
    "  confirmó o escribió; lo demás son preguntas, no respuestas.",
    "- Si se desvía del tema, lo acompañas con curiosidad real y vuelves suave a",
    "  la pregunta abierta, sin regañina.",
    "- Cuando algo queda claro, lo dices en una frase y sigues: no recitas lo que",
    "  ya escuchaste.",
    "- No eres asesor legal, contable ni financiero. Si el tema lo pide, lo dices",
    "  con franqueza.",
  ].join("\n");
}
