import { buildSystemPrompt } from "../../application/use-cases/build-coach-context";
import type { CoachModel } from "../../application/ports/coach-model";
import type { Extractor } from "../../application/ports/extractor";
import type { StepPlanner } from "../../application/ports/step-planner";
import type { WebSearch } from "../../application/ports/web-search";
import { FallbackCoachModel, FallbackExtractor, FallbackStepPlanner } from "./fallback";
import { GoogleCoachModel } from "./google-coach-model";
import { GoogleStepPlanner } from "./google-step-planner";
import { ProviderCoachModel, buildProviderMessages } from "./provider-coach-model";
import { ProviderExtractor } from "./provider-extractor";
import { RehearsalCoachModel } from "./rehearsal-coach-model";
import { RehearsalExtractor } from "./rehearsal-extractor";
import { RehearsalStepPlanner } from "./rehearsal-step-planner";
import { TavilyWebSearch } from "./tavily-web-search";

/**
 * Which model the application talks to.
 *
 * `rehearsal` is the default on purpose: the app has to be demonstrable
 * without a provider (RNF-15, RNF-16, RNF-17). A live provider is opt-in.
 */
export type CoachProvider = "rehearsal" | "live";

/**
 * Reads the provider from the environment.
 *
 * Without a provider configured, the app still works: it answers from the
 * script. That is what makes the demo safe.
 */
export function resolveCoachProvider(): CoachProvider {
  return process.env.COACH_PROVIDER === "live" ? "live" : "rehearsal";
}

/**
 * The web search the live coach grounds its answers with.
 *
 * `TAVILY_API_KEY` is what turns it on. Without the key there is no search:
 * the coach keeps the provider's built-in grounding, which is exactly the
 * behaviour the app had before (D-B).
 */
export function createWebSearch(
  apiKey: string | undefined = process.env.TAVILY_API_KEY,
): WebSearch | undefined {
  if (!apiKey) {
    // Say it once, at startup: a coach that cannot search still answers, but
    // the person must be able to tell why no source ever appears. Without this
    // line the difference was invisible in the logs (the 429 spent a whole day
    // looking like a model problem).
    console.info(
      "[coach] sin TAVILY_API_KEY: el coach responde sin búsqueda web ni fuentes.",
    );
    return undefined;
  }

  console.info("[coach] búsqueda web propia activa (Tavily).");
  return new TavilyWebSearch(apiKey);
}

/**
 * The coach the application uses.
 *
 * The live implementation needs a provider client, which does not exist yet.
 * Asking for it explicitly means the app never pretends to have a provider it
 * does not have: without a client, the rehearsal coach answers.
 */
export function createCoachModel(options: {
  readonly provider?: CoachProvider;
  readonly providerClient?: import("./provider-coach-model").ProviderClient;
}): CoachModel {
  if (options.provider === "live") {
    // A client given by the caller wins: it is what the tests use to exercise
    // the live path without a network.
    if (options.providerClient) {
      return new ProviderCoachModel(options.providerClient, {
        build: (input) =>
          buildProviderMessages(buildSystemPrompt(input.title), input),
      });
    }

    // The script stays behind the provider (RF-72): a failure or an exhausted
    // quota answers from the script instead of cutting the walkthrough.
    return new FallbackCoachModel(
      new GoogleCoachModel(undefined, createWebSearch()),
      new RehearsalCoachModel(),
    );
  }

  return new RehearsalCoachModel();
}

/**
 * The extractor the application uses.
 *
 * It follows the coach's rule: the same provider decides. A scripted coach
 * with a live extractor would make the demo inconsistent.
 */
export function createExtractor(options: {
  readonly provider?: CoachProvider;
}): Extractor {
  if (options.provider === "live") {
    return new FallbackExtractor(new ProviderExtractor(), new RehearsalExtractor());
  }

  return new RehearsalExtractor();
}

/**
 * The step planner the application uses.
 *
 * It follows the coach's and the extractor's rule: the same provider decides,
 * so the demo cannot end up with a scripted coach and a live planner.
 */
export function createStepPlanner(options: {
  readonly provider?: CoachProvider;
}): StepPlanner {
  if (options.provider === "live") {
    return new FallbackStepPlanner(
      new GoogleStepPlanner(),
      new RehearsalStepPlanner(),
    );
  }

  return new RehearsalStepPlanner();
}
