import { expect, test } from "@playwright/test";

import { signInDemo, skipTour } from "./helpers";

/**
 * The workspace owns the viewport.
 *
 * The screen is a two-pane studio sized with `100dvh`: the conversation
 * scrolls inside its own pane and the plan inside its own. The document itself
 * must never scroll, because below it there is nothing to see — only the void,
 * which reads as a broken layout.
 *
 * Regression: the `sr-only` labels of the messages are `position: absolute`
 * with no positioned ancestor, so they escaped the conversation scroller and
 * stretched the document by more than a screen.
 */
test("the workspace never scrolls the document", async ({ page }) => {
  await skipTour(page.context());
  await signInDemo(page);
  await page.goto("/ideas/00000000-0000-4000-8000-000000000001");

  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toBeVisible();
  await expect(title).toContainText("Café de especialidad");

  // The entrance animates a transform, and a transformed block is scrollable
  // overflow while it runs. Measure the resting layout, not the entrance.
  await expect
    .poll(
      async () =>
        page.evaluate(
          () => document.documentElement.scrollHeight - window.innerHeight,
        ),
      { timeout: 10_000 },
    )
    .toBeLessThanOrEqual(1);
});
