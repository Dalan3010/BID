import type { Context } from "hono";

import { createManualNode, editNode } from "../application/use-cases";
import { ideaRepository } from "../infrastructure/container";
import { createNodeSchema, editNodeSchema, readJson } from "../lib/body";
import { requiredParam } from "../lib/params";
import { requireUser } from "../lib/session";

/**
 * Manual authoring of the plan.
 *
 * Both handlers resolve the owner from the session. Whether a dimension is
 * empty, whether the node can be edited and whether a version has to be
 * snapshotted are decisions of the use cases; the route only transports.
 */

/** Answers an empty dimension without AI. */
export async function postNode(context: Context): Promise<Response> {
  const user = await requireUser(context);
  const ideaId = requiredParam(context, "id");
  const body = await readJson(context, createNodeSchema);

  const node = await createManualNode(ideaRepository(), {
    ideaId,
    ownerId: user.id,
    type: body.type,
    content: body.content,
  });

  return context.json({ node }, 201);
}

/** Rewrites a validated node by hand. */
export async function patchNode(context: Context): Promise<Response> {
  const user = await requireUser(context);
  const ideaId = requiredParam(context, "id");
  const nodeId = requiredParam(context, "nodeId");
  const body = await readJson(context, editNodeSchema);

  const node = await editNode(ideaRepository(), {
    ideaId,
    nodeId,
    ownerId: user.id,
    content: body.content,
  });

  return context.json({ node });
}
