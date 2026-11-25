import { tool } from "ai";
import { z } from "zod";

import type { WebSearch } from "../../application/ports/web-search";

/**
 * What the model reads when the search failed.
 *
 * It is an instruction and not an error on purpose: the turn must survive a
 * broken search. Throwing here ended the coach's stream without a single word,
 * the fallback answered from the script, and the person saw the same sentence
 * again — the failure this whole change is about.
 */
export const SEARCH_UNAVAILABLE =
  "La búsqueda web no está disponible en este momento. Responde con lo que sabes y dilo con franqueza; no inventes datos ni enlaces.";

/**
 * The research tool the coach travels with.
 *
 * It returns plain text — a numbered list of `título — enlace — fragmento` —
 * because that is what the model reads best and what it can cite verbatim. The
 * port (`WebSearch`) is the only thing it knows about the outside world.
 */
export function createWebSearchTool(webSearch: WebSearch) {
  return tool({
    description:
      "Busca datos reales en la web: proveedores, rutas, locales, precios " +
      "y cualquier dato del mundo que no esté en la conversación. Cita el " +
      "enlace de cada dato que uses.",
    inputSchema: z.object({ query: z.string().min(1) }),
    execute: async ({ query }) => {
      try {
        const results = await webSearch.search(query);

        if (results.length === 0) {
          return "Sin resultados.";
        }

        return results
          .map(
            (result, index) =>
              `${index + 1}. ${result.title} — ${result.url} — ${result.snippet}`,
          )
          .join("\n");
      } catch (error) {
        console.warn("[coach] la búsqueda web falló:", error);
        return SEARCH_UNAVAILABLE;
      }
    },
  });
}
