import { beforeEach, describe, expect, it } from "vitest";

import {
  IdeaNotFoundError,
  InvalidIdeaError,
  InvalidNodeError,
  NodeNotEditableError,
  NodeNotFoundError,
  SourceTransitionError,
} from "../errors";
import { InMemoryIdeaRepository } from "../testing/in-memory-idea-repository";
import { confirmNode } from "./confirm-node";
import { createIdea } from "./create-idea";
import { editNode } from "./edit-node";
import { getCoachAgenda } from "./get-coach-agenda";
import { loadIdeaGraph } from "./load-idea-graph";
import { loadIdeaGraphForOwner } from "./load-idea-graph-for-owner";
import { listIdeasWithProgress } from "./list-ideas-with-progress";
import { proposeNode } from "./propose-node";

const OWNER = "owner-1";

describe("createIdea", () => {
  let repository: InMemoryIdeaRepository;

  beforeEach(() => {
    repository = new InMemoryIdeaRepository();
  });

  it("creates an idea owned by the caller", async () => {
    const idea = await createIdea(repository, {
      ownerId: OWNER,
      title: "Coffee subscription for offices",
    });

    expect(idea.ownerId).toBe(OWNER);
    expect(idea.title).toBe("Coffee subscription for offices");
    expect(idea.summary).toBe("");
    expect(await repository.findById(idea.id)).not.toBeNull();
  });

  it("trims the title and the summary", async () => {
    const idea = await createIdea(repository, {
      ownerId: OWNER,
      title: "   Coffee   ",
      summary: "  weekly delivery  ",
    });

    expect(idea.title).toBe("Coffee");
    expect(idea.summary).toBe("weekly delivery");
  });

  it("rejects an empty title", async () => {
    await expect(
      createIdea(repository, { ownerId: OWNER, title: "   " }),
    ).rejects.toBeInstanceOf(InvalidIdeaError);
  });

  it("rejects an empty owner", async () => {
    await expect(
      createIdea(repository, { ownerId: " ", title: "Coffee" }),
    ).rejects.toBeInstanceOf(InvalidIdeaError);
  });
});

describe("proposeNode", () => {
  let repository: InMemoryIdeaRepository;
  let ideaId: string;

  beforeEach(async () => {
    repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, {
      ownerId: OWNER,
      title: "Coffee subscription",
    });
    ideaId = idea.id;
  });

  it("always stores a proposal as inferred", async () => {
    const { node } = await proposeNode(repository, {
      ideaId,
      type: "revenue",
      content: "Monthly subscription per office",
      confidence: 0.8,
    });

    expect(node?.source).toBe("inferred");
    expect(node?.type).toBe("revenue");
    expect(node?.confidence).toBe(0.8);
  });

  it("rejects empty content", async () => {
    await expect(
      proposeNode(repository, { ideaId, type: "revenue", content: "  " }),
    ).rejects.toBeInstanceOf(InvalidNodeError);
  });

  it("fails when the idea does not exist", async () => {
    await expect(
      proposeNode(repository, {
        ideaId: "00000000-0000-4000-8000-000000000000",
        type: "revenue",
        content: "Anything",
      }),
    ).rejects.toBeInstanceOf(IdeaNotFoundError);
  });

  it("skips the proposal when the dimension is already answered", async () => {
    const { node } = await proposeNode(repository, {
      ideaId,
      type: "revenue",
      content: "Monthly subscription",
    });

    await confirmNode(repository, { ideaId, nodeId: node!.id });

    const second = await proposeNode(repository, {
      ideaId,
      type: "revenue",
      content: "A different guess",
    });

    expect(second.node).toBeNull();
    expect(second.skippedReason).toBe("already_answered");

    const graph = await loadIdeaGraph(repository, ideaId);
    expect(graph.nodes.filter((n) => n.type === "revenue")).toHaveLength(1);
  });

  it("allows several proposals for the same unanswered dimension", async () => {
    await proposeNode(repository, {
      ideaId,
      type: "revenue",
      content: "Monthly subscription",
    });
    await proposeNode(repository, {
      ideaId,
      type: "revenue",
      content: "One-off equipment sales",
    });

    const graph = await loadIdeaGraph(repository, ideaId);
    expect(graph.nodes.filter((n) => n.type === "revenue")).toHaveLength(2);
  });
});

describe("confirmNode", () => {
  let repository: InMemoryIdeaRepository;
  let ideaId: string;

  beforeEach(async () => {
    repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, {
      ownerId: OWNER,
      title: "Coffee subscription",
    });
    ideaId = idea.id;
  });

  it("promotes an inferred node to confirmed and clears confidence", async () => {
    const { node } = await proposeNode(repository, {
      ideaId,
      type: "segment",
      content: "Offices of 10 to 50 people",
      confidence: 0.7,
    });

    const confirmed = await confirmNode(repository, {
      ideaId,
      nodeId: node!.id,
    });

    expect(confirmed.source).toBe("confirmed");
    expect(confirmed.confidence).toBeNull();
  });

  it("closes the gap once the node is confirmed", async () => {
    const { node } = await proposeNode(repository, {
      ideaId,
      type: "segment",
      content: "Offices of 10 to 50 people",
    });

    const before = await getCoachAgenda(repository, ideaId);
    expect(before.gaps.map((gap) => gap.type)).toContain("segment");

    await confirmNode(repository, { ideaId, nodeId: node!.id });

    const after = await getCoachAgenda(repository, ideaId);
    expect(after.gaps.map((gap) => gap.type)).not.toContain("segment");
  });

  it("refuses to demote an edited node", async () => {
    const { node } = await proposeNode(repository, {
      ideaId,
      type: "segment",
      content: "Offices",
    });
    await confirmNode(repository, { ideaId, nodeId: node!.id });
    await editNode(repository, {
      ideaId,
      nodeId: node!.id,
      content: "Offices of 10 to 50 people downtown",
    });

    await expect(
      confirmNode(repository, { ideaId, nodeId: node!.id }),
    ).rejects.toBeInstanceOf(SourceTransitionError);
  });

  it("fails when the node does not exist", async () => {
    await expect(
      confirmNode(repository, {
        ideaId,
        nodeId: "00000000-0000-4000-8000-000000000000",
      }),
    ).rejects.toBeInstanceOf(NodeNotFoundError);
  });
});

