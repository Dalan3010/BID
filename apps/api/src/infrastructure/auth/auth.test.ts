import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { makeSignature } from "better-auth/crypto";

/**
 * Integration test for the auth schema.
 *
 * This is the test that proves the Better Auth tables actually match what the
 * library expects: a schema mismatch only shows up when sign-up writes a row.
 *
 * Skipped unless `TEST_DATABASE_URL` is set.
 *
 *   TEST_DATABASE_URL=postgres://bid:bid@localhost:5432/bid_test pnpm test
 */

const connectionString = process.env.TEST_DATABASE_URL;

process.env.DATABASE_URL ??= connectionString ?? "";
process.env.BETTER_AUTH_SECRET ??= "test-secret-not-used-in-production";

describe.skipIf(!connectionString)("Better Auth schema", () => {
  const email = `auth-${randomUUID()}@test.local`;
  const password = "correct-horse-battery-staple";

  let auth: ReturnType<(typeof import("./auth"))["getAuth"]>;
  let closeDatabase: () => Promise<void>;

  beforeAll(async () => {
    const authModule = await import("./auth");
    const clientModule = await import("../db/client");

    auth = authModule.getAuth();
    closeDatabase = clientModule.closeDatabase;
  });

  afterAll(async () => {
    const { getDatabase } = await import("../db/client");
    const { users } = await import("../db/schema");
    const { eq } = await import("drizzle-orm");

    await getDatabase().delete(users).where(eq(users.email, email));
    await closeDatabase();
  });

  it("creates a user and a credential account on sign-up", async () => {
    const result = await auth.api.signUpEmail({
      body: { email, password, name: "Auth Test" },
    });

    expect(result.user.email).toBe(email);
    expect(result.user.name).toBe("Auth Test");
    expect(result.user.id).toBeTruthy();
  });

  it("rejects a duplicate email", async () => {
    await expect(
      auth.api.signUpEmail({
        body: { email, password, name: "Duplicate" },
      }),
    ).rejects.toThrow();
  });

  it("signs in with the right password", async () => {
    const result = await auth.api.signInEmail({
      body: { email, password },
    });

    expect(result.user.email).toBe(email);
    expect(result.token).toBeTruthy();
  });

  it("invalidates the session on the server when signing out", async () => {
    const { getDatabase } = await import("../db/client");
    const { users } = await import("../db/schema");
    const { eq } = await import("drizzle-orm");

    const email = `logout-${randomUUID()}@test.local`;
    const password = "correct-horse-battery-staple";

    await auth.api.signUpEmail({ body: { email, password, name: "Logout Test" } });

    const signedIn = await auth.api.signInEmail({ body: { email, password } });
    const token = signedIn.token;

    const context = await auth.$context;
    const cookieName = context.authCookies.sessionToken.name;
    const signature = await makeSignature(token, context.secret);

    // The session lives in a signed cookie, so the test has to carry the same
    // cookie the browser would send.
    const headers = new Headers({
      cookie: `${cookieName}=${token}.${signature}`,
    });

    const before = await auth.api.getSession({ headers });
    expect(before?.user.email).toBe(email);

    await auth.api.signOut({ headers });

    const after = await auth.api.getSession({ headers });
    expect(after).toBeNull();

    await getDatabase().delete(users).where(eq(users.email, email));
  });

  it("rejects a wrong password without revealing whether the account exists", async () => {
    const wrongPassword = await auth.api
      .signInEmail({ body: { email, password: "definitely-wrong" } })
      .then(() => null)
      .catch((error: unknown) => error);

    const unknownEmail = await auth.api
      .signInEmail({ body: { email: `missing-${randomUUID()}@test.local`, password } })
      .then(() => null)
      .catch((error: unknown) => error);

    expect(wrongPassword).toBeTruthy();
    expect(unknownEmail).toBeTruthy();
  });
});
