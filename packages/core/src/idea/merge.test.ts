import { describe, expect, it } from "vitest";

import {
  canTransition,
  isEditable,
  outranks,
  resolveConflict,
  SOURCE_RANK,
} from "./merge";
import type { NodeSource } from "./types";

const SOURCES: readonly NodeSource[] = ["inferred", "confirmed", "edited"];

describe("SOURCE_RANK", () => {
  it("orders provenance as edited > confirmed > inferred", () => {
    expect(SOURCE_RANK.edited).toBeGreaterThan(SOURCE_RANK.confirmed);
    expect(SOURCE_RANK.confirmed).toBeGreaterThan(SOURCE_RANK.inferred);
  });
});

describe("outranks", () => {
  it("never lets a lower rank beat a higher one", () => {
    expect(outranks("inferred", "confirmed")).toBe(false);
    expect(outranks("inferred", "edited")).toBe(false);
    expect(outranks("confirmed", "edited")).toBe(false);
  });

  it("lets a higher rank beat a lower one", () => {
    expect(outranks("confirmed", "inferred")).toBe(true);
    expect(outranks("edited", "inferred")).toBe(true);
    expect(outranks("edited", "confirmed")).toBe(true);
  });

  it("treats equal provenance as not outranking", () => {
    for (const source of SOURCES) {
      expect(outranks(source, source)).toBe(false);
    }
  });
});

describe("canTransition", () => {
  it("allows promoting a node", () => {
    expect(canTransition("inferred", "confirmed")).toBe(true);
    expect(canTransition("inferred", "edited")).toBe(true);
    expect(canTransition("confirmed", "edited")).toBe(true);
  });

  it("rejects demoting a node", () => {
    expect(canTransition("confirmed", "inferred")).toBe(false);
    expect(canTransition("edited", "confirmed")).toBe(false);
    expect(canTransition("edited", "inferred")).toBe(false);
  });

  it("allows staying at the same provenance", () => {
    for (const source of SOURCES) {
      expect(canTransition(source, source)).toBe(true);
    }
  });
});

describe("isEditable", () => {
  it("only allows direct editing of validated knowledge", () => {
    expect(isEditable("inferred")).toBe(false);
    expect(isEditable("confirmed")).toBe(true);
    expect(isEditable("edited")).toBe(true);
  });
});

describe("resolveConflict", () => {
  type Candidate = { readonly source: NodeSource; readonly content: string };

  it("keeps the existing value when the incoming one is less trustworthy", () => {
    const existing: Candidate = { source: "edited", content: "user wording" };
    const incoming: Candidate = { source: "inferred", content: "ai guess" };

    expect(resolveConflict(existing, incoming)).toBe(existing);
  });

  it("keeps the existing value on a tie", () => {
    const existing: Candidate = { source: "confirmed", content: "first" };
    const incoming: Candidate = { source: "confirmed", content: "second" };

    expect(resolveConflict(existing, incoming)).toBe(existing);
  });

  it("takes the incoming value when it is strictly more trustworthy", () => {
    const existing: Candidate = { source: "inferred", content: "ai guess" };
    const incoming: Candidate = { source: "confirmed", content: "validated" };

    expect(resolveConflict(existing, incoming)).toBe(incoming);
  });
});
