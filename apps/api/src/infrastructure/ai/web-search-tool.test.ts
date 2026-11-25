import { describe, expect, it, vi } from "vitest";

import type { WebSearch } from "../../application/ports/web-search";
import { createWebSearchTool, SEARCH_UNAVAILABLE } from "./web-search-tool";

/** A searcher with a fixed answer. */
function searcher(results: Awaited<ReturnType<WebSearch["search"]>>): WebSearch {
  return { search: async () => results };
}

/** Runs the tool the way the model would, and returns its text answer. */
async function run(search: WebSearch, query = "proveedores de café Rosario") {
  const tool = createWebSearchTool(search);
  return (await tool.execute?.({ query }, {} as never)) as string;
}

describe("createWebSearchTool", () => {
  it("hands the model the results as a numbered list with their links", async () => {
    const text = await run(
      searcher([
        { title: "Tostadores del Sur", url: "https://sur.example/tostado", snippet: "Grano fresco" },
        { title: "Café Central", url: "https://central.example", snippet: "Venta mayorista" },
      ]),
    );

    expect(text).toContain("1. Tostadores del Sur — https://sur.example/tostado — Grano fresco");
    expect(text).toContain("2. Café Central — https://central.example — Venta mayorista");
  });

  it("says there is nothing when the search finds nothing", async () => {
    expect(await run(searcher([]))).toBe("Sin resultados.");
  });

  it("never breaks the turn: a failed search becomes an honest instruction", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const failing: WebSearch = {
      search: async () => {
        throw new Error("Tavily search failed with status 401.");
      },
    };

    // The important part: it resolves. A throw here would end the coach's turn
    // empty and the person would get the script instead of an answer.
    await expect(run(failing)).resolves.toBe(SEARCH_UNAVAILABLE);
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });
});
