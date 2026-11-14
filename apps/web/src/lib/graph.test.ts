import type { IdeaNode } from "@bid/core";
import { describe, expect, it } from "vitest";

import { applyResolution, pendingProposals } from "./graph";

const base: IdeaNode = {
  id: "n1",
  ideaId: "idea",
  type: "revenue",
  content: "Suscripción",
  source: "inferred",
  messageId: null,
  confidence: 0.8,
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("applyResolution", () => {
  it("replaces the proposal with the node the server returned", () => {
    const confirmed: IdeaNode = { ...base, source: "confirmed", confidence: null };

    const result = applyResolution([base], "n1", { source: "confirmed", node: confirmed });

    expect(result).toEqual([confirmed]);
  });

  it("removes a discarded proposal", () => {
    expect(applyResolution([base], "n1", { source: null, node: null })).toEqual([]);
  });
});

describe("pendingProposals", () => {
  it("keeps only inferred nodes, oldest first", () => {
    const older: IdeaNode = { ...base, id: "old", createdAt: "2026-01-01T00:00:00.000Z" };
    const confirmed: IdeaNode = { ...base, id: "c", source: "confirmed" };

    expect(pendingProposals([base, confirmed, older]).map((node) => node.id)).toEqual(["old", "n1"]);
  });
});
