import type { Idea, IdeaRepository } from "../ports/idea-repository";
import { InvalidIdeaError } from "../errors";

export interface CreateIdeaInput {
  readonly ownerId: string;
  readonly title: string;
  readonly summary?: string;
}

/**
 * Creates an empty idea owned by `ownerId`.
 *
 * The title is the only required field: everything else is discovered through
 * the conversation, which is the whole point of the product.
 */
export async function createIdea(
  repository: IdeaRepository,
  input: CreateIdeaInput,
): Promise<Idea> {
  const title = input.title.trim();
  if (title.length === 0) {
    throw new InvalidIdeaError("An idea needs a non-empty title.");
  }

  if (input.ownerId.trim().length === 0) {
    throw new InvalidIdeaError("An idea needs an owner.");
  }

  return repository.create({
    ownerId: input.ownerId,
    title,
    summary: input.summary?.trim() ?? "",
  });
}
