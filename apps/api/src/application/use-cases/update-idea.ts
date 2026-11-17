import type { Idea, IdeaRepository } from "../ports/idea-repository";
import { IdeaNotFoundError, InvalidIdeaError } from "../errors";

export interface UpdateIdeaInput {
  readonly ideaId: string;
  readonly ownerId: string;
  readonly title?: string;
  readonly summary?: string;
}

/**
 * Renames an idea or rewrites its summary.
 *
 * Metadata changes do not touch the graph, so they deliberately do not create a
 * version: history tracks knowledge, not the idea's label.
 */
export async function updateIdea(
  repository: IdeaRepository,
  input: UpdateIdeaInput,
): Promise<Idea> {
  const idea = await repository.findById(input.ideaId);

  if (!idea || idea.ownerId !== input.ownerId) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  const patch: { title?: string; summary?: string } = {};

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (title.length === 0) {
      throw new InvalidIdeaError("An idea needs a non-empty title.");
    }
    patch.title = title;
  }

  if (input.summary !== undefined) {
    patch.summary = input.summary.trim();
  }

  const updated = await repository.updateIdea(input.ideaId, patch);

  if (!updated) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  return updated;
}
