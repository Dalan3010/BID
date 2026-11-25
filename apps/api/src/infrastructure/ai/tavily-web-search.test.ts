import { describe, expect, it } from "vitest";

import { TavilyWebSearch } from "./tavily-web-search";

type Recorded = { readonly url: string; readonly init: RequestInit };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function recordingFetch(body: unknown, calls: Recorded[]): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });

    return jsonResponse(body);
  }) as typeof fetch;
}

describe("TavilyWebSearch", () => {
  it("posts the query to Tavily and maps the results to title, url and snippet", async () => {
    const calls: Recorded[] = [];
    const search = new TavilyWebSearch(
      "tvly-test-key",
      recordingFetch(
        {
          results: [
            {
              title: "Tostadores del Sur",
              url: "https://example.com/tostadores",
              content: "Tuestan granos de café a pedido.",
            },
            {
              title: "Empaques Lima",
              url: "https://example.com/empaques",
              content: "Cajas y bolsas compostables.",
            },
          ],
        },
        calls,
      ),
    );

    const results = await search.search("proveedores de café en Lima");

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.tavily.com/search");
    expect(calls[0]?.init.method).toBe("POST");

    const body = JSON.parse(String(calls[0]?.init.body)) as {
      api_key?: string;
      query?: string;
      max_results?: number;
    };
    expect(body.api_key).toBe("tvly-test-key");
    expect(body.query).toBe("proveedores de café en Lima");
    expect(body.max_results).toBe(5);

    expect(results).toEqual([
      {
        title: "Tostadores del Sur",
        url: "https://example.com/tostadores",
        snippet: "Tuestan granos de café a pedido.",
      },
      {
        title: "Empaques Lima",
        url: "https://example.com/empaques",
        snippet: "Cajas y bolsas compostables.",
      },
    ]);
  });

  it("throws on a non-2xx answer, naming the status", async () => {
    const search = new TavilyWebSearch(
      "tvly-test-key",
      (async () => jsonResponse({ detail: "unauthorized" }, 401)) as typeof fetch,
    );

    await expect(search.search("rutas de reparto")).rejects.toThrow(/401/);
  });

  it("drops the results without a url and caps the list at five", async () => {
    const search = new TavilyWebSearch(
      "tvly-test-key",
      (async () =>
        jsonResponse({
          results: [
            { title: "Sin enlace", url: "", content: "no sirve" },
            { title: "Sin campo url", content: "tampoco sirve" },
            ...Array.from({ length: 6 }, (_, index) => ({
              title: `Proveedor ${index + 1}`,
              url: `https://example.com/${index + 1}`,
              content: `Detalle ${index + 1}`,
            })),
          ],
        })) as typeof fetch,
    );

    const results = await search.search("proveedores");

    expect(results).toHaveLength(5);
    expect(results.map((result) => result.url)).toEqual([
      "https://example.com/1",
      "https://example.com/2",
      "https://example.com/3",
      "https://example.com/4",
      "https://example.com/5",
    ]);
  });

  it("answers with no results when the body is not the expected shape", async () => {
    const search = new TavilyWebSearch(
      "tvly-test-key",
      (async () => jsonResponse({ results: "ninguno" })) as typeof fetch,
    );

    expect(await search.search("locales en alquiler")).toEqual([]);
  });
});
