import { Hono } from "hono";
import { cors } from "hono/cors";

import { getAuth } from "./infrastructure/auth/auth";
import { statusFor } from "./lib/errors";
import { HttpError } from "./lib/http-error";
import { account } from "./routes/account";
import { demo } from "./routes/demo";
import { ideas } from "./routes/ideas";

/**
 * The HTTP application.
 *
 * It is the only process that talks to Postgres and to Better Auth. The browser
 * app reaches it over HTTP, with the session cookie; it never gets a database
 * connection.
 */

const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

export const app = new Hono();

app.use(
  "*",
  cors({
    // An exact origin, never `*`: a wildcard cannot be combined with credentials.
    origin: webOrigin,
    credentials: true,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["content-type"],
    maxAge: 600,
  }),
);

/**
 * Turns any thrown error into a response.
 *
 * It is the app's `onError`, not a try/catch middleware: Hono catches what a
 * handler throws and hands it to `onError`, so a middleware never sees it and
 * every error used to leave as a plain-text 500. The CORS middleware still runs
 * around it, so error responses carry the CORS headers too: without them the
 * browser reports a network failure and the real status never reaches the
 * client.
 */
app.onError((error) => errorToResponse(error));

app.get("/api/health", (context) => context.json({ ok: true }));

/**
 * Better Auth owns its whole subtree: sign-in, sign-up, session, password
 * reset, email change and account deletion all live under `/api/auth`.
 */
app.on(["GET", "POST"], "/api/auth/*", (context) =>
  getAuth().handler(context.req.raw),
);

app.route("/api/ideas", ideas);
app.route("/api/account", account);
app.route("/api/demo", demo);

function errorToResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return json({ error: error.message }, error.status);
  }

  const status = statusFor(error);

  if (status !== null) {
    return json({ error: messageFor(status) }, status);
  }

  console.error("[api] unhandled error:", error);

  return json({ error: "Algo salió mal." }, 500);
}

/** The message the client shows for a status the domain produced. */
function messageFor(status: number): string {
  if (status === 403) return "Solo la cuenta demo se puede reiniciar.";
  if (status === 404) return "No encontramos eso.";
  if (status === 409) return "Ese cambio no está permitido.";
  if (status === 400) return "Los datos no son válidos.";

  return "Algo salió mal.";
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export type App = typeof app;
