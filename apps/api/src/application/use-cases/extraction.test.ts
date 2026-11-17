import { describe, expect, it } from "vitest";

import { InMemoryIdeaRepository } from "../testing/in-memory-idea-repository";
import { InMemoryMessageRepository } from "../testing/in-memory-message-repository";
import { InMemoryUsageQuota } from "../../infrastructure/ai/in-memory-usage-quota";
import { RehearsalExtractor } from "../../infrastructure/ai/rehearsal-extractor";
import { parseExtraction } from "../../infrastructure/ai/extraction-schema";
import { createIdea } from "./create-idea";
import { confirmNode } from "./confirm-node";
import { extractKnowledge } from "./extract-knowledge";
import { proposeExtractedNodes } from "./propose-extracted-nodes";
import { resolveProposal } from "./resolve-proposal";
import { IdeaNotFoundError } from "../errors";

const OWNER = "owner-1";
const OTHER = "owner-2";

describe("parseExtraction", () => {
  it("accepts a valid extraction", () => {
    const parsed = parseExtraction(
      JSON.stringify({
        nodes: [{ type: "revenue", content: "Suscripción mensual", confidence: 0.8 }],
      }),
    );

    expect(parsed?.nodes).toHaveLength(1);
    expect(parsed?.nodes[0].type).toBe("revenue");
  });

  it("discards a JSON that is not an extraction", () => {
    expect(parseExtraction(JSON.stringify({ nodes: [{ type: "nope" }] }))).toBeNull();
    expect(parseExtraction(JSON.stringify({ other: true }))).toBeNull();
    expect(parseExtraction("not json at all")).toBeNull();
  });

  it("discards an empty content", () => {
    expect(
      parseExtraction(JSON.stringify({ nodes: [{ type: "revenue", content: "" }] })),
    ).toBeNull();
  });

  it("finds the JSON inside a text that wraps it", () => {
    const parsed = parseExtraction(
      'Acá va la respuesta:\\n```json\\n{"nodes":[{"type":"costs","content":"Alquiler del local"}]}\\n```',
    );

    expect(parsed?.nodes[0].type).toBe("costs");
  });

  it("discards a confidence outside the range", () => {
    expect(
      parseExtraction(
        JSON.stringify({ nodes: [{ type: "costs", content: "x", confidence: 3 }] }),
      ),
    ).toBeNull();
  });
});

