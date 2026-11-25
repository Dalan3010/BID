import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { NODE_TYPES } from "@bid/core";

import { InMemoryMessageRepository } from "../testing/in-memory-message-repository";
import { InMemoryIdeaRepository } from "../testing/in-memory-idea-repository";
import { InMemoryArranqueStepRepository } from "../testing/in-memory-arranque-step-repository";
import { IdeaNotFoundError } from "../errors";
import type { CoachModel, CoachRequest } from "../ports/coach-model";
import { createIdea } from "./create-idea";
import { coachAgenda, buildSystemPrompt } from "./build-coach-context";
import { listConversation, sendMessage } from "./send-message";
import { confirmNode } from "./confirm-node";
import { proposeNode } from "./propose-node";
import { RehearsalCoachModel } from "../../infrastructure/ai/rehearsal-coach-model";

const OWNER = "owner-1";
const OTHER = "owner-2";

/** A model that says one fixed thing, so the test does not depend on the script. */
class FixedCoachModel implements CoachModel {
  lastRequest: CoachRequest | undefined;

  constructor(private readonly text = "Respuesta fija.") {}

  async *stream(input: CoachRequest): AsyncIterable<string> {
    this.lastRequest = input;
    yield this.text;
  }
}

/** Consumes one turn the way the route does: the answer arrives as it is made. */
async function read(stream: AsyncIterable<string>): Promise<string> {
  let text = "";

  for await (const chunk of stream) {
    text += chunk;
  }

  return text;
}

