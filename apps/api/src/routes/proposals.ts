import type { Context } from "hono";

import { resolveProposal } from "../application/use-cases";
import { ideaRepository } from "../infrastructure/container";
import { proposalSchema, readJson } from "../lib/body";
import { notFound } from "../lib/http-error";
import { requiredParam } from "../lib/params";
import { requireUser } from "../lib/session";

/**
 * The user resolves a proposal: accept, correct or discard.
 *
 * This is the only path that turns a proposal into knowledge, and it is always
 * the user who takes it (D2, RF-23). The owner is checked before anything is
 * written, so a proposal of somebody else's idea does not exist.
 */
export async function postProposal(context: Context): Promise<Response> {
  const user = await requireUser(context);
  const ideaId = requiredParam(context, "id");
  const nodeId = requiredParam(context, "nodeId");
  const body = await readJson(context, proposalSchema);

  const repository = ideaRepository();
  const idea = await repository.findById(ideaId);

  if (!idea || idea.ownerId !== user.id) {
    throw notFound("No encontramos esa idea.");
  }

  const result = await resolveProposal(repository, {
    ideaId,
    nodeId,
    decision: body.decision,
    content: body.content,
  });

  return context.json({ source: result.source, node: result.node });
}
