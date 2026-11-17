import type { CoachModel, CoachRequest } from "../../application/ports/coach-model";

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

  const focus = input.agenda[0]
    ? `La siguiente dimensión a trabajar es "${input.agenda[0]}". Hacé UNA pregunta sobre ella.`
    : "La idea está completa. Preguntá si quiere empezar otra.";

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
    { role: "user", content: focus },
  ];
}
