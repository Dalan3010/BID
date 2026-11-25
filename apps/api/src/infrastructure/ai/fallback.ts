import type { CoachModel, CoachRequest } from "../../application/ports/coach-model";
import type { Extractor, ExtractionRequest } from "../../application/ports/extractor";
import type {
  PlanningRequest,
  StepPlanner,
} from "../../application/ports/step-planner";

/** Where a provider failure is reported. The demo keeps going either way. */
export type FailureReporter = (error: unknown) => void;

const logFailure: FailureReporter = (error) => {
  console.error("[api] provider failed, answering from the script:", error);
};

/**
 * The live coach with the script behind it (RF-72).
 *
 * "Si el proveedor falla o no hay cuota, respuestas predefinidas con el mismo
 * streaming; el recorrido nunca se corta." A failure before the first token
 * hands the turn to the scripted coach, so the user still gets a question. A
 * failure mid-answer keeps what already arrived: mixing two voices in one
 * message would read worse than a shorter one.
 */
export class FallbackCoachModel implements CoachModel {
  constructor(
    private readonly primary: CoachModel,
    private readonly fallback: CoachModel,
    private readonly report: FailureReporter = logFailure,
  ) {}

  async *stream(input: CoachRequest): AsyncIterable<string> {
    let started = false;

    try {
      for await (const chunk of this.primary.stream(input)) {
        // Leading blanks are held back: an answer that is only whitespace is
        // as broken as an error, and the script should answer it too.
        if (!started && chunk.trim() === "") {
          continue;
        }

        started = true;
        yield chunk;
      }

      if (started) {
        return;
      }

      this.report(new Error("The provider ended without an answer."));
    } catch (error) {
      this.report(error);

      if (started) {
        return;
      }
    }

    yield* this.fallback.stream(input);
  }
}

/**
 * The live extractor with the script behind it (RF-72).
 *
 * The extraction runs after the chat turn; if the provider fails there, the
 * scripted extractor answers, so the walkthrough still reaches the tree.
 */
export class FallbackExtractor implements Extractor {
  constructor(
    private readonly primary: Extractor,
    private readonly fallback: Extractor,
    private readonly report: FailureReporter = logFailure,
  ) {}

  async extract(input: ExtractionRequest): Promise<string> {
    try {
      return await this.primary.extract(input);
    } catch (error) {
      this.report(error);

      return this.fallback.extract(input);
    }
  }
}

/**
 * The live step planner with the script behind it (RF-72).
 *
 * The plan is asked once, when the person enters the arranque: if the provider
 * fails there, the scripted planner answers, so the walkthrough still gets a
 * step list to work on.
 */
export class FallbackStepPlanner implements StepPlanner {
  constructor(
    private readonly primary: StepPlanner,
    private readonly fallback: StepPlanner,
    private readonly report: FailureReporter = logFailure,
  ) {}

  async plan(input: PlanningRequest): Promise<string> {
    try {
      return await this.primary.plan(input);
    } catch (error) {
      this.report(error);

      return this.fallback.plan(input);
    }
  }
}