describe("proposeExtractedNodes", () => {
  it("creates every proposal as inferred", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, { ownerId: OWNER, title: "Café" });

    const outcome = await proposeExtractedNodes(repository, {
      ideaId: idea.id,
      ownerId: OWNER,
      messages: [],
      extraction: {
        nodes: [
          { type: "revenue", content: "Suscripción mensual" },
          { type: "costs", content: "Grano verde y tueste" },
        ],
      },
    });

    expect(outcome.proposals).toHaveLength(2);

    const graph = await repository.loadGraph(idea.id);
    expect(graph?.nodes.every((node) => node.source === "inferred")).toBe(true);
  });

  it("records the message the proposal came from", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, { ownerId: OWNER, title: "Café" });

    await proposeExtractedNodes(repository, {
      ideaId: idea.id,
      ownerId: OWNER,
      messages: [
        { id: "m1", role: "assistant", content: "¿Cómo cobrás?" },
        { id: "m2", role: "user", content: "Cobro 30 por mes" },
      ],
      extraction: { nodes: [{ type: "revenue", content: "30 por mes" }] },
    });

    const graph = await repository.loadGraph(idea.id);
    expect(graph?.nodes[0].messageId).toBe("m2");
    expect(graph?.nodes[0].confidence).toBeNull();
  });

  it("never overwrites a node the user edited", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, { ownerId: OWNER, title: "Café" });

    await proposeExtractedNodes(repository, {
      ideaId: idea.id,
      ownerId: OWNER,
      messages: [],
      extraction: { nodes: [{ type: "revenue", content: "Propuesta automática" }] },
    });

    const graph = await repository.loadGraph(idea.id);
    const proposal = graph!.nodes[0];

    // Un nodo `inferred` no se edita a mano: primero se acepta, y recién
    // después el usuario puede corregirlo (D3).
    await resolveProposal(repository, {
      ideaId: idea.id,
      nodeId: proposal.id,
      decision: "correct",
      content: "Suscripción de 40 por mes",
    });

    const outcome = await proposeExtractedNodes(repository, {
      ideaId: idea.id,
      ownerId: OWNER,
      messages: [],
      extraction: { nodes: [{ type: "revenue", content: "Otra propuesta" }] },
    });

    expect(outcome.proposals).toHaveLength(0);
    expect(outcome.skipped[0]).toEqual({
      type: "revenue",
      reason: "already_edited",
    });

    const after = await repository.loadGraph(idea.id);
    expect(after?.nodes).toHaveLength(1);
    expect(after?.nodes[0].content).toBe("Suscripción de 40 por mes");
    expect(after?.nodes[0].source).toBe("edited");
  });

  it("does not propose over a confirmed dimension", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, { ownerId: OWNER, title: "Café" });

    await proposeExtractedNodes(repository, {
      ideaId: idea.id,
      ownerId: OWNER,
      messages: [],
      extraction: { nodes: [{ type: "revenue", content: "30 por mes" }] },
    });

    const graph = await repository.loadGraph(idea.id);
    await confirmNode(repository, { ideaId: idea.id, nodeId: graph!.nodes[0].id });

    const outcome = await proposeExtractedNodes(repository, {
      ideaId: idea.id,
      ownerId: OWNER,
      messages: [],
      extraction: { nodes: [{ type: "revenue", content: "Otra" }] },
    });

    expect(outcome.proposals).toHaveLength(0);
    expect(outcome.skipped[0].reason).toBe("already_answered");
  });

  it("does not stack a second proposal for the same dimension", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, { ownerId: OWNER, title: "Café" });

    const first = await proposeExtractedNodes(repository, {
      ideaId: idea.id,
      ownerId: OWNER,
      messages: [],
      extraction: { nodes: [{ type: "revenue", content: "30 por mes" }] },
    });

    const second = await proposeExtractedNodes(repository, {
      ideaId: idea.id,
      ownerId: OWNER,
      messages: [],
      extraction: { nodes: [{ type: "revenue", content: "40 por mes" }] },
    });

    // The user has not answered the first question yet: asking again would
    // duplicate the same pending decision.
    expect(second.proposals).toHaveLength(0);
    expect(second.skipped[0].reason).toBe("pending_proposal");

    const graph = await repository.loadGraph(idea.id);
    expect(graph?.nodes).toHaveLength(1);
    expect(graph?.nodes[0].id).toBe(first.proposals[0].id);
  });
});

describe("resolveProposal", () => {
  it("accepts a proposal and confirms it", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, { ownerId: OWNER, title: "Café" });

    const outcome = await proposeExtractedNodes(repository, {
      ideaId: idea.id,
      ownerId: OWNER,
      messages: [],
      extraction: { nodes: [{ type: "revenue", content: "30 por mes" }] },
    });

    const result = await resolveProposal(repository, {
      ideaId: idea.id,
      nodeId: outcome.proposals[0].id,
      decision: "accept",
    });

    expect(result.source).toBe("confirmed");

    const graph = await repository.loadGraph(idea.id);
    expect(graph?.nodes[0].source).toBe("confirmed");
    expect(graph?.nodes[0].confidence).toBeNull();
  });

  it("corrects a proposal and marks it as edited", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, { ownerId: OWNER, title: "Café" });

    const outcome = await proposeExtractedNodes(repository, {
      ideaId: idea.id,
      ownerId: OWNER,
      messages: [],
      extraction: { nodes: [{ type: "revenue", content: "30 por mes" }] },
    });

    const result = await resolveProposal(repository, {
      ideaId: idea.id,
      nodeId: outcome.proposals[0].id,
      decision: "correct",
      content: "40 por mes, con envío gratis",
    });

    expect(result.source).toBe("edited");
    expect(result.node?.content).toBe("40 por mes, con envío gratis");
  });

  it("discards a proposal", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, { ownerId: OWNER, title: "Café" });

    const outcome = await proposeExtractedNodes(repository, {
      ideaId: idea.id,
      ownerId: OWNER,
      messages: [],
      extraction: { nodes: [{ type: "revenue", content: "30 por mes" }] },
    });

    const result = await resolveProposal(repository, {
      ideaId: idea.id,
      nodeId: outcome.proposals[0].id,
      decision: "discard",
    });

    expect(result.node).toBeNull();
    expect((await repository.loadGraph(idea.id))?.nodes).toHaveLength(0);
  });

  it("refuses to correct with an empty text", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, { ownerId: OWNER, title: "Café" });

    const outcome = await proposeExtractedNodes(repository, {
      ideaId: idea.id,
      ownerId: OWNER,
      messages: [],
      extraction: { nodes: [{ type: "revenue", content: "30 por mes" }] },
    });

    await expect(
      resolveProposal(repository, {
        ideaId: idea.id,
        nodeId: outcome.proposals[0].id,
        decision: "correct",
        content: "  ",
      }),
    ).rejects.toThrow();
  });
});

