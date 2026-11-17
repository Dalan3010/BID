import type { Context } from "hono";

import { extractKnowledge } from "../application/use-cases";
import {
  extractor,
  ideaRepository,
  messageRepository,
  usageQuota,
} from "../infrastructure/container";
import { statusFor } from "../lib/errors";
import { HttpError } from "../lib/http-error";
import { requiredParam } from "../lib/params";
import { requireUser } from "../lib/session";

/**
 * Reads the conversation and proposes structure.
 *
 * It is a **separate call** from the chat, on purpose: conversing and
 * extracting are two different works (D6). The extraction runs after the coach
 * answered, and its failure does not break the conversation.
 */
export async function postExtraction(context: Context): Promise<Response> {
  const user = await requireUser(context);
  const ideaId = requiredParam(context, "id");

  try {
    const result = await extractKnowledge(
      {
        ideas: ideaRepository(),
        messages: messageRepository(),
        extractor: extractor(),
        quota: usageQuota(),
      },
      { ideaId, ownerId: user.id },
    );

    if (result.quotaReached) {
      // RF-24: the limit is announced, not silently applied.
      return context.json(
        {
          quotaReached: true,
          proposals: [],
          message:
            "Llegaste al límite de extracciones disponibles. Podés seguir conversando normalmente.",
        },
        429,
      );
    }

    return context.json({
      quotaReached: false,
      proposals: result.outcome.proposals,
    });
  } catch (error) {
    if (statusFor(error) !== null) {
      throw error;
    }

    console.error("[extract] the extraction failed:", error);

    throw new HttpError(
      502,
      "No pudimos extraer estructura de la conversación. Podés seguir conversando: los nodos quedan como estaban.",
    );
  }
}
