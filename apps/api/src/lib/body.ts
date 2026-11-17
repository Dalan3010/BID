import type { Context } from "hono";
import { z } from "zod";

import { badRequest } from "./http-error";

/**
 * The shapes the API accepts.
 *
 * They are validated at the edge, before a use case runs: a malformed body is a
 * transport problem, not a domain one.
 */

export const createIdeaSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export const messageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

export const proposalSchema = z.object({
  decision: z.enum(["accept", "correct", "discard"]),
  /** Only meaningful when the decision is `correct`. */
  content: z.string().trim().max(2000).optional(),
});

/**
 * Reads and validates a JSON body.
 *
 * `context.req.json()` throws on malformed JSON; both failures answer the same
 * 400, because the client cannot do anything different with the distinction.
 */
export async function readJson<T>(
  context: Context,
  schema: z.ZodType<T>,
): Promise<T> {
  let raw: unknown;

  try {
    raw = await context.req.json();
  } catch {
    throw badRequest("Cuerpo inválido.");
  }

  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    throw badRequest("Cuerpo inválido.");
  }

  return parsed.data;
}
