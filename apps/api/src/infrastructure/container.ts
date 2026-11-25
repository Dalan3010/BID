import { getDatabase } from "./db/client";
import { DrizzleDemoBook } from "./db/demo-book";
import { DrizzleArranqueStepRepository } from "./db/arranque-step-repository";
import { DrizzleIdeaRepository } from "./db/idea-repository";
import { DrizzleMessageRepository } from "./db/message-repository";
import {
  createCoachModel,
  createExtractor,
  createStepPlanner,
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

let arranqueStepRepositoryInstance: DrizzleArranqueStepRepository | undefined;

export function arranqueStepRepository(): DrizzleArranqueStepRepository {
  if (!arranqueStepRepositoryInstance) {
    arranqueStepRepositoryInstance = new DrizzleArranqueStepRepository();
  }

  return arranqueStepRepositoryInstance;
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

let cachedStepPlanner: ReturnType<typeof createStepPlanner> | undefined;

/**
 * The step planner of the arranque.
 *
 * Same rule as the coach and the extractor: one provider decides for the whole
 * process, and it is built once per process.
 */
export function stepPlanner() {
  if (!cachedStepPlanner) {
    cachedStepPlanner = createStepPlanner({ provider: resolveCoachProvider() });
  }

  return cachedStepPlanner;
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

/** The seeded demo book, restored by the reset button (RF-73). */
export function demoBook(): DrizzleDemoBook {
  return new DrizzleDemoBook(getDatabase());
}
