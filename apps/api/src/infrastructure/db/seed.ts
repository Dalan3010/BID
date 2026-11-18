import { eq } from "drizzle-orm";

import { findGaps } from "@bid/core";
import { closeDatabase, getDatabase, type Database } from "./client";
import {
  DEMO_BOOK,
  DEMO_CREDENTIALS,
  DEMO_IDEA,
  DrizzleDemoBook,
} from "./demo-book";
import { DrizzleIdeaRepository } from "./idea-repository";
import { accounts, users } from "./schema";

/**
 * Seeds the demo idea.
 *
 * The demo is not decoration: it is the fallback the live presentation runs on
 * when the model provider misbehaves (see docs/roadmap.md, Phase 7). It must
 * therefore cover all ten dimensions with validated knowledge, so `findGaps`
 * returns an empty list and the coach has nothing left to ask.
 *
 * Running it twice leaves the database in the same state.
 */

/** Owner id used before Phase 2, when the demo user was inserted by hand. */
const LEGACY_DEMO_USER_ID = "demo-user";

/**
 * Returns the demo user's id, creating the account on first run.
 *
 * The account is created through `auth.api.signUpEmail` so Better Auth produces
 * the password hash and the credential account row. Inserting the user by hand
 * would duplicate the library's hashing and break on a version change.
 */
async function ensureDemoUser(database: Database): Promise<string> {
  const [existing] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEMO_CREDENTIALS.email))
    .limit(1);

  if (existing && existing.id !== LEGACY_DEMO_USER_ID) {
    // The account exists. Its password may have been changed since the last
    // seed, so the demo credential is restored: the seed promises fixed
    // credentials, and a demo that cannot be entered is worse than one that
    // resets a password.
    await restoreDemoPassword(database, existing.id);

    return existing.id;
  }

  if (existing) {
    // Phase 1 inserted this row by hand: it has no password hash and cannot log
    // in. Removing it cascades to the demo idea, which the seed rebuilds below.
    await database.delete(users).where(eq(users.id, LEGACY_DEMO_USER_ID));
  }

  const { getAuth } = await import("../auth/auth");
  const result = await getAuth().api.signUpEmail({ body: DEMO_CREDENTIALS });

  return result.user.id;
}

/**
 * Restores the known demo password.
 *
 * It goes through Better Auth's own hasher, so the stored format stays the one
 * the library expects. This is the only place that writes a password hash
 * outside a real authentication flow, and it exists so the demo credential is
 * always `demo1234` — the alternative is a demo that cannot be entered because
 * somebody changed the password during a test.
 */
async function restoreDemoPassword(
  database: Database,
  userId: string,
): Promise<void> {
  const { getAuth } = await import("../auth/auth");
  const context = await getAuth().$context;

  const hash = await context.password.hash(DEMO_CREDENTIALS.password);

  await database
    .update(accounts)
    .set({ password: hash, updatedAt: new Date() })
    .where(eq(accounts.userId, userId));
}

async function main(): Promise<void> {
  const database = getDatabase();

  const ownerId = await ensureDemoUser(database);

  // The same restore the reset button runs (RF-73): the seed and a reset can
  // never leave the demo in different states.
  await new DrizzleDemoBook(database).restore(ownerId);

  // Verify through the same port the application uses, not through the values
  // that were just written: this is the acceptance criterion of Phase 1.
  const repository = new DrizzleIdeaRepository(database);
  const graph = await repository.loadGraph(DEMO_IDEA.id);

  if (!graph) {
    throw new Error("The demo idea could not be read back after seeding.");
  }

  const gaps = findGaps(graph);
  if (gaps.length > 0) {
    throw new Error(
      `The demo idea still has open dimensions: ${gaps
        .map((gap) => gap.type)
        .join(", ")}`,
    );
  }

  console.log("Demo idea seeded.");
  console.log(`  idea:  ${DEMO_IDEA.id}`);
  console.log(`  book:  ${DEMO_BOOK.length + 1} ideas`);
  console.log(`  owner: ${ownerId} (${DEMO_CREDENTIALS.email})`);
  console.log(`  login: ${DEMO_CREDENTIALS.email} / ${DEMO_CREDENTIALS.password}`);
  console.log(`  nodes: ${graph.nodes.length} confirmed`);
  console.log(`  gaps:  ${gaps.length}`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
