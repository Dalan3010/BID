import { Hono } from "hono";

import { resetDemo } from "../application/use-cases/reset-demo";
import { demoBook } from "../infrastructure/container";
import { requireUser } from "../lib/session";

/**
 * Everything under `/api/demo`.
 *
 * The reset (RF-73) lets the walkthrough be repeated from the seeded state.
 * The use case refuses any account other than the public demo.
 */
export const demo = new Hono();

demo.post("/reset", async (context) => {
  const user = await requireUser(context);

  await resetDemo(user, demoBook());

  return context.body(null, 204);
});
