import { IdeaNotFoundError } from "../errors";
import type { IdeaRepository } from "../ports/idea-repository";

export interface DeleteIdeaInput {
  readonly ideaId: string;
  readonly ownerId: string;
}

/**
 * Deletes an idea and everything hanging from it.
 *
 * Deletion is not a versioned change: the snapshots go away with the idea, so
 * no version is written first.
 */
export async function deleteIdea(
  repository: IdeaRepository,
  input: DeleteIdeaInput,
): Promise<void> {
  const idea = await repository.findById(input.ideaId);

  if (!idea || idea.ownerId !== input.ownerId) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  const deleted = await repository.deleteIdea(input.ideaId);

  if (!deleted) {
    throw new IdeaNotFoundError(input.ideaId);
  }
}
