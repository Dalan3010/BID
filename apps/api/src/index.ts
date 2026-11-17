import { serve } from "@hono/node-server";

import { app } from "./app";

/**
 * The server entry point.
 *
 * The port is configurable so the client can point at it from an environment
 * variable instead of a hardcoded URL.
 */
const port = Number(process.env.API_PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port}`);
});
