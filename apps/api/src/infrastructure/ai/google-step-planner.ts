import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import type {
  PlanningRequest,
  StepPlanner,
} from "../../application/ports/step-planner";

/**
 * The step planner backed by a real model.
 *
 * Like the provider extractor, it asks for strict JSON and returns the answer
 * **raw**: the validation happens at the boundary, in
 * `step-proposal-schema.ts`. This implementation does not decide what is
 * valid.
 *
 * Enabled with `COACH_PROVIDER=live`; it needs
 * `GOOGLE_GENERATIVE_AI_API_KEY`.
 */
export class GoogleStepPlanner implements StepPlanner {
  constructor(
    private readonly modelId: string = process.env.EXTRACTOR_MODEL ??
      "gemini-3.5-flash-lite",
  ) {}

  async plan(input: PlanningRequest): Promise<string> {
    const result = await generateText({
      model: google(this.modelId),
      system: buildPlanningPrompt(input),
      prompt: confirmedAsPrompt(input),
      temperature: 0.2,
    });

    return result.text;
  }
}

/**
 * The instruction sent to the planner.
 *
 * It asks for one plan and nothing else: short concrete steps the person can
 * start this week, in the product voice, without inventing anything the
 * confirmed idea does not already have.
 */
export function buildPlanningPrompt(input: PlanningRequest | string): string {
  const title = typeof input === "string" ? input : input.title;

  return [
    `La idea "${title}" ya está validada en sus diez dimensiones y la persona está por arrancar.`,
    "",
    "Proponé los primeros pasos concretos para ponerla en marcha.",
    "",
    "Respondé SOLO con JSON válido, sin texto antes ni después:",
    '{ "steps": [ { "title": "<paso corto y concreto>", "detail": "<una frase de contexto>" } ] }',
    "",
    "Reglas:",
    "- Entre 3 y 6 pasos, ordenados: primero lo que desbloquea lo demás.",
    "- Cada paso es algo que la persona puede hacer esta semana.",
    "- Usa lo confirmado de la idea. No inventes datos que no estén.",
    "- Los pasos van en español neutro, de tú: son del negocio, no de la herramienta.",
  ].join("\n");
}

/** The confirmed knowledge of the idea, as the text the planner reads. */
function confirmedAsPrompt(input: PlanningRequest): string {
  const confirmed = input.idea.nodes
    .filter((node) => node.source === "confirmed" || node.source === "edited")
    .map((node) => `- ${node.content}`)
    .join("\n");

  return confirmed.length > 0
    ? `Lo que ya está confirmado de la idea:\n${confirmed}`
    : "La idea todavía no tiene conocimiento confirmado.";
}