describe("extractKnowledge", () => {
  it("proposes nothing when the user has not said anything", async () => {
    const repository = new InMemoryIdeaRepository();
    const messages = new InMemoryMessageRepository();
    const idea = await createIdea(repository, { ownerId: OWNER, title: "Café" });

    const result = await extractKnowledge(
      {
        ideas: repository,
        messages,
        extractor: new RehearsalExtractor(),
        quota: new InMemoryUsageQuota(),
      },
      { ideaId: idea.id, ownerId: OWNER },
    );

    expect(result.outcome.proposals).toHaveLength(0);
  });

  it("proposes a node when the user describes the revenue", async () => {
    const repository = new InMemoryIdeaRepository();
    const messages = new InMemoryMessageRepository();
    const idea = await createIdea(repository, { ownerId: OWNER, title: "Café" });

    await messages.add({
      ideaId: idea.id,
      role: "user",
      content: "Voy a cobrar una suscripción de 30 pesos por mes",
    });

    const result = await extractKnowledge(
      {
        ideas: repository,
        messages,
        extractor: new RehearsalExtractor(),
        quota: new InMemoryUsageQuota(),
      },
      { ideaId: idea.id, ownerId: OWNER },
    );

    expect(result.outcome.proposals.length).toBeGreaterThan(0);
    expect(result.outcome.proposals.map((p) => p.type)).toContain("revenue");

    const graph = await repository.loadGraph(idea.id);
    expect(graph?.nodes[0].source).toBe("inferred");
  });

  it("refuses an idea owned by somebody else", async () => {
    const repository = new InMemoryIdeaRepository();
    const messages = new InMemoryMessageRepository();
    const idea = await createIdea(repository, { ownerId: OWNER, title: "Café" });

    await expect(
      extractKnowledge(
        {
          ideas: repository,
          messages,
          extractor: new RehearsalExtractor(),
          quota: new InMemoryUsageQuota(),
        },
        { ideaId: idea.id, ownerId: OTHER },
      ),
    ).rejects.toBeInstanceOf(IdeaNotFoundError);
  });

  it("reports the quota instead of calling the extractor", async () => {
    const repository = new InMemoryIdeaRepository();
    const messages = new InMemoryMessageRepository();
    const idea = await createIdea(repository, { ownerId: OWNER, title: "Café" });

    await messages.add({
      ideaId: idea.id,
      role: "user",
      content: "Cobro una suscripción de 30 por mes",
    });

    const quota = new InMemoryUsageQuota(0);

    const result = await extractKnowledge(
      {
        ideas: repository,
        messages,
        extractor: new RehearsalExtractor(),
        quota,
      },
      { ideaId: idea.id, ownerId: OWNER },
    );

    expect(result.quotaReached).toBe(true);
    expect(result.outcome.proposals).toHaveLength(0);
  });

  it("discards an invalid extraction without persisting anything", async () => {
    const repository = new InMemoryIdeaRepository();
    const messages = new InMemoryMessageRepository();
    const idea = await createIdea(repository, { ownerId: OWNER, title: "Café" });

    await messages.add({
      ideaId: idea.id,
      role: "user",
      content: "Cobro una suscripción de 30 por mes",
    });

    const result = await extractKnowledge(
      {
        ideas: repository,
        messages,
        extractor: { extract: async () => "esto no es json" },
        quota: new InMemoryUsageQuota(),
      },
      { ideaId: idea.id, ownerId: OWNER },
    );

    expect(result.outcome.proposals).toHaveLength(0);
    expect((await repository.loadGraph(idea.id))?.nodes).toHaveLength(0);
  });
});
