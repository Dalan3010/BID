import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DrizzleIdeaRepository } from "./idea-repository";
import { DrizzleMessageRepository } from "./message-repository";
import * as schema from "./schema";
import { users } from "./schema";

/**
 * Integration test against a real Postgres.
 *
 * Skipped unless `TEST_DATABASE_URL` is set, so `pnpm test` stays database-free.
 *
 *   TEST_DATABASE_URL=postgres://bid:bid@localhost:5432/bid_test pnpm test
 */

const connectionString = process.env.TEST_DATABASE_URL;

describe.skipIf(!connectionString)("DrizzleMessageRepository", () => {
  const ownerId = `test-owner-${randomUUID()}`;

  let sql: ReturnType<typeof postgres>;
  let ideas: DrizzleIdeaRepository;
  let repository: DrizzleMessageRepository;

  beforeAll(async () => {
    sql = postgres(connectionString as string, { max: 1, onnotice: () => {} });
    const database = drizzle(sql, { schema });

    await migrate(database, { migrationsFolder: "./drizzle" });
    await database
      .insert(users)
      .values({ id: ownerId, name: "Integration test", email: `${ownerId}@test.local` });

    ideas = new DrizzleIdeaRepository(database);
    repository = new DrizzleMessageRepository(database);
  });

  afterAll(async () => {
    await sql`DELETE FROM users WHERE id = ${ownerId}`;
    await sql.end({ timeout: 5 });
  });

  it("returns the newest messages, oldest first", async () => {
    const idea = await ideas.create({ ownerId, title: "Long thread", summary: "" });

    // More turns than the window the coach and the extractor read: the limit
    // must cut the beginning of the conversation, not the end. Ordering
    // ascending before LIMIT returns the first turns forever, and that is what
    // froze the coach on the same question once the thread grew.
    const total = 15;

    for (let index = 0; index < total; index += 1) {
      await sql`
        INSERT INTO messages (idea_id, role, content, created_at)
        VALUES (
          ${idea.id},
          'user',
          ${`turn ${index}`},
          ${new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString()}::timestamptz
        )
      `;
    }

    const recent = await repository.listRecent(idea.id, 12);

    expect(recent).toHaveLength(12);
    expect(recent[0]?.content).toBe(`turn ${total - 12}`);
    expect(recent[recent.length - 1]?.content).toBe(`turn ${total - 1}`);
  });

  it("returns everything when the conversation is shorter than the limit", async () => {
    const idea = await ideas.create({ ownerId, title: "Short thread", summary: "" });

    await sql`INSERT INTO messages (idea_id, role, content) VALUES (${idea.id}, 'user', 'only turn')`;

    const recent = await repository.listRecent(idea.id, 12);

    expect(recent.map((message) => message.content)).toEqual(["only turn"]);
  });
});
