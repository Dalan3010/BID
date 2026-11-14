import { NODE_TYPES, type Idea } from "@bid/core";
import { describe, expect, it } from "vitest";

import type { IdeaProgress } from "./api";
import { CANVAS_BLOCKS, CANVAS_TEMPLATE, buildCanvas } from "./canvas";
import { buildDimensionViews, statusesFromAgenda } from "./dimensions";
import { countByStage, filterIdeas, ideaStage } from "./ideas-filter";

function row(title: string, completion: number, gaps: number, summary = ""): IdeaProgress {
  const idea: Idea = {
    id: title,
    ownerId: "owner",
    title,
    summary,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  return { idea, completion, gaps, nodeCount: 0, agenda: [] };
}

const ideas = [
  row("Café de especialidad", 1, 0),
  row("Tuppers reutilizables", 0.2, 8, "para restaurantes"),
  row("Organizador de viajes", 0, 10),
];

describe("ideas filter", () => {
  it("derives the stage from the real completion", () => {
    expect(ideas.map(ideaStage)).toEqual(["complete", "progress", "empty"]);
  });

  it("searches title and summary, ignoring case and accents", () => {
    expect(filterIdeas(ideas, "cafe", "all").map((entry) => entry.idea.title)).toEqual([
      "Café de especialidad",
    ]);
    expect(filterIdeas(ideas, "RESTAURANTES", "all")).toHaveLength(1);
    expect(filterIdeas(ideas, "  ", "all")).toHaveLength(3);
  });

  it("combines search and stage", () => {
    expect(filterIdeas(ideas, "", "empty").map((entry) => entry.idea.title)).toEqual([
      "Organizador de viajes",
    ]);
    expect(filterIdeas(ideas, "cafe", "empty")).toHaveLength(0);
    expect(countByStage(ideas)).toEqual({ all: 3, empty: 1, progress: 1, complete: 1 });
  });
});

describe("statusesFromAgenda", () => {
  it("marks dimensions absent from the agenda as validated", () => {
    const statuses = statusesFromAgenda([
      { type: "costs", hasProposals: false },
      { type: "metrics", hasProposals: true },
    ]);

    expect(statuses).toHaveLength(10);
    expect(statuses.find((item) => item.type === "problem")?.status).toBe("validated");
    expect(statuses.find((item) => item.type === "costs")?.status).toBe("open");
    expect(statuses.find((item) => item.type === "metrics")?.status).toBe("pending");
  });
});

describe("canvas", () => {
  it("places every dimension exactly once", () => {
    expect(CANVAS_BLOCKS.map((block) => block.type).toSorted()).toEqual([...NODE_TYPES].toSorted());
  });

  it("uses only areas the grid template defines", () => {
    for (const block of CANVAS_BLOCKS) {
      expect(CANVAS_TEMPLATE).toContain(block.area);
    }
  });

  it("carries the same views the plan uses", () => {
    const blocks = buildCanvas(buildDimensionViews([]));
    expect(blocks).toHaveLength(10);
    expect(blocks.every((block) => block.view.status === "open")).toBe(true);
  });
});
