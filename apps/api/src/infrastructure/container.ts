import { DrizzleIdeaRepository } from "./db/idea-repository";
import { DrizzleMessageRepository } from "./db/message-repository";

/**
 * Composition root.
 *
 * This is the only place that decides which implementation the application
 * gets. A page asks for the repository; it never constructs an adapter itself.
 */

let ideaRepositoryInstance: DrizzleIdeaRepository | undefined;
let messageRepositoryInstance: DrizzleMessageRepository | undefined;

export function ideaRepository(): DrizzleIdeaRepository {
  if (!ideaRepositoryInstance) {
    ideaRepositoryInstance = new DrizzleIdeaRepository();
  }

  return ideaRepositoryInstance;
}

export function messageRepository(): DrizzleMessageRepository {
  if (!messageRepositoryInstance) {
    messageRepositoryInstance = new DrizzleMessageRepository();
  }

  return messageRepositoryInstance;
}
