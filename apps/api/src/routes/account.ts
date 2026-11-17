import { Hono } from "hono";

import { ideaRepository } from "../infrastructure/container";
import { requireUser } from "../lib/session";

/**
 * Everything under `/api/account`.
 *
 * The export is JSON rather than CSV because an idea is a graph: a flat table
 * would lose the provenance and the version history (RNF-07).
 */
export const account = new Hono();

account.get("/export", async (context) => {
  const user = await requireUser(context);
  const repository = ideaRepository();
  const ideas = await repository.listByOwner(user.id);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
    },
    ideas: await Promise.all(
      ideas.map(async (idea) => ({
        id: idea.id,
        title: idea.title,
        summary: idea.summary,
        createdAt: idea.createdAt,
        updatedAt: idea.updatedAt,
        graph: await repository.loadGraph(idea.id),
        versions: await repository.loadVersions(idea.id),
      })),
    ),
  };

  const filename = `bid-export-${payload.exportedAt.slice(0, 10)}.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
});
