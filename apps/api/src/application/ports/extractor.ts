import type { ChatMessage } from "@bid/core";
import type { IdeaGraph } from "@bid/core";

/**
 * Port: the extractor.
 *
 * It is a **separate work** from the conversation (D6): another call, another
 * model, another cost. The chat answers the user; the extractor proposes
 * structure.
 *
 * What it returns is **unvalidated text**. The validation lives in
 * `infrastructure/ai/extraction-schema.ts`, because it is a boundary concern:
 * the application receives an already-validated object or nothing.
 */
export interface Extractor {
  /**
   * Proposes the knowledge that the conversation contains.
   *
   * The result is a JSON string, not an object: the contract of the port is
   * "give me what the model said", and the parsing happens on the other side of
   * the boundary.
   */
  extract(input: ExtractionRequest): Promise<string>;
}

/** What the extractor needs to do its job. */
export interface ExtractionRequest {
  /** The idea the conversation is about. */
  readonly idea: IdeaGraph;
  /** The title of the idea. */
  readonly title: string;
  /** The conversation, oldest first. */
  readonly messages: readonly ChatMessage[];
}
