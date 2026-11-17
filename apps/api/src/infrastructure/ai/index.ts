import type { CoachModel } from "../../application/ports/coach-model";
import { FallbackCoachModel } from "./fallback";
import { GoogleCoachModel } from "./google-coach-model";
import { ProviderCoachModel, buildProviderMessages } from "./provider-coach-model";
import { RehearsalCoachModel } from "./rehearsal-coach-model";

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
          buildProviderMessages(
            `Sos un coach que ayuda a un emprendedor a cimentar su idea de negocio "${input.title}".`,
            input,
          ),
      });
    }

    // The script stays behind the provider (RF-72): a failure or an exhausted
    // quota answers from the script instead of cutting the walkthrough.
    return new FallbackCoachModel(new GoogleCoachModel(), new RehearsalCoachModel());
  }

  return new RehearsalCoachModel();
}
