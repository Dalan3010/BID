import { describe, expect, it } from "vitest";

import { NotDemoAccountError } from "../errors";
import type { DemoBook } from "../ports/demo-book";
import { resetDemo } from "./reset-demo";

const DEMO_EMAIL = "demo@bid.local";

/** Records which owner was restored, so the test sees exactly what was touched. */
class RecordingDemoBook implements DemoBook {
  readonly ownerEmail = DEMO_EMAIL;
  readonly restored: string[] = [];

  async restore(ownerId: string): Promise<void> {
    this.restored.push(ownerId);
  }
}

describe("resetDemo", () => {
  it("restores the seeded book of the demo account", async () => {
    const book = new RecordingDemoBook();

    await resetDemo({ id: "demo-id", email: DEMO_EMAIL }, book);

    expect(book.restored).toEqual(["demo-id"]);
  });

  it("refuses any other account and touches nothing", async () => {
    const book = new RecordingDemoBook();

    await expect(
      resetDemo({ id: "real-id", email: "someone@example.com" }, book),
    ).rejects.toBeInstanceOf(NotDemoAccountError);

    expect(book.restored).toEqual([]);
  });
});
