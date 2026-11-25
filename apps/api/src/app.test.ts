import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DimensionNotEmptyError,
  NotAProposalError,
  VersionNotFoundError,
} from "./application/errors";
import { app, errorToResponse } from "./app";

interface TestUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerified: boolean;
}

const { sessionUser } = vi.hoisted(() => ({
  sessionUser: { current: null as TestUser | null },
}));

// No database: the error contract and the demo guard do not need one. The
// session is swapped per test so the same mock covers both cases.
vi.mock("./infrastructure/auth/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: async () =>
        sessionUser.current
          ? { user: sessionUser.current, session: {} }
          : null,
    },
    handler: async () => new Response(null, { status: 404 }),
  }),
}));

beforeEach(() => {
  sessionUser.current = null;
});

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

/**
 * The demo account is public: its credentials are on the sign-in page. Every
 * account mutation has to be refused even though the client hides the forms,
 * because the endpoint is reachable without the client.
 */
describe("the demo account is read-only", () => {
  const origin = "http://localhost:3000";

  const demoUser: TestUser = {
    id: "demo-user",
    name: "Cuenta demo",
    email: "demo@bid.local",
    emailVerified: true,
  };

  const accountChanges = [
    "/api/auth/update-user",
    "/api/auth/change-email",
    "/api/auth/change-password",
    "/api/auth/set-password",
    "/api/auth/delete-user",
    "/api/auth/unlink-account",
  ];

  it.each(accountChanges)("refuses %s for the demo user", async (path) => {
    sessionUser.current = demoUser;

    const response = await app.request(path, {
      method: "POST",
      headers: { origin },
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "DEMO_ACCOUNT_READ_ONLY",
      message: "La cuenta demo es de solo lectura.",
    });
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
  });

  it("lets a normal account reach Better Auth", async () => {
    sessionUser.current = { ...demoUser, email: "person@example.com" };

    const response = await app.request("/api/auth/update-user", {
      method: "POST",
      headers: { origin },
    });

    // The mocked handler answers 404: the request passed the guard.
    expect(response.status).toBe(404);
  });

  it("leaves endpoints that are not account changes alone", async () => {
    sessionUser.current = demoUser;

    const signIn = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { origin },
    });
    const signOut = await app.request("/api/auth/sign-out", {
      method: "POST",
      headers: { origin },
    });

    expect(signIn.status).toBe(404);
    expect(signOut.status).toBe(404);
  });
});
