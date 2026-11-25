import type { ArranqueStep, StepStatus } from "@bid/core";
import { nextTimestamp } from "./clock";
import type {
  ArranqueStepRepository,
  NewArranqueStep,
} from "../ports/arranque-step-repository";

/**
 * In-memory `ArranqueStepRepository` for tests.
 *
 * Same reasoning as the other in-memory repositories: if the use cases needed
 * Postgres, the layer would not be decoupled.
 */
export class InMemoryArranqueStepRepository implements ArranqueStepRepository {
  private readonly byIdea = new Map<string, ArranqueStep[]>();
  private counter = 0;

  async listByIdea(ideaId: string): Promise<ArranqueStep[]> {
    return [...(this.byIdea.get(ideaId) ?? [])];
  }

  async addSteps(
    ideaId: string,
    steps: readonly NewArranqueStep[],
  ): Promise<ArranqueStep[]> {
    const list = this.byIdea.get(ideaId) ?? [];

    const stored = steps.map((step) => {
      this.counter += 1;

      return {
        id: `step-${this.counter}`,
        ideaId,
        title: step.title,
        detail: step.detail,
        status: "open" as const,
        createdAt: nextTimestamp(),
      };
    });

    list.push(...stored);
    this.byIdea.set(ideaId, list);

    return stored;
  }

  async updateStatus(
    ideaId: string,
    stepId: string,
    status: StepStatus,
  ): Promise<ArranqueStep | null> {
    const list = this.byIdea.get(ideaId) ?? [];
    const step = list.find((entry) => entry.id === stepId);

    if (!step) {
      return null;
    }

    const updated: ArranqueStep = { ...step, status };
    this.byIdea.set(
      ideaId,
      list.map((entry) => (entry.id === stepId ? updated : entry)),
    );

    return updated;
  }
}
