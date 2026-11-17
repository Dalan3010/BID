import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DrizzleIdeaRepository } from "./idea-repository";
import * as schema from "./schema";
import { users } from "./schema";

/**
 * Integration test against a real Postgres.
 *
 * Skipped unless `TEST_DATABASE_URL` is set, so `pnpm test` stays database-free.
 * The test only touches rows it creates and removes them afterwards, so it is
 * safe to point at any database that has the migrations applied.
 *
 *   TEST_DATABASE_URL=postgres://bid:bid@localhost:5432/bid_test pnpm test
 */

const connectionString = process.env.TEST_DATABASE_URL;

describe.skipIf(!connectionString)("DrizzleIdeaRepository", () => {
  const ownerId = `test-owner-${randomUUID()}`;

  let sql: ReturnType<typeof postgres>;
  let repository: DrizzleIdeaRepository;

  beforeAll(async () => {
    sql = postgres(connectionString as string, { max: 1, onnotice: () => {} });
    const database = drizzle(sql, { schema });

    await migrate(database, { migrationsFolder: "./drizzle" });
    await database
      .insert(users)
      .values({ id: ownerId, name: "Integration test", email: `${ownerId}@test.local` });

    repository = new DrizzleIdeaRepository(database);
  });

  afterAll(async () => {
    // Cascades remove the idea, its nodes and its versions.
    await sql`DELETE FROM users WHERE id = ${ownerId}`;
    await sql.end({ timeout: 5 });
  });

  it("round-trips an idea, its graph and a version", async () => {
    const idea = await repository.create({
      ownerId,
      title: "Integration idea",
      summary: "",
    });

    expect(await repository.findById(idea.id)).not.toBeNull();
    expect((await repository.listByOwner(ownerId)).map((i) => i.id)).toContain(
      idea.id,
    );

    const node = await repository.addNode({
      ideaId: idea.id,
      type: "problem",
      content: "A real problem",
      source: "inferred",
      confidence: 0.5,
    });

    expect(node.source).toBe("inferred");
    expect(node.confidence).toBe(0.5);

    const found = await repository.findNode(idea.id, node.id);
    expect(found?.content).toBe("A real problem");

    const updated = await repository.updateNode(idea.id, node.id, {
      source: "confirmed",
      confidence: null,
    });
    expect(updated?.source).toBe("confirmed");
    expect(updated?.confidence).toBeNull();

    const graph = await repository.loadGraph(idea.id);
    expect(graph?.nodes).toHaveLength(1);
    expect(graph?.nodes[0].source).toBe("confirmed");

    const version = await repository.saveVersion(idea.id);
    expect(version?.version).toBe(1);
    expect(version?.nodeCount).toBe(1);

    const second = await repository.saveVersion(idea.id);
    expect(second?.version).toBe(2);

    const versions = await repository.listVersions(idea.id);
    expect(versions.map((v) => v.version)).toEqual([2, 1]);

    expect(await repository.removeNode(idea.id, node.id)).toBe(true);
    expect(await repository.findNode(idea.id, node.id)).toBeNull();
  });

  it("returns null for an unknown idea", async () => {
    expect(await repository.loadGraph(randomUUID())).toBeNull();
    expect(await repository.saveVersion(randomUUID())).toBeNull();
  });

  it("deletes nodes together with their idea", async () => {
    const idea = await repository.create({
      ownerId,
      title: "Throwaway",
      summary: "",
    });

    await repository.addNode({
      ideaId: idea.id,
      type: "costs",
      content: "Something",
      source: "confirmed",
    });

    await sql`DELETE FROM ideas WHERE id = ${idea.id}`;

    expect(await repository.loadGraph(idea.id)).toBeNull();
  });
});