describe("editNode", () => {
  let repository: InMemoryIdeaRepository;
  let ideaId: string;
  let nodeId: string;

  beforeEach(async () => {
    repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, {
      ownerId: OWNER,
      title: "Coffee subscription",
    });
    ideaId = idea.id;

    const { node } = await proposeNode(repository, {
      ideaId,
      type: "costs",
      content: "Green beans and roasting",
    });
    nodeId = node!.id;
  });

  it("refuses to edit an inferred node", async () => {
    await expect(
      editNode(repository, { ideaId, nodeId, content: "Something else" }),
    ).rejects.toBeInstanceOf(NodeNotEditableError);
  });

  it("marks a confirmed node as edited", async () => {
    await confirmNode(repository, { ideaId, nodeId });

    const edited = await editNode(repository, {
      ideaId,
      nodeId,
      content: "Green beans, roasting and last-mile delivery",
    });

    expect(edited.source).toBe("edited");
    expect(edited.content).toBe("Green beans, roasting and last-mile delivery");
  });

  it("rejects emptying a node", async () => {
    await confirmNode(repository, { ideaId, nodeId });

    await expect(
      editNode(repository, { ideaId, nodeId, content: "   " }),
    ).rejects.toBeInstanceOf(InvalidNodeError);
  });
});

describe("getCoachAgenda", () => {
  it("starts with all ten dimensions open and nothing completed", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, {
      ownerId: OWNER,
      title: "Coffee subscription",
    });

    const agenda = await getCoachAgenda(repository, idea.id);

    expect(agenda.gaps).toHaveLength(10);
    expect(agenda.completion).toBe(0);
  });

  it("reports a dimension with only proposals as still open", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, {
      ownerId: OWNER,
      title: "Coffee subscription",
    });

    await proposeNode(repository, {
      ideaId: idea.id,
      type: "problem",
      content: "Offices lack good coffee",
    });

    const agenda = await getCoachAgenda(repository, idea.id);
    const problem = agenda.gaps.find((gap) => gap.type === "problem");

    expect(problem?.hasProposals).toBe(true);
    expect(agenda.completion).toBe(0);
  });
});

describe("loadIdeaGraphForOwner", () => {
  it("returns the graph when the caller owns the idea", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, {
      ownerId: OWNER,
      title: "Coffee subscription",
    });

    const graph = await loadIdeaGraphForOwner(repository, {
      ideaId: idea.id,
      ownerId: OWNER,
    });

    expect(graph.ideaId).toBe(idea.id);
  });

  it("answers not-found for an idea owned by somebody else", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, {
      ownerId: OWNER,
      title: "Coffee subscription",
    });

    await expect(
      loadIdeaGraphForOwner(repository, {
        ideaId: idea.id,
        ownerId: "another-user",
      }),
    ).rejects.toBeInstanceOf(IdeaNotFoundError);
  });

  it("answers not-found for an idea that does not exist", async () => {
    const repository = new InMemoryIdeaRepository();

    await expect(
      loadIdeaGraphForOwner(repository, {
        ideaId: "00000000-0000-4000-8000-000000000000",
        ownerId: OWNER,
      }),
    ).rejects.toBeInstanceOf(IdeaNotFoundError);
  });
});

describe("listIdeasWithProgress", () => {
  it("reports no progress for a fresh idea", async () => {
    const repository = new InMemoryIdeaRepository();
    await createIdea(repository, { ownerId: OWNER, title: "Coffee" });

    const [progress] = await listIdeasWithProgress(repository, OWNER);

    expect(progress.completion).toBe(0);
    expect(progress.gaps).toBe(10);
    expect(progress.nodeCount).toBe(0);
  });

  it("counts a confirmed node as progress", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, {
      ownerId: OWNER,
      title: "Coffee",
    });

    const { node } = await proposeNode(repository, {
      ideaId: idea.id,
      type: "problem",
      content: "Offices lack good coffee",
    });
    await confirmNode(repository, { ideaId: idea.id, nodeId: node!.id });

    const [progress] = await listIdeasWithProgress(repository, OWNER);

    expect(progress.completion).toBeCloseTo(0.1);
    expect(progress.gaps).toBe(9);
    expect(progress.nodeCount).toBe(1);
  });

  it("does not list ideas owned by somebody else", async () => {
    const repository = new InMemoryIdeaRepository();
    await createIdea(repository, { ownerId: OWNER, title: "Mine" });

    expect(await listIdeasWithProgress(repository, "another-user")).toEqual([]);
  });
});
