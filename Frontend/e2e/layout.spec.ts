import { expect, test } from "@playwright/test";

import { signInDemo, skipTour } from "./helpers";

/**
 * The workspace never scrolls the document.
 *
 * The conversation has its own scroller; the page must not have one. When it
 * does, the person can scroll past everything into an empty black band — that
 * is exactly what happened with the `sr-only` labels of the messages: they are
 * `position: absolute`, and without a positioned ancestor their containing
 * block sat above the scroller, so `overflow` did not clip them and the
 * document grew ~1100px past the viewport.
 *
 * `relative` on the bubble anchors them (see `message-entry.tsx`). This test is
 * the guard: it reads the real layout, with a real conversation on screen.
 */
test("the workspace never scrolls the document", async ({ browser }) => {
  const context = await browser.newContext();
  await skipTour(context);
  const page = await context.newPage();

  await signInDemo(page);

  // The seeded idea: the ten dimensions validated and a real conversation.
  await page.getByRole("link", { name: /Café de especialidad/ }).first().click();
  await expect(page).toHaveURL(/\/ideas\//);
  await expect(page.getByRole("article").first()).toBeVisible();

  // Poll until the entrance animation settles: while it runs, the transform
  // counts as scrollable overflow (a few px), which is not the bug.
  await expect
    .poll(
      async () =>
        page.evaluate(
          () => document.documentElement.scrollHeight - window.innerHeight,
        ),
      { timeout: 10_000 },
    )
    .toBeLessThanOrEqual(1);

  await context.close();
});
