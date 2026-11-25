import type { Context } from "hono";

import { sendMessage } from "../application/use-cases";
import {
  arranqueStepRepository,
  coachModel,
  ideaRepository,
  messageRepository,
} from "../infrastructure/container";
import { messageSchema, readJson } from "../lib/body";
import { HttpError } from "../lib/http-error";
import { statusFor } from "../lib/errors";
import { requiredParam } from "../lib/params";
import { requireUser } from "../lib/session";

/**
 * One turn of the conversation.
 *
 * The answer is streamed as plain text, so the browser shows the tokens as they
 * arrive instead of waiting for the whole answer. The stream is the **whole
 * answer**, already computed: the use case stores it and returns it, which
 * keeps the failure path simple.
 */
export async function postMessage(context: Context): Promise<Response> {
  const user = await requireUser(context);
  const ideaId = requiredParam(context, "id");
  const body = await readJson(context, messageSchema);

  try {
    const result = await sendMessage(
      {
        ideas: ideaRepository(),
        messages: messageRepository(),
        model: coachModel(),
        steps: arranqueStepRepository(),
      },
      { ideaId, ownerId: user.id, content: body.content },
    );

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            controller.enqueue(encoder.encode(chunk));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        // No proxy may buffer this: buffering would defeat the streaming.
        "x-accel-buffering": "no",
      },
    });
  } catch (error) {
    const status = statusFor(error);

    if (status !== null) {
      throw error;
    }

    // RF-25: the failure is visible and the conversation is intact, because the
    // user's message was stored before the model was called.
    console.error("[chat] the model failed:", error);

    throw new HttpError(
      502,
      "No pudimos responder en este momento. Tu mensaje quedó guardado: reintentá.",
    );
  }
}
