import type { Context } from "hono";

import {
  addArranqueSteps,
  loadArranqueSteps,
  proposeArranqueSteps,
  updateArranqueStepStatus,
} from "../application/use-cases";
import {
  arranqueStepRepository,
  ideaRepository,
  messageRepository,
  stepPlanner,
  usageQuota,
} from "../infrastructure/container";
import { addStepsSchema, readJson, stepStatusSchema } from "../lib/body";
import { requiredParam } from "../lib/params";
import { requireUser } from "../lib/session";

/**
 * The arranque: the coach's step list, its proposals and their state.
 *
 * Nothing here writes to the plan. The ten-dimension graph is closed once
 * complete; the steps are the accompaniment that follows (rule 1: the AI
 * proposes through `postStepProposals`, the person accepts through
 * `postSteps`).
 */

/** The step list of one idea, oldest first. */
export async function getSteps(context: Context): Promise<Response> {
  const user = await requireUser(context);
  const ideaId = requiredParam(context, "id");

  const steps = await loadArranqueSteps(
    { ideas: ideaRepository(), steps: arranqueStepRepository() },
    { ideaId, ownerId: user.id },
  );

  return context.json({ steps });
}

/** Persists the steps the person accepted. */
export async function postSteps(context: Context): Promise<Response> {
  const user = await requireUser(context);
  const ideaId = requiredParam(context, "id");
  const body = await readJson(context, addStepsSchema);

  const steps = await addArranqueSteps(
    { ideas: ideaRepository(), steps: arranqueStepRepository() },
    {
      ideaId,
      ownerId: user.id,
      steps: body.steps.map((step) => ({
        title: step.title,
        detail: step.detail ?? null,
      })),
    },
  );

  return context.json({ steps }, 201);
}

/**
 * Asks the planner for the first concrete steps.
 *
 * Nothing is persisted: the answer is proposals, and the quota is checked
 * before the model is called so the person is told, not left wondering
 * (RF-24).
 */
export async function postStepProposals(context: Context): Promise<Response> {
  const user = await requireUser(context);
  const ideaId = requiredParam(context, "id");

  const result = await proposeArranqueSteps(
    {
      ideas: ideaRepository(),
      messages: messageRepository(),
      planner: stepPlanner(),
      quota: usageQuota(),
    },
    { ideaId, ownerId: user.id },
  );

  return context.json(result);
}

/** Completes a step, or reopens one that was closed. */
export async function patchStep(context: Context): Promise<Response> {
  const user = await requireUser(context);
  const ideaId = requiredParam(context, "id");
  const stepId = requiredParam(context, "stepId");
  const body = await readJson(context, stepStatusSchema);

  const step = await updateArranqueStepStatus(
    { ideas: ideaRepository(), steps: arranqueStepRepository() },
    { ideaId, ownerId: user.id, stepId, status: body.status },
  );

  return context.json({ step });
}
