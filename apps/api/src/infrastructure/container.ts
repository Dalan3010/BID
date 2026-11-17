import { DrizzleIdeaRepository } from "./db/idea-repository";
import { DrizzleMessageRepository } from "./db/message-repository";
import {
  createCoachModel,
  createExtractor,
  resolveCoachProvider,
} from "./ai";
import { InMemoryUsageQuota } from "./ai/in-memory-usage-quota";

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

/**
 * The coach the application talks to.
 *
 * It is built once per process: the provider is read from the environment, and
 * a page reload should not renegotiate it.
 */
let cachedCoachModel: ReturnType<typeof createCoachModel> | undefined;

export function coachModel() {
  if (!cachedCoachModel) {
    cachedCoachModel = createCoachModel({ provider: resolveCoachProvider() });
  }

  return cachedCoachModel;
}

let cachedExtractor: ReturnType<typeof createExtractor> | undefined;

/**
 * The extractor.
 *
 * It follows the same rule as the coach: the same provider decides, so the
 * demo cannot end up with a scripted coach and a live extractor.
 */
export function extractor() {
  if (!cachedExtractor) {
    cachedExtractor = createExtractor({ provider: resolveCoachProvider() });
  }

  return cachedExtractor;
}

let cachedQuota: InMemoryUsageQuota | undefined;

/**
 * The quota of model calls.
 */
export function usageQuota(): InMemoryUsageQuota {
  if (!cachedQuota) {
    cachedQuota = new InMemoryUsageQuota();
  }

  return cachedQuota;
}
