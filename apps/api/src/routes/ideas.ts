import { Hono } from "hono";

import {
  createIdea,
  deleteIdea,
  listConversation,
  listIdeasWithProgress,
  loadIdeaGraphForOwner,
  updateIdea,
} from "../application/use-cases";
import { ideaRepository, messageRepository } from "../infrastructure/container";
import {
  createIdeaSchema,
  readJson,
  updateIdeaSchema,
} from "../lib/body";
import { notFound } from "../lib/http-error";
import { requiredParam } from "../lib/params";
import { requireUser } from "../lib/session";
import { postExtraction } from "./extractions";
import { postMessage } from "./messages";
import { patchNode, postNode } from "./nodes";
import { postProposal } from "./proposals";
import {
  getSteps,
  patchStep,
  postStepProposals,
  postSteps,
} from "./steps";
import { getVersionDiff, getVersions } from "./versions";

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

  const messages = await listConversation(messageRepository(), id);

  return context.json({
    idea,
    graph,
    messages,
    // A proposal is a node the model created and nobody validated yet.
    proposals: graph.nodes.filter((node) => node.source === "inferred"),
  });
});

/** Renames the idea or rewrites its summary; never touches the graph. */
ideas.patch("/:id", async (context) => {
  const user = await requireUser(context);
  const id = requiredParam(context, "id");
  const body = await readJson(context, updateIdeaSchema);

  const idea = await updateIdea(ideaRepository(), {
    ideaId: id,
    ownerId: user.id,
    title: body.title,
    summary: body.summary,
  });

  return context.json({ idea });
});

/** Deletes the idea and everything hanging from it. */
ideas.delete("/:id", async (context) => {
  const user = await requireUser(context);
  const id = requiredParam(context, "id");

  await deleteIdea(ideaRepository(), { ideaId: id, ownerId: user.id });

  return context.body(null, 204);
});

/** Manual authoring: answers an empty dimension, rewrites a validated node. */
ideas.post("/:id/nodes", postNode);
ideas.patch("/:id/nodes/:nodeId", patchNode);

/** History: the snapshots and the difference between two of them. */
ideas.get("/:id/versions", getVersions);
ideas.get("/:id/versions/:version/diff", getVersionDiff);

/** One turn of the conversation. */
ideas.post("/:id/messages", postMessage);

/** Reads the conversation and proposes structure. */
ideas.post("/:id/extractions", postExtraction);

/** The user accepts, corrects or discards a proposal. */
ideas.post("/:id/proposals/:nodeId", postProposal);

/** The arranque: the coach's step list, its proposals and their state. */
ideas.get("/:id/steps", getSteps);
ideas.post("/:id/steps", postSteps);
ideas.post("/:id/steps/proposals", postStepProposals);
ideas.patch("/:id/steps/:stepId", patchStep);
