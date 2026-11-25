import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DrizzleIdeaRepository } from "./idea-repository";
import { DrizzleArranqueStepRepository } from "./arranque-step-repository";
import * as schema from "./schema";
import { users } from "./schema";

/**
 * Integration test against a real Postgres.
 *
 * Skipped unless `TEST_DATABASE_URL` is set, so `pnpm test` stays
 * database-free.
 *
 *   TEST_DATABASE_URL=postgres://bid:bid@localhost:5432/bid_test pnpm test
 */

const connectionString = process.env.TEST_DATABASE_URL;

describe.skipIf(!connectionString)("DrizzleArranqueStepRepository", () => {
  const ownerId = `test-owner-${randomUUID()}`;

  let sql: ReturnType<typeof postgres>;
  let ideas: DrizzleIdeaRepository;
  let steps: DrizzleArranqueStepRepository;

  beforeAll(async () => {
    sql = postgres(connectionString as string, { max: 1, onnotice: () => {} });
    const database = drizzle(sql, { schema });

    await migrate(database, { migrationsFolder: "./drizzle" });
    await database
      .insert(users)
      .values({ id: ownerId, name: "Integration test", email: `${ownerId}@test.local` });

    ideas = new DrizzleIdeaRepository(database);
    steps = new DrizzleArranqueStepRepository(database);
  });

  afterAll(async () => {
    await sql.end();
  });

  it("stores accepted steps open, oldest first, and never touches the idea", async () => {
    const idea = await ideas.create({
      ownerId,
      title: "Café para oficinas",
      summary: "",
    });

    const created = await steps.addSteps(idea.id, [
      { title: "Fijar el primer precio", detail: "Cobrable mañana." },
      { title: "Llamar a dos proveedores", detail: null },
    ]);

    expect(created).toHaveLength(2);
    expect(created.every((step) => step.status === "open")).toBe(true);

    const list = await steps.listByIdea(idea.id);

    expect(list.map((step) => step.title)).toEqual([
      "Fijar el primer precio",
      "Llamar a dos proveedores",
    ]);
  });

  it("completes and reopens a step, and answers null for a missing one", async () => {
    const idea = await ideas.create({
      ownerId,
      title: "Otra idea",
      summary: "",
    });
    const created = await steps.addSteps(idea.id, [
      { title: "Fijar el primer precio", detail: null },
    ]);

    const done = await steps.updateStatus(idea.id, created[0]!.id, "done");
    expect(done?.status).toBe("done");

    const reopened = await steps.updateStatus(idea.id, created[0]!.id, "open");
    expect(reopened?.status).toBe("open");

    const missing = await steps.updateStatus(idea.id, "00000000-0000-0000-0000-000000000000", "done");
    expect(missing).toBeNull();
  });
});
