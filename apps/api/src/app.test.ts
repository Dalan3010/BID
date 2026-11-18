import { describe, expect, it, vi } from "vitest";

import {
  DimensionNotEmptyError,
  NotAProposalError,
  VersionNotFoundError,
} from "./application/errors";
import { app, errorToResponse } from "./app";

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

  it("explains a non-empty dimension with its own message", async () => {
    const response = errorToResponse(
      new DimensionNotEmptyError("idea-1", "problem"),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error:
        "Esa dimensión ya tiene contenido o propuestas: editá el nodo existente o resolvé las propuestas.",
    });
  });

  it("explains that a proposal is no longer pending", async () => {
    const response = errorToResponse(new NotAProposalError("node-1"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Esa propuesta ya no está pendiente.",
    });
  });

  it("explains that a version was not found", async () => {
    const response = errorToResponse(new VersionNotFoundError("idea-1", 3));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "No encontramos esa versión.",
    });
  });

  it("keeps the generic message for an unknown error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = errorToResponse(new Error("boom"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Algo salió mal." });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
