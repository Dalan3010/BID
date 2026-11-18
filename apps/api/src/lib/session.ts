import type { Context } from "hono";

import { getAuth } from "../infrastructure/auth/auth";
import { unauthorized } from "./http-error";

/** The signed-in user, as the rest of the API needs it. */
export interface SessionUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerified: boolean;
}

/**
 * The signed-in user, or `null`.
 *
 * The cookie is read from the request the browser made; the client never sends
 * a user id, because a client that chooses its own identity is not
 * authenticated.
 */
export async function getCurrentUser(
  context: Context,
): Promise<SessionUser | null> {
  const session = await getAuth().api.getSession({
    headers: context.req.raw.headers,
  });

  return session?.user ?? null;
}

/** Guards a route: without a session there is no answer but 401. */
export async function requireUser(context: Context): Promise<SessionUser> {
  const user = await getCurrentUser(context);

  if (!user) {
    throw unauthorized();
  }

  return user;
}
