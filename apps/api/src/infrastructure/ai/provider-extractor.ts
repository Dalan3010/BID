import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import type {
  ExtractionRequest,
  Extractor,
} from "../../application/ports/extractor";

/**
 * The extractor backed by a real model.
 *
 * The model is asked for strict JSON with a schema, and the answer is returned
 * **raw**: the validation happens at the boundary, in
 * `extraction-schema.ts`. This implementation does not decide what is valid.
 *
 * Enabled with `COACH_PROVIDER=live`; it needs
 * `GOOGLE_GENERATIVE_AI_API_KEY`.
 */
export class ProviderExtractor implements Extractor {
  constructor(
    private readonly modelId: string = process.env.EXTRACTOR_MODEL ??
      "gemini-2.5-flash-lite",
  ) {}

  async extract(input: ExtractionRequest): Promise<string> {
    const result = await generateText({
      model: google(this.modelId),
      system: buildExtractionPrompt(input.title),
      prompt: conversationAsPrompt(input),
      temperature: 0.2,
    });

    return result.text;
  }
}

/**
 * The conversation, as the text the extractor reads.
 */
function conversationAsPrompt(input: ExtractionRequest): string {
  return input.messages
    .filter((message) => message.role === "user")
    .map((message) => `- ${message.content}`)
    .join("\n");
}

/**
 * The instruction sent to the extractor.
 *
 * It asks for one proposal per dimension and nothing else: no prose, no
 * invention. A dimension the user did not mention is simply not in the answer.
 */
function buildExtractionPrompt(input: ExtractionRequest | string): string {
  const title = typeof input === "string" ? input : input.title;

  return [
    `Extraé el conocimiento de negocio de esta conversación sobre la idea "${title}".`,
    "",
    "Respondé SOLO con JSON válido, sin texto antes ni después:",
    '{ "nodes": [ { "type": "<dimensión>", "content": "<lo que dijo el usuario>", "confidence": <0-1> } ] }',
    "",
    "Las dimensiones posibles son: problem, segment, value_proposition, solution,",
    "channels, revenue, costs, competition, metrics, risks.",
    "",
    "Reglas:",
    "- Una propuesta por dimensión mentioned, como máximo.",
    "- El content es lo que dijo el usuario, reformulado en una frase clara.",
    "- Si el usuario no dijo nada de una dimensión, no la incluyas.",
    "- No inventes datos.",
  ].join("\n");
}
