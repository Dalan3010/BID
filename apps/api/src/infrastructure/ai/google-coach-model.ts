import { stepCountIs, streamText, type LanguageModel } from "ai";
import { google } from "@ai-sdk/google";

import { buildSystemPrompt } from "../../application/use-cases/build-coach-context";
import type { CoachModel, CoachRequest } from "../../application/ports/coach-model";
import type { WebSearch } from "../../application/ports/web-search";
import {
  buildProviderMessages,
  type ProviderMessage,
} from "./provider-coach-model";
import { createWebSearchTool } from "./web-search-tool";

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
 *
 * The research tool is decided by the caller: when a `WebSearch` is given, the
 * model searches through it; without one, it keeps the provider's built-in
 * Google Search grounding. The switch exists because grounding has its own
 * quota — a paid tier — while our own search does not (D-B).
 */
export class GoogleCoachModel implements CoachModel {
  constructor(
    private readonly model: LanguageModel = google(
      process.env.COACH_MODEL ?? "gemini-3.5-flash-lite",
    ),
    private readonly webSearch?: WebSearch,
  ) {}

  async *stream(input: CoachRequest): AsyncIterable<string> {
    const built = buildProviderMessages(buildSystemPrompt(input.title), input);

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

    // Grounded answers (S3): when a reply benefits from real data — a
    // supplier, a place, a market price — the coach may search the web, and
    // the sources arrive with the answer so it can cite them inline.
    const search = this.searchTools();

    let sent = "";

    try {
      for await (const chunk of this.answer(
        instructions,
        messages,
        search.tools,
        search.stopWhen,
      )) {
        sent += chunk;
        yield chunk;
      }
    } catch (error) {
      // The search has its own quota, separate from the model's: a grounded
      // call can fail while the model is perfectly healthy. Losing the whole
      // answer because of that leaves the person reading the script instead
      // of talking to the model — the failure that froze the chat. So an
      // answer that has not started is retried once **without any tool**, for
      // both search configurations: the sources are lost, the conversation is
      // not.
      if (sent.length > 0) throw error;
    }

    if (sent.length > 0) return;

    // A step that only called the tool can end without a word: the stream is
    // closed and nothing was said. That is not an answer either, so it takes
    // the same road as a failed call.
    for await (const chunk of this.answer(instructions, messages)) {
      yield chunk;
    }
  }

  /**
   * The research tool this call travels with.
   *
   * Our own search wins when the caller configured one. Otherwise the
   * provider's grounding stays, exactly as before.
   */
  private searchTools(): {
    tools: NonNullable<Parameters<typeof streamText>[0]["tools"]>;
    stopWhen?: Parameters<typeof streamText>[0]["stopWhen"];
  } {
    if (!this.webSearch) {
      return { tools: { google_search: google.tools.googleSearch({}) } };
    }

    const webSearch = this.webSearch;

    return {
      tools: { web_search: createWebSearchTool(webSearch) },
      // The tool is only useful if the model gets a second turn to answer
      // with what it found: one step calls the tool, the next one speaks.
      stopWhen: stepCountIs(3),
    };
  }

  /**
   * One call to the provider, with or without the search tool.
   *
   * `textStream` swallows provider errors and just ends empty. The full stream
   * carries them, and throwing is what lets the caller decide: retry without
   * grounding, or fall back to the script (RF-72).
   */
  private async *answer(
    instructions: { role: "system"; content: string }[],
    messages: { role: "user" | "assistant"; content: string }[],
    tools?: Parameters<typeof streamText>[0]["tools"],
    stopWhen?: Parameters<typeof streamText>[0]["stopWhen"],
  ): AsyncIterable<string> {
    const result = streamText({
      model: this.model,
      instructions,
      messages,
      ...(tools ? { tools } : {}),
      ...(stopWhen ? { stopWhen } : {}),
      temperature: 0.7,
    });

    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        yield part.text;
      } else if (part.type === "error") {
        throw part.error;
      }
    }
  }
}

/** The shape the AI SDK expects, re-exported for the tests. */
export type { ProviderMessage };
