import type { Context } from "hono";

import { diffIdeaVersion, listIdeaVersions } from "../application/use-cases";
import { ideaRepository } from "../infrastructure/container";
import { optionalIntQuery, requiredIntParam, requiredParam } from "../lib/params";
import { requireUser } from "../lib/session";

/**
 * Version history of an idea.
 *
 * A version is a snapshot of the graph, so the list is cheap and the diff is
 * computed on demand. The owner comes from the session: a stranger's versions
 * answer 404, the same as a version that never existed.
 */

/** Every snapshot of the idea, newest first. */
export async function getVersions(context: Context): Promise<Response> {
  const user = await requireUser(context);
  const ideaId = requiredParam(context, "id");

  const versions = await listIdeaVersions(ideaRepository(), {
    ideaId,
    ownerId: user.id,
  });

  return context.json({ versions });
}

/** What changed between one version and another one of the same idea. */
export async function getVersionDiff(context: Context): Promise<Response> {
  const user = await requireUser(context);
  const ideaId = requiredParam(context, "id");
  const version = requiredIntParam(context, "version");
  const against = optionalIntQuery(context, "against");

  const diff = await diffIdeaVersion(ideaRepository(), {
    ideaId,
    ownerId: user.id,
    version,
    against,
  });

  return context.json({ diff });
}
