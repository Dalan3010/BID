import { describe, expect, it } from "vitest";
import type { IdeaGraph, IdeaNode } from "../types";
import { diffGraphs } from "./diff";

function makeNode(
  overrides: Pick<IdeaNode, "type" | "source"> & Partial<IdeaNode>,
): IdeaNode {
  return {
    id: `node-${overrides.type}`,
    ideaId: "idea-1",
    content: "content",
    messageId: null,
    confidence: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeGraph(...nodes: IdeaNode[]): IdeaGraph {
  return { ideaId: "idea-1", nodes };
}

describe("diffGraphs", () => {
  it("reports every node as added when there is no previous graph", () => {
    const a = makeNode({ id: "a", type: "problem", source: "confirmed" });
    const b = makeNode({ id: "b", type: "segment", source: "edited" });

    const diff = diffGraphs(null, makeGraph(a, b));

    expect(diff.added).toEqual([a, b]);
    expect(diff.modified).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it("reports a node as added when its id did not exist before", () => {
    const kept = makeNode({ id: "kept", type: "problem", source: "confirmed" });
    const fresh = makeNode({ id: "fresh", type: "segment", source: "edited" });

    const diff = diffGraphs(makeGraph(kept), makeGraph(kept, fresh));

    expect(diff.added).toEqual([fresh]);
  });

  it("reports a content edit as modified and keeps both versions", () => {
    const before = makeNode({ id: "a", type: "problem", source: "confirmed", content: "old" });
    const after = makeNode({ id: "a", type: "problem", source: "confirmed", content: "new" });

    const diff = diffGraphs(makeGraph(before), makeGraph(after));

    expect(diff.modified).toEqual([{ before, after }]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it("reports a source change as modified", () => {
    const before = makeNode({ id: "a", type: "problem", source: "inferred" });
    const after = makeNode({ id: "a", type: "problem", source: "confirmed" });

    const diff = diffGraphs(makeGraph(before), makeGraph(after));

    expect(diff.modified).toEqual([{ before, after }]);
  });

  it("reports a removed node when it disappears", () => {
    const kept = makeNode({ id: "kept", type: "problem", source: "confirmed" });
    const gone = makeNode({ id: "gone", type: "segment", source: "confirmed" });

    const diff = diffGraphs(makeGraph(kept, gone), makeGraph(kept));

    expect(diff.removed).toEqual([gone]);
    expect(diff.added).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it("produces no entries for unchanged nodes", () => {
    const a = makeNode({ id: "a", type: "problem", source: "confirmed" });
    const b = makeNode({ id: "b", type: "segment", source: "edited" });

    const diff = diffGraphs(makeGraph(a, b), makeGraph(a, b));

    expect(diff).toEqual({ added: [], modified: [], removed: [] });
  });

  it("ignores timestamp, messageId and confidence changes", () => {
    const before = makeNode({
      id: "a",
      type: "problem",
      source: "confirmed",
      messageId: "message-1",
      confidence: 0.9,
    });
    const after = makeNode({
      id: "a",
      type: "problem",
      source: "confirmed",
      messageId: "message-2",
      confidence: 0.4,
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });

    const diff = diffGraphs(makeGraph(before), makeGraph(after));

    expect(diff.modified).toEqual([]);
  });

  it("follows next order for added and modified, previous order for removed", () => {
    const removedOld = makeNode({ id: "old-1", type: "problem", source: "confirmed" });
    const removedNew = makeNode({ id: "old-2", type: "segment", source: "confirmed" });
    const changed = makeNode({ id: "changed", type: "revenue", source: "confirmed", content: "before" });
    const addedA = makeNode({ id: "new-a", type: "costs", source: "edited" });
    const addedB = makeNode({ id: "new-b", type: "risks", source: "edited" });

    const previous = makeGraph(removedOld, changed, removedNew);
    const next = makeGraph(
      addedB,
      { ...changed, content: "after" },
      addedA,
    );

    const diff = diffGraphs(previous, next);

    expect(diff.added.map((node) => node.id)).toEqual(["new-b", "new-a"]);
    expect(diff.modified.map((entry) => entry.after.id)).toEqual(["changed"]);
    expect(diff.removed.map((node) => node.id)).toEqual(["old-1", "old-2"]);
  });

  it("does not mutate its inputs", () => {
    const a = makeNode({ id: "a", type: "problem", source: "confirmed", content: "before" });
    const b = makeNode({ id: "b", type: "segment", source: "confirmed" });
    const previous = makeGraph(a, b);
    const next = makeGraph({ ...a, content: "after" });
    const previousSnapshot = JSON.parse(JSON.stringify(previous));
    const nextSnapshot = JSON.parse(JSON.stringify(next));

    diffGraphs(previous, next);

    expect(previous).toEqual(previousSnapshot);
    expect(next).toEqual(nextSnapshot);
  });
});
