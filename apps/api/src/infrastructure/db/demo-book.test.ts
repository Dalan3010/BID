import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { findGaps } from "@bid/core";
import { DEMO_BOOK, DEMO_IDEA, DrizzleDemoBook } from "./demo-book";
import { DrizzleIdeaRepository } from "./idea-repository";
import * as schema from "./schema";
import { messages, users } from "./schema";

/**
 * Integration test of the demo reset (RF-73) against a real Postgres.
 *
 * Skipped unless `TEST_DATABASE_URL` is set. The book has fixed ids, so a
 * restore claims them back: point it at a test database, never at the one the
 * presentation runs on.
 *
 *   TEST_DATABASE_URL=postgres://bid:bid@localhost:5432/bid_test pnpm test
 */

const connectionString = process.env.TEST_DATABASE_URL;

describe.skipIf(!connectionString)("DrizzleDemoBook", () => {
  const demoId = `test-demo-${randomUUID()}`;
  const otherId = `test-other-${randomUUID()}`;

  let sql: ReturnType<typeof postgres>;
  let database: ReturnType<typeof drizzle<typeof schema>>;
  let repository: DrizzleIdeaRepository;
  let book: DrizzleDemoBook;

  beforeAll(async () => {
    sql = postgres(connectionString as string, { max: 1, onnotice: () => {} });
    database = drizzle(sql, { schema });

    await migrate(database, { migrationsFolder: "./drizzle" });
    await database.insert(users).values([
      { id: demoId, name: "Demo", email: `${demoId}@test.local` },
      { id: otherId, name: "Other", email: `${otherId}@test.local` },
    ]);

    repository = new DrizzleIdeaRepository(database);
    book = new DrizzleDemoBook(database);
  });

  afterAll(async () => {
    await sql`DELETE FROM users WHERE id IN (${demoId}, ${otherId})`;
    await sql.end({ timeout: 5 });
  });

  it("brings back the seeded book after a walkthrough changed it", async () => {
    await book.restore(demoId);

    // The walkthrough: a new idea, a message and a node on the main idea.
    await repository.create({ ownerId: demoId, title: "Idea nueva", summary: "" });
    await database
      .insert(messages)
      .values({ ideaId: DEMO_IDEA.id, role: "user", content: "Hola" });
    await repository.addNode({
      ideaId: DEMO_BOOK[2].id,
      type: "problem",
      content: "Agregado en la demo",
      source: "inferred",
      confidence: 0.5,
    });

    const started = performance.now();
    await book.restore(demoId);
    const elapsed = performance.now() - started;

    const ideas = await repository.listByOwner(demoId);
    expect(ideas.map((idea) => idea.id).sort()).toEqual(
      [DEMO_IDEA.id, ...DEMO_BOOK.map((entry) => entry.id)].sort(),
    );

    const main = await repository.loadGraph(DEMO_IDEA.id);
    expect(main && findGaps(main)).toEqual([]);
    expect(await repository.loadVersions(DEMO_IDEA.id)).toHaveLength(1);

    const conversation = await sql`SELECT id FROM messages WHERE idea_id = ${DEMO_IDEA.id}`;
    expect(conversation).toHaveLength(0);

    const empty = await repository.loadGraph(DEMO_BOOK[2].id);
    expect(empty?.nodes).toEqual([]);

    // RF-73: "en menos de 5 segundos".
    expect(elapsed).toBeLessThan(5000);
  });

  it("never touches another account", async () => {
    const kept = await repository.create({
      ownerId: otherId,
      title: "Idea real",
      summary: "",
    });

    await book.restore(demoId);

    expect(await repository.findById(kept.id)).not.toBeNull();
  });
});
