import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { InMemoryMessageRepository } from "../testing/in-memory-message-repository";
import { InMemoryIdeaRepository } from "../testing/in-memory-idea-repository";
import { IdeaNotFoundError } from "../errors";
import type { CoachModel, CoachRequest } from "../ports/coach-model";
import { createIdea } from "./create-idea";
import { coachAgenda, buildSystemPrompt } from "./build-coach-context";
import { listConversation, sendMessage } from "./send-message";
import { confirmNode } from "./confirm-node";
import { proposeNode } from "./propose-node";

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
  it("names the idea and states the rules", () => {
    const prompt = buildSystemPrompt("Café por suscripción");

    expect(prompt).toContain("Café por suscripción");
    expect(prompt).toContain("UNA pregunta por vez");
  });
});

describe("sendMessage", () => {
  let ideas: InMemoryIdeaRepository;
  let messages: InMemoryMessageRepository;
  let model: FixedCoachModel;
  let ideaId: string;

  beforeEach(async () => {
    ideas = new InMemoryIdeaRepository();
    messages = new InMemoryMessageRepository();
    model = new FixedCoachModel();

    const idea = await createIdea(ideas, {
      ownerId: OWNER,
      title: "Café por suscripción",
    });
    ideaId = idea.id;
  });

  it("stores the user's message and the coach's reply", async () => {
    const result = await sendMessage(
      { ideas, messages, model },
      { ideaId, ownerId: OWNER, content: "Hola, quiero empezar" },
    );

    expect(result.reply).toBe("Respuesta fija.");

    const conversation = await listConversation(messages, ideaId);
    expect(conversation).toHaveLength(2);
    expect(conversation[0].role).toBe("user");
    expect(conversation[0].content).toBe("Hola, quiero empezar");
    expect(conversation[1].role).toBe("assistant");
    expect(conversation[1].content).toBe("Respuesta fija.");
  });

  it("keeps the user's message even when the model fails", async () => {
    const failing: CoachModel = {
      async *stream() {
        throw new Error("provider caído");
      },
    };

    await expect(
      sendMessage(
        { ideas, messages, model: failing },
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
        { ideas, messages, model },
        { ideaId, ownerId: OTHER, content: "Hola" },
      ),
    ).rejects.toBeInstanceOf(IdeaNotFoundError);

    expect(await listConversation(messages, ideaId)).toHaveLength(0);
  });

  it("refuses an empty message", async () => {
    await expect(
      sendMessage(
        { ideas, messages, model },
        { ideaId, ownerId: OWNER, content: "   " },
      ),
    ).rejects.toThrow();
  });

  it("sends the agenda and the recent messages to the model", async () => {
    await sendMessage(
      { ideas, messages, model },
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
    await confirmNode(ideas, { ideaId, nodeId: node!.id });

    await sendMessage(
      { ideas, messages, model },
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

    await sendMessage(
      { ideas, messages, model },
      { ideaId, ownerId: OWNER, content: "De la primera" },
    );
    await sendMessage(
      { ideas, messages, model },
      { ideaId: other.id, ownerId: OWNER, content: "De la segunda" },
    );

    expect(await listConversation(messages, ideaId)).toHaveLength(2);
    expect(await listConversation(messages, other.id)).toHaveLength(2);
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
