import type { CoachModel, CoachRequest } from "../../application/ports/coach-model";
import { stepAlreadyRaised } from "../../application/ports/coach-model";

/**
 * The model that talks to a real provider.
 *
 * The provider is not decided yet, so this implementation is deliberately
 * thin: it builds the request for the provider SDK and returns its stream.
 * When the provider is chosen, only the body of `stream` changes.
 *
 * The important part is the shape of the answer: **the same `AsyncIterable`**
 * the rehearsal model returns. The application cannot tell them apart.
 */
export class ProviderCoachModel implements CoachModel {
  constructor(
    private readonly provider: ProviderClient,
    private readonly prompt: ProviderPromptBuilder,
  ) {}

  async *stream(input: CoachRequest): AsyncIterable<string> {
    const messages = this.prompt.build(input);

    for await (const chunk of this.provider.stream(messages)) {
      yield chunk;
    }
  }
}

/** What a provider client has to offer. */
export interface ProviderClient {
  /**
   * Sends the conversation and yields the answer as it is produced.
   *
   * The client is provider-agnostic on purpose: the SDK of the chosen provider
   * is wrapped behind this interface, in one place.
   */
  stream(
    messages: ProviderMessage[],
  ): AsyncIterable<string>;
}

/** One turn, in the shape every provider understands. */
export interface ProviderMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

/** Builds the messages sent to the provider. */
export interface ProviderPromptBuilder {
  build(input: CoachRequest): ProviderMessage[];
}

/**
 * The default prompt builder.
 *
 * It sends: the system prompt, the confirmed knowledge of the idea, the recent
 * conversation, and the instruction of which dimension to ask about.
 */
export function buildProviderMessages(
  systemPrompt: string,
  input: CoachRequest,
): ProviderMessage[] {
  const confirmed = input.idea.nodes
    .filter((node) => node.source === "confirmed" || node.source === "edited")
    .map((node) => `- ${node.content}`)
    .join("\n");

  const conversation: ProviderMessage[] = input.messages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  }));

  const confirmedBlock: ProviderMessage[] =
    confirmed.length > 0
      ? [
          {
            role: "system",
            content: `Lo que ya está confirmado de la idea:\n${confirmed}`,
          },
        ]
      : [];

  return [
    { role: "system", content: systemPrompt },
    ...confirmedBlock,
    ...conversation,
    { role: "user", content: focusFor(input) },
  ];
}

/**
 * The instruction that tells the coach what this turn is about.
 *
 * Three states, one rule (D6): the domain picks the subject — an open
 * dimension, the next arranque step, or the pivot into the arranque — and the
 * coach phrases exactly one question about it.
 */
function focusFor(input: CoachRequest): string {
  if (input.agenda[0]) {
    return `La siguiente dimensión a trabajar es "${input.agenda[0]}". Haz una sola pregunta sobre ella.`;
  }

  if (input.nextStep) {
    // Two states on the same step: the first turn asks about it; once the person
    // answered, the coach works it instead of repeating itself — that repetition
    // is what left the accompaniment frozen.
    if (stepAlreadyRaised(input)) {
      return `El paso del arranque es "${input.nextStep.title}" y ya lo hablaron: no repitas la pregunta. Responde a lo último que te dijo, dale un consejo concreto para darlo (si necesita datos reales, búscalos y cita los enlaces) y recuérdale en una frase que, cuando lo tenga, lo marque como hecho para pasar al siguiente.`;
    }

    return `El siguiente paso del arranque es "${input.nextStep.title}". Haz una sola pregunta que ayude a darlo, y si necesita datos reales, úsalos y cita los enlaces.`;
  }

  return "La idea está completa y todavía no hay pasos. Guiala al arranque: cuéntale que puedes proponerle los primeros pasos y que los acepta o descarta en «El arranque», de a uno.";
}
