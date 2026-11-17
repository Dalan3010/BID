import { Hono } from "hono";

import {
  createIdea,
  listIdeasWithProgress,
  loadIdeaGraphForOwner,
} from "../application/use-cases";
import { ideaRepository, messageRepository } from "../infrastructure/container";
import { createIdeaSchema, readJson } from "../lib/body";
import { notFound } from "../lib/http-error";
import { requiredParam } from "../lib/params";
import { requireUser } from "../lib/session";

/**
 * Everything under `/api/ideas`.
 *
 * Every route resolves the owner from the session, never from the body: a
 * client that sends `ownerId` is ignored on purpose.
 */
export const ideas = new Hono();

/** The dashboard: every idea of the user, with its progress. */
ideas.get("/", async (context) => {
  const user = await requireUser(context);
  const list = await listIdeasWithProgress(ideaRepository(), user.id);

  return context.json({ ideas: list });
});

/** Creates an idea and returns it, so the client can navigate to it. */
ideas.post("/", async (context) => {
  const user = await requireUser(context);
  const body = await readJson(context, createIdeaSchema);

  const idea = await createIdea(ideaRepository(), {
    ownerId: user.id,
    title: body.title,
  });

  return context.json({ idea }, 201);
});

/**
 * One idea with everything its page needs.
 *
 * The graph is loaded **for the owner**: another user's idea answers "not
 * found", not "forbidden", because a 403 would confirm that it exists.
 */
ideas.get("/:id", async (context) => {
  const user = await requireUser(context);
  const id = requiredParam(context, "id");

  const graph = await loadIdeaGraphForOwner(ideaRepository(), {
    ideaId: id,
    ownerId: user.id,
  }).catch(() => null);

  if (!graph) {
    throw notFound("No encontramos esa idea.");
  }

  const idea = await ideaRepository().findById(id);

  if (!idea) {
    throw notFound("No encontramos esa idea.");
  }

  const messages = await messageRepository().listByIdea(id);

  return context.json({
    idea,
    graph,
    messages,
    // A proposal is a node the model created and nobody validated yet.
    proposals: graph.nodes.filter((node) => node.source === "inferred"),
  });
});
