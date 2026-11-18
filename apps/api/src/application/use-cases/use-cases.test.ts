import { beforeEach, describe, expect, it } from "vitest";

import {
  DimensionNotEmptyError,
  IdeaNotFoundError,
  InvalidIdeaError,
  InvalidNodeError,
  NodeNotEditableError,
  NodeNotFoundError,
  SourceTransitionError,
  VersionNotFoundError,
} from "../errors";
import { InMemoryIdeaRepository } from "../testing/in-memory-idea-repository";
import { confirmNode } from "./confirm-node";
import { createIdea } from "./create-idea";
import { createManualNode } from "./create-manual-node";
import { deleteIdea } from "./delete-idea";
import { diffIdeaVersion } from "./diff-idea-version";
import { editNode } from "./edit-node";
import { getCoachAgenda } from "./get-coach-agenda";
import { loadIdeaGraph } from "./load-idea-graph";
import { loadIdeaGraphForOwner } from "./load-idea-graph-for-owner";
import { listIdeasWithProgress } from "./list-ideas-with-progress";
import { listIdeaVersions } from "./list-idea-versions";
import { proposeNode } from "./propose-node";
import { updateIdea } from "./update-idea";

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

    await confirmNode(repository, { ideaId, nodeId: node!.id, ownerId: OWNER });

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
      ownerId: OWNER,
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

    await confirmNode(repository, { ideaId, nodeId: node!.id, ownerId: OWNER });

    const after = await getCoachAgenda(repository, ideaId);
    expect(after.gaps.map((gap) => gap.type)).not.toContain("segment");
  });

  it("refuses to demote an edited node", async () => {
    const { node } = await proposeNode(repository, {
      ideaId,
      type: "segment",
      content: "Offices",
    });
    await confirmNode(repository, { ideaId, nodeId: node!.id, ownerId: OWNER });
    await editNode(repository, {
      ideaId,
      nodeId: node!.id,
      ownerId: OWNER,
      content: "Offices of 10 to 50 people downtown",
    });

    await expect(
      confirmNode(repository, { ideaId, nodeId: node!.id, ownerId: OWNER }),
    ).rejects.toBeInstanceOf(SourceTransitionError);
  });

  it("fails when the node does not exist", async () => {
    await expect(
      confirmNode(repository, {
        ideaId,
        nodeId: "00000000-0000-4000-8000-000000000000",
        ownerId: OWNER,
      }),
    ).rejects.toBeInstanceOf(NodeNotFoundError);
  });

  it("snapshots the graph when a proposal is confirmed", async () => {
    const { node } = await proposeNode(repository, {
      ideaId,
      type: "segment",
      content: "Offices of 10 to 50 people",
    });

    await confirmNode(repository, { ideaId, nodeId: node!.id, ownerId: OWNER });

    expect(await repository.listVersions(ideaId)).toHaveLength(1);
  });

  it("answers not-found for an idea owned by somebody else", async () => {
    const { node } = await proposeNode(repository, {
      ideaId,
      type: "segment",
      content: "Offices",
    });

    await expect(
      confirmNode(repository, { ideaId, nodeId: node!.id, ownerId: "intruder" }),
    ).rejects.toBeInstanceOf(IdeaNotFoundError);
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
      editNode(repository, {
        ideaId,
        nodeId,
        ownerId: OWNER,
        content: "Something else",
      }),
    ).rejects.toBeInstanceOf(NodeNotEditableError);
  });

  it("marks a confirmed node as edited", async () => {
    await confirmNode(repository, { ideaId, nodeId, ownerId: OWNER });

    const edited = await editNode(repository, {
      ideaId,
      nodeId,
      ownerId: OWNER,
      content: "Green beans, roasting and last-mile delivery",
    });

    expect(edited.source).toBe("edited");
    expect(edited.content).toBe("Green beans, roasting and last-mile delivery");
  });

  it("rejects emptying a node", async () => {
    await confirmNode(repository, { ideaId, nodeId, ownerId: OWNER });

    await expect(
      editNode(repository, { ideaId, nodeId, ownerId: OWNER, content: "   " }),
    ).rejects.toBeInstanceOf(InvalidNodeError);
  });

  it("edits an already edited node", async () => {
    await confirmNode(repository, { ideaId, nodeId, ownerId: OWNER });
    await editNode(repository, {
      ideaId,
      nodeId,
      ownerId: OWNER,
      content: "First manual answer",
    });

    const edited = await editNode(repository, {
      ideaId,
      nodeId,
      ownerId: OWNER,
      content: "Second manual answer",
    });

    expect(edited.source).toBe("edited");
    expect(edited.content).toBe("Second manual answer");
  });

  it("does not snapshot an edit that leaves the content unchanged", async () => {
    await confirmNode(repository, { ideaId, nodeId, ownerId: OWNER });
    await editNode(repository, {
      ideaId,
      nodeId,
      ownerId: OWNER,
      content: "Green beans and roasting",
    });

    const before = await repository.listVersions(ideaId);
    const result = await editNode(repository, {
      ideaId,
      nodeId,
      ownerId: OWNER,
      content: "  Green beans and roasting  ",
    });

    expect(result.content).toBe("Green beans and roasting");
    expect(await repository.listVersions(ideaId)).toHaveLength(before.length);
  });

  it("snapshots a real edit", async () => {
    await confirmNode(repository, { ideaId, nodeId, ownerId: OWNER });

    const before = await repository.listVersions(ideaId);
    await editNode(repository, {
      ideaId,
      nodeId,
      ownerId: OWNER,
      content: "Green beans, roasting and delivery",
    });

    expect(await repository.listVersions(ideaId)).toHaveLength(
      before.length + 1,
    );
  });

  it("answers not-found for an idea owned by somebody else", async () => {
    await confirmNode(repository, { ideaId, nodeId, ownerId: OWNER });

    await expect(
      editNode(repository, {
        ideaId,
        nodeId,
        ownerId: "intruder",
        content: "Anything",
      }),
    ).rejects.toBeInstanceOf(IdeaNotFoundError);
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
    await confirmNode(repository, {
      ideaId: idea.id,
      nodeId: node!.id,
      ownerId: OWNER,
    });

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

describe("createManualNode", () => {
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

  it("creates a validated node by hand", async () => {
    const node = await createManualNode(repository, {
      ideaId,
      ownerId: OWNER,
      type: "problem",
      content: "  Offices lack good coffee  ",
    });

    expect(node.source).toBe("edited");
    expect(node.type).toBe("problem");
    expect(node.content).toBe("Offices lack good coffee");
    expect(node.messageId).toBeNull();
    expect(node.confidence).toBeNull();
  });

  it("rejects empty content", async () => {
    await expect(
      createManualNode(repository, {
        ideaId,
        ownerId: OWNER,
        type: "problem",
        content: "   ",
      }),
    ).rejects.toBeInstanceOf(InvalidNodeError);
  });

  it("rejects a dimension that already has an inferred node", async () => {
    await proposeNode(repository, {
      ideaId,
      type: "problem",
      content: "Offices lack good coffee",
    });

    await expect(
      createManualNode(repository, {
        ideaId,
        ownerId: OWNER,
        type: "problem",
        content: "A manual answer",
      }),
    ).rejects.toBeInstanceOf(DimensionNotEmptyError);
  });

  it("rejects a dimension that already has a confirmed node", async () => {
    const { node } = await proposeNode(repository, {
      ideaId,
      type: "problem",
      content: "Offices lack good coffee",
    });
    await confirmNode(repository, { ideaId, nodeId: node!.id, ownerId: OWNER });

    await expect(
      createManualNode(repository, {
        ideaId,
        ownerId: OWNER,
        type: "problem",
        content: "A manual answer",
      }),
    ).rejects.toBeInstanceOf(DimensionNotEmptyError);
  });

  it("answers not-found for an idea owned by somebody else", async () => {
    await expect(
      createManualNode(repository, {
        ideaId,
        ownerId: "intruder",
        type: "problem",
        content: "A manual answer",
      }),
    ).rejects.toBeInstanceOf(IdeaNotFoundError);
  });

  it("snapshots the graph after creating a node", async () => {
    await createManualNode(repository, {
      ideaId,
      ownerId: OWNER,
      type: "problem",
      content: "Offices lack good coffee",
    });

    const versions = await repository.listVersions(ideaId);
    expect(versions).toHaveLength(1);
    expect(versions[0].nodeCount).toBe(1);
  });
});

describe("updateIdea", () => {
  let repository: InMemoryIdeaRepository;
  let ideaId: string;

  beforeEach(async () => {
    repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, {
      ownerId: OWNER,
      title: "Coffee subscription",
      summary: "Old summary",
    });
    ideaId = idea.id;
  });

  it("trims the title and the summary", async () => {
    const updated = await updateIdea(repository, {
      ideaId,
      ownerId: OWNER,
      title: "  Coffee for offices  ",
      summary: "  Weekly delivery  ",
    });

    expect(updated.title).toBe("Coffee for offices");
    expect(updated.summary).toBe("Weekly delivery");
  });

  it("accepts an empty summary", async () => {
    const updated = await updateIdea(repository, {
      ideaId,
      ownerId: OWNER,
      summary: "   ",
    });

    expect(updated.summary).toBe("");
  });

  it("rejects a blank title", async () => {
    await expect(
      updateIdea(repository, { ideaId, ownerId: OWNER, title: "   " }),
    ).rejects.toBeInstanceOf(InvalidIdeaError);
  });

  it("answers not-found for an idea owned by somebody else", async () => {
    await expect(
      updateIdea(repository, {
        ideaId,
        ownerId: "intruder",
        title: "Renamed",
      }),
    ).rejects.toBeInstanceOf(IdeaNotFoundError);
  });

  it("updates the timestamp", async () => {
    const before = await repository.findById(ideaId);
    await new Promise((resolve) => setTimeout(resolve, 5));

    const updated = await updateIdea(repository, {
      ideaId,
      ownerId: OWNER,
      title: "Renamed",
    });

    expect(updated.updatedAt).not.toBe(before!.updatedAt);
  });

  it("does not snapshot a metadata change", async () => {
    await updateIdea(repository, { ideaId, ownerId: OWNER, title: "Renamed" });

    expect(await repository.listVersions(ideaId)).toHaveLength(0);
  });
});

describe("deleteIdea", () => {
  it("deletes the idea and its graph", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, {
      ownerId: OWNER,
      title: "Coffee subscription",
    });

    await deleteIdea(repository, { ideaId: idea.id, ownerId: OWNER });

    expect(await repository.findById(idea.id)).toBeNull();
    expect(await repository.loadGraph(idea.id)).toBeNull();
  });

  it("answers not-found for an idea owned by somebody else", async () => {
    const repository = new InMemoryIdeaRepository();
    const idea = await createIdea(repository, {
      ownerId: OWNER,
      title: "Coffee subscription",
    });

    await expect(
      deleteIdea(repository, { ideaId: idea.id, ownerId: "intruder" }),
    ).rejects.toBeInstanceOf(IdeaNotFoundError);
    expect(await repository.findById(idea.id)).not.toBeNull();
  });
});

