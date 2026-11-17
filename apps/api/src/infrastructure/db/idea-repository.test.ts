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

  function updatedAtMs(idea: { updatedAt: string } | null): number {
    if (!idea) {
      throw new Error("Expected the idea to exist");
    }

    return new Date(idea.updatedAt).getTime();
  }

  async function ageIdea(ideaId: string): Promise<number> {
    const past = new Date(Date.now() - 60_000);
    // postgres-js has no serializer for `Date`: send the ISO text and let the
    // cast parse it, otherwise the driver throws before reaching the server.
    await sql`UPDATE ideas SET updated_at = ${past.toISOString()}::timestamptz WHERE id = ${ideaId}`;
    return past.getTime();
  }

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

  it("updates the idea title and summary", async () => {
    const idea = await repository.create({
      ownerId,
      title: "Before",
      summary: "Old summary",
    });

    const updated = await repository.updateIdea(idea.id, {
      title: "After",
      summary: "New summary",
    });

    expect(updated?.title).toBe("After");
    expect(updated?.summary).toBe("New summary");
    expect(await repository.findById(idea.id)).toMatchObject({
      title: "After",
      summary: "New summary",
    });

    const partial = await repository.updateIdea(idea.id, {
      summary: "Only the summary",
    });
    expect(partial?.title).toBe("After");
    expect(partial?.summary).toBe("Only the summary");

    expect(await repository.updateIdea(randomUUID(), { title: "Nobody" })).toBeNull();
  });

  it("deletes the idea and its children", async () => {
    const idea = await repository.create({
      ownerId,
      title: "Doomed",
      summary: "",
    });

    await repository.addNode({
      ideaId: idea.id,
      type: "problem",
      content: "A node",
      source: "confirmed",
    });
    await repository.saveVersion(idea.id);
    await sql`
      INSERT INTO messages (idea_id, role, content)
      VALUES (${idea.id}, 'user', 'A message')
    `;

    expect(await repository.deleteIdea(idea.id)).toBe(true);
    expect(await repository.findById(idea.id)).toBeNull();
    expect(await repository.loadGraph(idea.id)).toBeNull();
    expect(await repository.listVersions(idea.id)).toEqual([]);

    const [{ count: nodeCount }] = await sql`
      SELECT count(*)::int AS count FROM nodes WHERE idea_id = ${idea.id}
    `;
    const [{ count: versionCount }] = await sql`
      SELECT count(*)::int AS count FROM idea_versions WHERE idea_id = ${idea.id}
    `;
    const [{ count: messageCount }] = await sql`
      SELECT count(*)::int AS count FROM messages WHERE idea_id = ${idea.id}
    `;

    expect(nodeCount).toBe(0);
    expect(versionCount).toBe(0);
    expect(messageCount).toBe(0);

    expect(await repository.deleteIdea(idea.id)).toBe(false);
  });

  it("finds a specific version and the latest one", async () => {
    const idea = await repository.create({
      ownerId,
      title: "Versioned",
      summary: "",
    });

    await repository.addNode({
      ideaId: idea.id,
      type: "problem",
      content: "First node",
      source: "confirmed",
    });
    await repository.saveVersion(idea.id);

    await repository.addNode({
      ideaId: idea.id,
      type: "costs",
      content: "Second node",
      source: "edited",
    });
    await repository.saveVersion(idea.id);

    const first = await repository.findVersion(idea.id, 1);
    expect(first?.version).toBe(1);
    expect(first?.createdAt).toBeTypeOf("string");
    expect(first?.graph.nodes).toHaveLength(1);

    const latest = await repository.findLatestVersion(idea.id);
    expect(latest?.version).toBe(2);
    expect(latest?.graph.nodes).toHaveLength(2);

    expect(await repository.findVersion(idea.id, 99)).toBeNull();
    expect(await repository.findLatestVersion(randomUUID())).toBeNull();
  });

  it("touches ideas.updated_at only for user-visible node changes", async () => {
    const idea = await repository.create({
      ownerId,
      title: "Timestamped",
      summary: "",
    });

    const inferredBaseline = await ageIdea(idea.id);
    await repository.addNode({
      ideaId: idea.id,
      type: "problem",
      content: "Inferred node",
      source: "inferred",
    });
    expect(updatedAtMs(await repository.findById(idea.id))).toBe(
      inferredBaseline,
    );

    const editedBaseline = await ageIdea(idea.id);
    const edited = await repository.addNode({
      ideaId: idea.id,
      type: "problem",
      content: "Edited node",
      source: "edited",
    });
    expect(updatedAtMs(await repository.findById(idea.id))).toBeGreaterThan(
      editedBaseline,
    );

    const updateBaseline = await ageIdea(idea.id);
    await repository.updateNode(idea.id, edited.id, { content: "Changed" });
    expect(updatedAtMs(await repository.findById(idea.id))).toBeGreaterThan(
      updateBaseline,
    );

    const inferred = await repository.addNode({
      ideaId: idea.id,
      type: "costs",
      content: "Another inferred node",
      source: "inferred",
    });

    const removeBaseline = await ageIdea(idea.id);
    expect(await repository.removeNode(idea.id, inferred.id)).toBe(true);
    expect(updatedAtMs(await repository.findById(idea.id))).toBeGreaterThan(
      removeBaseline,
    );
  });
});
