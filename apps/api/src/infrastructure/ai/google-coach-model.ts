import { streamText, type LanguageModel } from "ai";
import { google } from "@ai-sdk/google";

import type { CoachModel, CoachRequest } from "../../application/ports/coach-model";
import {
  buildProviderMessages,
  type ProviderMessage,
} from "./provider-coach-model";

/**
 * The coach backed by a real model provider.
 *
 * The provider SDK lives in this file and nowhere else. The rest of the
 * application only knows the `CoachModel` port, so swapping the provider is
 * one file.
 *
 * The model is configured through the environment:
 *
 * - `COACH_PROVIDER=live` turns this implementation on.
 * - `GOOGLE_GENERATIVE_AI_API_KEY` is the key.
 * - `COACH_MODEL` is the model id (default: a fast free-tier one).
 */
export class GoogleCoachModel implements CoachModel {
  constructor(
    private readonly model: LanguageModel = google(
      process.env.COACH_MODEL ?? "gemini-3.5-flash-lite",
    ),
  ) {}

  async *stream(input: CoachRequest): AsyncIterable<string> {
    const built = buildProviderMessages(systemPrompt(input), input);

    // The SDK refuses system messages inside `messages`: they go through
    // `instructions`, in the same order the builder produced them.
    const instructions = built
      .filter((message) => message.role === "system")
      .map((message) => ({ role: "system" as const, content: message.content }));
    const messages = built
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }));

    const result = streamText({
      model: this.model,
      instructions,
      messages,
      temperature: 0.7,
    });

    // `textStream` swallows provider errors and just ends empty. The full
    // stream carries them, and throwing is what lets the fallback answer
    // instead of a blank message (RF-72).
    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        yield part.text;
      } else if (part.type === "error") {
        throw part.error;
      }
    }
  }
}

/**
 * The system prompt sent to the provider.
 *
 * It is the same text the application uses to describe the rules, kept next to
 * the provider so both can evolve together.
 */
function systemPrompt(input: CoachRequest): string {
  return [
    `Sos un coach que ayuda a un emprendedor a cimentar su idea de negocio "${input.title}".`,
    "",
    "Reglas:",
    "- Hacés UNA pregunta por vez, sobre la dimensión que te indicamos.",
    "- Preguntás en español rioplatense, con tus palabras, corto.",
    "- No inventás datos de la idea: solo usás lo que ya está confirmado.",
    "- Si el usuario se desvía del tema, lo acompañás y volvés a la pregunta abierta.",
    "- No sos asesor legal, contable ni financiero.",
  ].join("\n");
}

/** The shape the AI SDK expects, re-exported for the tests. */
export type { ProviderMessage };
