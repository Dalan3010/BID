import { describe, expect, it, vi } from "vitest";

import { app } from "./app";

// No session, and no database: the error contract does not need one.
vi.mock("./infrastructure/auth/auth", () => ({
  getAuth: () => ({
    api: { getSession: async () => null },
    handler: async () => new Response(null, { status: 404 }),
  }),
}));

/**
 * The error contract of the API.
 *
 * A route throws a typed error and the client receives its status with a JSON
 * body and the CORS headers. Without them the browser reports a network
 * failure and the user sees "Algo salió mal." for everything.
 */
describe("API error responses", () => {
  const origin = "http://localhost:3000";

  it("answers 401 with a JSON body when there is no session", async () => {
    const response = await app.request("/api/demo/reset", {
      method: "POST",
      headers: { origin },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "No hay sesión." });
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
  });

  it("keeps the same contract on the existing routes", async () => {
    const response = await app.request("/api/ideas", { headers: { origin } });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "No hay sesión." });
  });
});
