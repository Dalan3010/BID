import { z } from "zod";

import { NODE_TYPES } from "@bid/core";

import { unwrapJson } from "./json";

/**
 * The schema of what the extractor returns.
 *
 * This is the boundary of the model: **nothing enters the domain without
 * passing through here**. A malformed response is discarded, not repaired and
 * not partially applied (D6).
 */
export const extractedNodeSchema = z.object({
  /** Which dimension of the idea this knowledge belongs to. */
  type: z.enum(NODE_TYPES),
  /** What the user said, in the model's words. */
  content: z.string().min(1).max(600),
  /**
   * How sure the model is, from 0 to 1.
   *
   * It is the model's confidence, not the user's: it disappears when the node
   * is confirmed.
   */
  confidence: z.number().min(0).max(1).optional(),
});

/** The whole extraction: a list of proposals. */
export const extractionSchema = z.object({
  nodes: z.array(extractedNodeSchema).max(6),
});

export type ExtractedNode = z.infer<typeof extractedNodeSchema>;
export type Extraction = z.infer<typeof extractionSchema>;

/**
 * Parses whatever the model returned.
 *
 * The model is asked for JSON, but models are models: it can wrap the JSON in
 * a code fence, add prose around it, or return something that is not JSON at
 * all. The tolerant read here is a **boundary** decision, not a convenience:
 * what reaches the domain is always a validated object.
 */
export function parseExtraction(raw: string): Extraction | null {
  const candidate = unwrapJson(raw);

  if (candidate === null) {
    return null;
  }

  const parsed = extractionSchema.safeParse(candidate);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}
