import type {
  SearchResult,
  WebSearch,
} from "../../application/ports/web-search";

const ENDPOINT = "https://api.tavily.com/search";

/**
 * How many results the coach gets per query.
 *
 * Enough to compare two or three suppliers, small enough to keep the tool
 * result inside a prompt without drowning the conversation.
 */
const MAX_RESULTS = 5;

/**
 * The web search backed by Tavily.
 *
 * It replaces Gemini's built-in Google Search grounding, whose own quota
 * requires a paid tier: the search is a separate, free-tier service, so the
 * coach can still ground its answers when the provider's grounding is not
 * available (D-B).
 *
 * `fetch` is injected so the tests exercise the request and the mapping
 * without a network.
 */
export class TavilyWebSearch implements WebSearch {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async search(query: string): Promise<readonly SearchResult[]> {
    const response = await this.fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        max_results: MAX_RESULTS,
        search_depth: "basic",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Tavily search failed with status ${response.status}.`,
      );
    }

    // The body is not the place to be strict: a search that answers something
    // unexpected is treated as "no results", never as a broken chat turn.
    const body = (await response.json().catch(() => null)) as {
      results?: unknown;
    } | null;
    const results = body?.results;

    if (!Array.isArray(results)) {
      return [];
    }

    return results
      .map(toSearchResult)
      .filter((result): result is SearchResult => result !== null)
      .slice(0, MAX_RESULTS);
  }
}

/**
 * Reads one entry of the response.
 *
 * Tavily calls the excerpt `content`. An entry without a link is useless as a
 * citation, so it is dropped instead of silently shown as sourceless data.
 */
function toSearchResult(entry: unknown): SearchResult | null {
  if (typeof entry !== "object" || entry === null) {
    return null;
  }

  const candidate = entry as {
    title?: unknown;
    url?: unknown;
    content?: unknown;
  };
  const url = typeof candidate.url === "string" ? candidate.url.trim() : "";

  if (url === "") {
    return null;
  }

  return {
    title: typeof candidate.title === "string" ? candidate.title : "",
    url,
    snippet: typeof candidate.content === "string" ? candidate.content : "",
  };
}