describe("listIdeaVersions", () => {
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

  it("lists the snapshots newest first", async () => {
    await createManualNode(repository, {
      ideaId,
      ownerId: OWNER,
      type: "problem",
      content: "Offices lack good coffee",
    });
    await createManualNode(repository, {
      ideaId,
      ownerId: OWNER,
      type: "segment",
      content: "Small offices",
    });

    const versions = await listIdeaVersions(repository, {
      ideaId,
      ownerId: OWNER,
    });

    expect(versions.map((version) => version.version)).toEqual([2, 1]);
    expect(versions[0].nodeCount).toBe(2);
    expect(versions[1].nodeCount).toBe(1);
  });

  it("answers not-found for an idea owned by somebody else", async () => {
    await expect(
      listIdeaVersions(repository, { ideaId, ownerId: "intruder" }),
    ).rejects.toBeInstanceOf(IdeaNotFoundError);
  });

  it("answers not-found for an idea that does not exist", async () => {
    await expect(
      listIdeaVersions(repository, { ideaId: "missing", ownerId: OWNER }),
    ).rejects.toBeInstanceOf(IdeaNotFoundError);
  });
});

describe("diffIdeaVersion", () => {
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

  async function addNode(
    type: "problem" | "segment" | "revenue",
    content: string,
  ) {
    return repository.addNode({
      ideaId,
      type,
      content,
      source: "edited",
    });
  }

  it("reports every node as added for version 1", async () => {
    await addNode("problem", "Offices lack good coffee");
    await repository.saveVersion(ideaId);

    const diff = await diffIdeaVersion(repository, {
      ideaId,
      ownerId: OWNER,
      version: 1,
    });

    expect(diff.from).toBeNull();
    expect(diff.to).toEqual({ version: 1, createdAt: expect.any(String), nodeCount: 1 });
    expect(diff.added).toHaveLength(1);
    expect(diff.modified).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it("compares against the previous version by default", async () => {
    const kept = await addNode("problem", "Offices lack good coffee");
    const dropped = await addNode("segment", "Small offices");
    await repository.saveVersion(ideaId);

    await repository.updateNode(ideaId, kept.id, {
      content: "Offices lack great coffee",
    });
    await repository.removeNode(ideaId, dropped.id);
    await addNode("revenue", "Monthly subscription");
    await repository.saveVersion(ideaId);

    const diff = await diffIdeaVersion(repository, {
      ideaId,
      ownerId: OWNER,
      version: 2,
    });

    expect(diff.from?.version).toBe(1);
    expect(diff.to.version).toBe(2);
    expect(diff.added.map((node) => node.content)).toEqual([
      "Monthly subscription",
    ]);
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].after.content).toBe("Offices lack great coffee");
    expect(diff.removed.map((node) => node.content)).toEqual(["Small offices"]);
  });

  it("compares against an explicit version", async () => {
    await addNode("problem", "Offices lack good coffee");
    await repository.saveVersion(ideaId);

    await addNode("segment", "Small offices");
    await repository.saveVersion(ideaId);

    const diff = await diffIdeaVersion(repository, {
      ideaId,
      ownerId: OWNER,
      version: 2,
      against: 1,
    });

    expect(diff.from?.version).toBe(1);
    expect(diff.added.map((node) => node.content)).toEqual(["Small offices"]);
    expect(diff.removed).toEqual([]);
  });

  it("rejects a zero as the comparison version", async () => {
    await repository.saveVersion(ideaId);

    await expect(
      diffIdeaVersion(repository, {
        ideaId,
        ownerId: OWNER,
        version: 1,
        against: 0,
      }),
    ).rejects.toBeInstanceOf(InvalidIdeaError);
  });

  it("rejects a comparison version that is not older", async () => {
    await repository.saveVersion(ideaId);
    await repository.saveVersion(ideaId);

    await expect(
      diffIdeaVersion(repository, {
        ideaId,
        ownerId: OWNER,
        version: 2,
        against: 2,
      }),
    ).rejects.toBeInstanceOf(InvalidIdeaError);
  });

  it("answers not-found for a missing version", async () => {
    await repository.saveVersion(ideaId);

    await expect(
      diffIdeaVersion(repository, { ideaId, ownerId: OWNER, version: 9 }),
    ).rejects.toBeInstanceOf(VersionNotFoundError);
  });

  it("answers not-found for an idea owned by somebody else", async () => {
    await repository.saveVersion(ideaId);

    await expect(
      diffIdeaVersion(repository, {
        ideaId,
        ownerId: "intruder",
        version: 1,
      }),
    ).rejects.toBeInstanceOf(IdeaNotFoundError);
  });
});
