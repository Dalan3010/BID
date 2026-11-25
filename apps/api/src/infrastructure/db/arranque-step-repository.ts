import { and, asc, eq } from "drizzle-orm";

import type { ArranqueStep, StepStatus } from "@bid/core";
import type {
  ArranqueStepRepository,
  NewArranqueStep,
} from "../../application/ports/arranque-step-repository";
import { getDatabase, type Database } from "./client";
import { arranqueSteps } from "./schema";

/**
 * Postgres implementation of `ArranqueStepRepository`.
 *
 * Steps are ordered by creation time — the oldest open one is the next thing
 * to work on, exactly like the conversation reads oldest-first.
 */
export class DrizzleArranqueStepRepository implements ArranqueStepRepository {
  constructor(private readonly db: Database = getDatabase()) {}

  async listByIdea(ideaId: string): Promise<ArranqueStep[]> {
    const rows = await this.db
      .select()
      .from(arranqueSteps)
      .where(eq(arranqueSteps.ideaId, ideaId))
      .orderBy(asc(arranqueSteps.createdAt));

    return rows.map(toArranqueStep);
  }

  async addSteps(
    ideaId: string,
    steps: readonly NewArranqueStep[],
  ): Promise<ArranqueStep[]> {
    if (steps.length === 0) {
      return [];
    }

    const rows = await this.db
      .insert(arranqueSteps)
      .values(
        steps.map((step) => ({
          ideaId,
          title: step.title,
          detail: step.detail,
        })),
      )
      .returning();

    return rows.map(toArranqueStep);
  }

  async updateStatus(
    ideaId: string,
    stepId: string,
    status: StepStatus,
  ): Promise<ArranqueStep | null> {
    const [row] = await this.db
      .update(arranqueSteps)
      .set({ status })
      .where(
        and(eq(arranqueSteps.ideaId, ideaId), eq(arranqueSteps.id, stepId)),
      )
      .returning();

    return row ? toArranqueStep(row) : null;
  }
}

function toArranqueStep(row: typeof arranqueSteps.$inferSelect): ArranqueStep {
  return {
    id: row.id,
    ideaId: row.ideaId,
    title: row.title,
    detail: row.detail,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}
