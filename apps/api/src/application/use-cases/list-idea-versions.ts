import { IdeaNotFoundError } from "../errors";
import type { IdeaRepository, IdeaVersionSummary } from "../ports/idea-repository";

export interface ListIdeaVersionsInput {
  readonly ideaId: string;
  readonly ownerId: string;
}

/**
 * Lists an idea's snapshots, newest first.
 *
 * The owner is checked before reading anything: a stranger gets a not-found,
 * the same answer as for an idea that was never created.
 */
export async function listIdeaVersions(
  repository: IdeaRepository,
  input: ListIdeaVersionsInput,
): Promise<IdeaVersionSummary[]> {
  const idea = await repository.findById(input.ideaId);

  if (!idea || idea.ownerId !== input.ownerId) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  return repository.listVersions(input.ideaId);
}
