import { describe, expect, it } from "vitest";

import type { CoachModel, CoachRequest } from "../../application/ports/coach-model";
import type { Extractor, ExtractionRequest } from "../../application/ports/extractor";
import type { PlanningRequest, StepPlanner } from "../../application/ports/step-planner";
import { FallbackCoachModel, FallbackExtractor, FallbackStepPlanner } from "./fallback";

const REQUEST: CoachRequest = {
  idea: { ideaId: "idea-1", nodes: [] },
  title: "Idea",
  messages: [],
  agenda: ["problem"],
};

const EXTRACTION: ExtractionRequest = {
  idea: { ideaId: "idea-1", nodes: [] },
  title: "Idea",
  messages: [],
};

const PLANNING: PlanningRequest = {
  idea: { ideaId: "idea-1", nodes: [] },
  title: "Idea",
  messages: [],
};

/** A coach that yields some chunks and then, optionally, fails. */
class ScriptedCoach implements CoachModel {
  calls = 0;

  constructor(
    private readonly chunks: readonly string[],
    private readonly failAfter: boolean,
  ) {}

  async *stream(): AsyncIterable<string> {
    this.calls += 1;

    for (const chunk of this.chunks) {
      yield chunk;
    }

    if (this.failAfter) {
      throw new Error("provider down");
    }
  }
}

async function collect(stream: AsyncIterable<string>): Promise<string> {
  let text = "";

  for await (const chunk of stream) {
    text += chunk;
  }

  return text;
}

const silent = () => {};

describe("FallbackCoachModel", () => {
  it("uses the provider while it answers", async () => {
    const backup = new ScriptedCoach(["guion"], false);
    const coach = new FallbackCoachModel(
      new ScriptedCoach(["hola ", "mundo"], false),
      backup,
      silent,
    );

    expect(await collect(coach.stream(REQUEST))).toBe("hola mundo");
    expect(backup.calls).toBe(0);
  });

  it("answers from the script when the provider fails before the first token", async () => {
    const coach = new FallbackCoachModel(
      new ScriptedCoach([], true),
      new ScriptedCoach(["respuesta ", "guionada"], false),
      silent,
    );

    expect(await collect(coach.stream(REQUEST))).toBe("respuesta guionada");
  });

  it("keeps what already arrived when the provider fails mid-answer", async () => {
    const backup = new ScriptedCoach(["guion"], false);
    const coach = new FallbackCoachModel(
      new ScriptedCoach(["media ", "respuesta"], true),
      backup,
      silent,
    );

    expect(await collect(coach.stream(REQUEST))).toBe("media respuesta");
    expect(backup.calls).toBe(0);
  });

  it("answers from the script when the provider ends without a word", async () => {
    const coach = new FallbackCoachModel(
      new ScriptedCoach(["", "  "], false),
      new ScriptedCoach(["guion"], false),
      silent,
    );

    expect(await collect(coach.stream(REQUEST))).toBe("guion");
  });

  it("reports the provider failure", async () => {
    const reported: unknown[] = [];
    const coach = new FallbackCoachModel(
      new ScriptedCoach([], true),
      new ScriptedCoach(["guion"], false),
      (error) => reported.push(error),
    );

    await collect(coach.stream(REQUEST));

    expect(reported).toHaveLength(1);
  });
});

describe("FallbackExtractor", () => {
  const scripted: Extractor = { extract: async () => '{"proposals":[]}' };

  it("uses the provider while it answers", async () => {
    const extractor = new FallbackExtractor(
      { extract: async () => '{"proposals":[1]}' },
      scripted,
      silent,
    );

    expect(await extractor.extract(EXTRACTION)).toBe('{"proposals":[1]}');
  });

  it("extracts from the script when the provider fails", async () => {
    const extractor = new FallbackExtractor(
      {
        extract: async () => {
          throw new Error("quota exceeded");
        },
      },
      scripted,
      silent,
    );

    expect(await extractor.extract(EXTRACTION)).toBe('{"proposals":[]}');
  });
});

describe("FallbackStepPlanner", () => {
  const scripted: StepPlanner = {
    plan: async () => '{"steps":[{"title":"Guion"}]}',
  };

  it("uses the provider while it answers", async () => {
    const planner = new FallbackStepPlanner(
      { plan: async () => '{"steps":[{"title":"Live"}]}' },
      scripted,
      silent,
    );

    expect(await planner.plan(PLANNING)).toBe('{"steps":[{"title":"Live"}]}');
  });

  it("plans from the script when the provider fails", async () => {
    const planner = new FallbackStepPlanner(
      {
        plan: async () => {
          throw new Error("quota exceeded");
        },
      },
      scripted,
      silent,
    );

    expect(await planner.plan(PLANNING)).toBe('{"steps":[{"title":"Guion"}]}');
  });

  it("reports the provider failure", async () => {
    const reported: unknown[] = [];
    const planner = new FallbackStepPlanner(
      {
        plan: async () => {
          throw new Error("quota exceeded");
        },
      },
      scripted,
      (error) => reported.push(error),
    );

    await planner.plan(PLANNING);

    expect(reported).toHaveLength(1);
  });
});
