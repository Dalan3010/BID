import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { getDatabase } from "../db/client";
import * as schema from "../db/schema";
import { isDemoAccount } from "./demo-account";

/**
 * Better Auth instance.
 *
 * Kept behind `getAuth()` so importing this module does not open a database
 * connection: a route module may be imported by a script that only wants the
 * schema.
 *
 * The domain `users` table is reused as Better Auth's `user` model instead of
 * creating a second one. That is why `ideas.owner_id` already points at it.
 *
 * **It runs in the API, not in the client.** The session cookie is issued by
 * this server and is httpOnly: the browser sends it, but JavaScript cannot read
 * it.
 */

type AuthInstance = ReturnType<typeof createAuth>;

let cached: AuthInstance | undefined;

/** The origin the browser app is served from. */
function webOrigin(): string {
  return process.env.WEB_ORIGIN ?? "http://localhost:3000";
}

/**
 * Whether the cookie has to survive a cross-site request.
 *
 * On `localhost` the two ports are the same site (the site ignores the port),
 * so `Lax` is enough and the cookie travels. Two different domains are not the
 * same site, and there `None` plus `Secure` is mandatory.
 */
function crossSiteCookies(): boolean {
  return process.env.AUTH_COOKIE_SAMESITE === "none";
}

/**
 * Rewrites the redirect of a link that the API verifies.
 *
 * The token is processed by the API, but the person has to end up in the
 * client: a JSON body is not a destination.
 */
function withWebCallback(url: string, path: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("callbackURL", `${webOrigin()}${path}`);

  return parsed.toString();
}

/**
 * Whether the full link may be written to the server log.
 *
 * A reset token is a bearer credential: whoever reads it can take over the
 * account. A log is not a place for a credential, because a log is read by
 * people, shipped to aggregators and kept for a long time.
 *
 * So the link is logged **without its token** by default, and only when
 * `AUTH_LOG_SECRETS=1` is set explicitly — which is a development
 * convenience, never a production setting. With no mail provider the flow
 * would otherwise be unusable in local development, but the trade is explicit
 * and the default is safe.
 */
function mayLogSecrets(): boolean {
  return process.env.AUTH_LOG_SECRETS === "1";
}

/**
 * Writes a link to the log with its secret replaced.
 *
 * The shape of the link is preserved so the flow stays debuggable: what is
 * hidden is the part that would let somebody else act as the user.
 *
 * The placeholder is plain text because a query value is percent-encoded:
 * brackets would come back as `%5B...%5D` and be harder to spot in a log.
 */
function redactSecret(url: string, secretName: string): string {
  const parsed = new URL(url);
  const value = parsed.searchParams.get(secretName);

  if (value === null) {
    return url;
  }

  parsed.searchParams.set(secretName, "REDACTED");

  return parsed.toString();
}

/**
 * Announces an outgoing email without leaking what it authorizes.
 *
 * The email address is kept: it is not a secret, and knowing which account
 * asked for a reset is what makes the log useful. The token is not.
 */
export function announceEmail(
  kind: string,
  email: string,
  url: string,
  secretName: string,
) {
  const link = mayLogSecrets() ? url : redactSecret(url, secretName);

  console.info(`[auth] ${kind} for ${email}: ${link}`);
}

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema: {
        ...schema,
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
    trustedOrigins: [webOrigin()],
    advanced: {
      defaultCookieAttributes: crossSiteCookies()
        ? { sameSite: "none", secure: true, httpOnly: true }
        : { sameSite: "lax", httpOnly: true },
    },
    user: {
      modelName: "users",
      changeEmail: {
        enabled: true,
        /**
         * Accounts created here never verify their email (there is no mail
         * provider), so the change applies immediately. If an account does have
         * a verified email, the confirmation link is written to the log instead
         * of being sent.
         */
        updateEmailWithoutVerification: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
          // The link is served by the API (it owns the token), but after
          // verifying it must land on the client, not on a JSON response.
          announceEmail(
            "email change",
            `${user.email} -> ${newEmail}`,
            withWebCallback(url, "/profile"),
            "token",
          );
        },
      },
      deleteUser: {
        enabled: true,
      },
    },
    emailAndPassword: {
      enabled: true,
      /**
       * There is no mail provider. The link is written to the server log so the
       * flow is complete and testable without external services. Swapping in an
       * SMTP or Resend transport is a single change in this file.
       */
      sendResetPassword: async ({ user, token }) => {
        // A reset would hand the shared demo account to whoever asked for it.
        // The request still succeeds (the reply must not reveal which accounts
        // exist), but no link is ever delivered or logged.
        if (isDemoAccount(user.email)) {
          console.warn("[auth] password reset ignored: the demo account is read-only.");
          return;
        }

        // The page that asks for the new password lives in the client, so the
        // link is built here instead of using the one Better Auth would point
        // at its own base URL.
        //
        // The token is a bearer credential for the reset endpoint, so it is
        // never written to the log unless `AUTH_LOG_SECRETS=1` says so
        // explicitly.
        announceEmail(
          "password reset",
          user.email,
          `${webOrigin()}/reset-password?token=${token}`,
          "token",
        );
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        announceEmail(
          "email verification",
          user.email,
          withWebCallback(url, "/profile"),
          "token",
        );
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
  });
}

export function getAuth(): AuthInstance {
  if (!cached) {
    cached = createAuth();
  }

  return cached;
}

export type Auth = AuthInstance;