describe("coachAgenda", () => {
  it("lists the open dimensions in canonical order", () => {
    const agenda = coachAgenda({ ideaId: "idea-1", nodes: [] });

    expect(agenda).toHaveLength(10);
    expect(agenda[0]).toBe("problem");
  });

  it("drops a dimension once it is confirmed", () => {
    const graph = {
      ideaId: "idea-1",
      nodes: [
        {
          id: "n1",
          ideaId: "idea-1",
          type: "problem" as const,
          content: "Offices lack good coffee",
          source: "confirmed" as const,
          messageId: null,
          confidence: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };

    expect(coachAgenda(graph)).not.toContain("problem");
  });
});

describe("buildSystemPrompt", () => {
  it("names the idea and states the contract rules", () => {
    const prompt = buildSystemPrompt("Café por suscripción");

    expect(prompt).toContain("Café por suscripción");
    expect(prompt).toContain("Una sola pregunta por vez");
    expect(prompt).toContain("la dimensión que te indicamos");
    expect(prompt).toContain("No inventas datos");
    expect(prompt).toContain("buscas en la web");
  });
});

describe("sendMessage", () => {
  let ideas: InMemoryIdeaRepository;
  let messages: InMemoryMessageRepository;
  let model: FixedCoachModel;
  let steps: InMemoryArranqueStepRepository;
  let ideaId: string;

  beforeEach(async () => {
    ideas = new InMemoryIdeaRepository();
    messages = new InMemoryMessageRepository();
    model = new FixedCoachModel();
    steps = new InMemoryArranqueStepRepository();

    const idea = await createIdea(ideas, {
      ownerId: OWNER,
      title: "Café por suscripción",
    });
    ideaId = idea.id;
  });

  it("stores the user's message and the coach's reply", async () => {
    const result = await sendMessage(
      { ideas, messages, model, steps },
      { ideaId, ownerId: OWNER, content: "Hola, quiero empezar" },
    );

    expect(await read(result.stream)).toBe("Respuesta fija.");

    const conversation = await listConversation(messages, ideaId);
    expect(conversation).toHaveLength(2);
    expect(conversation[0].role).toBe("user");
    expect(conversation[0].content).toBe("Hola, quiero empezar");
    expect(conversation[1].role).toBe("assistant");
    expect(conversation[1].content).toBe("Respuesta fija.");
  });

  it("sends the answer while the model is still writing it", async () => {
    let open = () => undefined as void;
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });

    const slow: CoachModel = {
      async *stream() {
        yield "primera ";
        await gate;
        yield "segunda";
      },
    };

    const { stream } = await sendMessage(
      { ideas, messages, model: slow, steps },
      { ideaId, ownerId: OWNER, content: "Hola" },
    );

    const chunks = stream[Symbol.asyncIterator]();
    // The first words are already readable, with the model still blocked: the
    // turn is not buffered to the end any more.
    expect((await chunks.next()).value).toBe("primera ");
    expect((await listConversation(messages, ideaId)).map((m) => m.role)).toEqual(["user"]);

    open();

    for (let step = await chunks.next(); !step.done; step = await chunks.next()) {
      // Drain: the rest of the answer.
    }

    // Stored once, whole, and only when the answer finished (RF-25).
    const conversation = await listConversation(messages, ideaId);
    expect(conversation.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(conversation[1].content).toBe("primera segunda");
  });

  it("keeps the user's message even when the model fails", async () => {
    const failing: CoachModel = {
      async *stream() {
        throw new Error("provider caído");
      },
    };

    await expect(
      sendMessage(
        { ideas, messages, model: failing, steps },
        { ideaId, ownerId: OWNER, content: "Hola" },
      ),
    ).rejects.toThrow("provider caído");

    const conversation = await listConversation(messages, ideaId);
    expect(conversation).toHaveLength(1);
    expect(conversation[0].role).toBe("user");
    expect(conversation[0].content).toBe("Hola");
  });

  it("refuses a message from somebody who does not own the idea", async () => {
    await expect(
      sendMessage(
        { ideas, messages, model, steps },
        { ideaId, ownerId: OTHER, content: "Hola" },
      ),
    ).rejects.toBeInstanceOf(IdeaNotFoundError);

    expect(await listConversation(messages, ideaId)).toHaveLength(0);
  });

  it("refuses an empty message", async () => {
    await expect(
      sendMessage(
        { ideas, messages, model, steps },
        { ideaId, ownerId: OWNER, content: "   " },
      ),
    ).rejects.toThrow();
  });

  it("sends the agenda and the recent messages to the model", async () => {
    await sendMessage(
      { ideas, messages, model, steps },
      { ideaId, ownerId: OWNER, content: "Primera pregunta" },
    );

    expect(model.lastRequest?.agenda).toHaveLength(10);
    expect(model.lastRequest?.agenda[0]).toBe("problem");
    expect(model.lastRequest?.messages.at(-1)?.content).toBe("Primera pregunta");
    expect(model.lastRequest?.messages.at(-1)?.role).toBe("user");
  });

  it("drops a dimension from the agenda once it is confirmed", async () => {
    const { node } = await proposeNode(ideas, {
      ideaId,
      type: "problem",
      content: "Offices lack good coffee",
    });
    await confirmNode(ideas, { ideaId, nodeId: node!.id, ownerId: OWNER });

    await sendMessage(
      { ideas, messages, model, steps },
      { ideaId, ownerId: OWNER, content: "Sigo" },
    );

    expect(model.lastRequest?.agenda).not.toContain("problem");
    expect(model.lastRequest?.agenda).toHaveLength(9);
  });

  it("keeps one conversation per idea", async () => {
    const other = await createIdea(ideas, {
      ownerId: OWNER,
      title: "Otra idea",
    });

    await read(
      (
        await sendMessage(
          { ideas, messages, model, steps },
          { ideaId, ownerId: OWNER, content: "De la primera" },
        )
      ).stream,
    );
    await read(
      (
        await sendMessage(
          { ideas, messages, model, steps },
          { ideaId: other.id, ownerId: OWNER, content: "De la segunda" },
        )
      ).stream,
    );

    expect(await listConversation(messages, ideaId)).toHaveLength(2);
    expect(await listConversation(messages, other.id)).toHaveLength(2);
  });

  it("focuses the coach on the next open step when the idea is complete", async () => {
    for (const type of NODE_TYPES) {
      await ideas.addNode({
        ideaId,
        type,
        content: `Contenido de ${type}`,
        source: "confirmed",
      });
    }

    await steps.addSteps(ideaId, [
      { title: "Fijar el primer precio", detail: null },
    ]);

    const requests: CoachRequest[] = [];
    const model: CoachModel = {
      async *stream(input) {
        requests.push(input);
        yield "Vamos con ese paso.";
      },
    };

    await sendMessage(
      { ideas, messages, model, steps },
      { ideaId, ownerId: OWNER, content: "dale" },
    );

    expect(requests[0]?.agenda).toEqual([]);
    expect(requests[0]?.nextStep?.title).toBe("Fijar el primer precio");
  });

  it("does not repeat the step question once the person answered", async () => {
    for (const type of NODE_TYPES) {
      await ideas.addNode({
        ideaId,
        type,
        content: `Contenido de ${type}`,
        source: "confirmed",
      });
    }

    await steps.addSteps(ideaId, [
      { title: "Fijar el primer precio", detail: "Un número concreto que cobrar mañana." },
    ]);

    const coach = new RehearsalCoachModel();

    const first = await sendMessage(
      { ideas, messages, model: coach, steps },
      { ideaId, ownerId: OWNER, content: "¿Por dónde empiezo?" },
    );
    const second = await sendMessage(
      { ideas, messages, model: coach, steps },
      { ideaId, ownerId: OWNER, content: "Me parece bien" },
    );

    const firstReply = await read(first.stream);
    const secondReply = await read(second.stream);

    expect(firstReply).toContain("¿Qué necesitas para darlo esta semana?");
    expect(secondReply).not.toBe(firstReply);
    expect(secondReply).toContain("Un número concreto que cobrar mañana.");
    expect(secondReply).toContain("márcalo como hecho");
  });
});

describe("message repository", () => {
  let messages: InMemoryMessageRepository;

  beforeEach(() => {
    messages = new InMemoryMessageRepository();
  });

  afterEach(async () => {
    await messages.clear("idea-1");
  });

  it("returns the last messages, oldest first", async () => {
    for (const content of ["a", "b", "c"]) {
      await messages.add({ ideaId: "idea-1", role: "user", content });
    }

    const recent = await messages.listRecent("idea-1", 2);

    expect(recent.map((m) => m.content)).toEqual(["b", "c"]);
  });

  it("returns the whole conversation when the limit is bigger", async () => {
    await messages.add({ ideaId: "idea-1", role: "user", content: "a" });

    const recent = await messages.listRecent("idea-1", 50);

    expect(recent).toHaveLength(1);
  });

  it("clears the conversation of one idea only", async () => {
    await messages.add({ ideaId: "idea-1", role: "user", content: "a" });
    await messages.add({ ideaId: "idea-2", role: "user", content: "b" });

    await messages.clear("idea-1");

    expect(await messages.listByIdea("idea-1")).toHaveLength(0);
    expect(await messages.listByIdea("idea-2")).toHaveLength(1);
  });
});
