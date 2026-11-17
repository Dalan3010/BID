import type { UsageQuota } from "../../application/use-cases/extract-knowledge";

/**
 * The quota of model calls per user.
 *
 * It is counted in memory, per process, because the demo runs on one server
 * and the point of the quota is to be **visible**, not to be exact (RF-24).
 *
 * The limit comes from the environment so it can be changed without touching
 * the code.
 */
export class InMemoryUsageQuota implements UsageQuota {
  private readonly used = new Map<string, number>();

  constructor(private readonly maxCalls: number = defaultLimit()) {}

  async canConsume(userId: string): Promise<boolean> {
    return (this.used.get(userId) ?? 0) < this.maxCalls;
  }

  async consume(userId: string): Promise<void> {
    this.used.set(userId, (this.used.get(userId) ?? 0) + 1);
  }

  /** How many calls the user has left. */
  remaining(userId: string): number {
    return Math.max(0, this.maxCalls - (this.used.get(userId) ?? 0));
  }

  /** The limit, to show it in the interface. */
  get limit(): number {
    return this.maxCalls;
  }
}

/**
 * The default limit.
 *
 * It is high enough that nobody hits it during a demo and low enough that the
 * message is reachable when testing it.
 */
function defaultLimit(): number {
  const fromEnv = Number(process.env.COACH_QUOTA ?? "");

  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 50;
}
