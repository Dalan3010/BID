import { expect, test, type Page } from "@playwright/test";

import { deleteAccount, signInDemo, signUp, skipTour } from "./helpers";

/**
 * The main journey, against the real API, with one temporary account:
 * sign up → idea → conversation (stream) → proposals → accept / correct /
 * discard with undo → plan, canvas, timeline → account deletion.
 */
test.describe.serial("journey with a temporary account", () => {
  const email = `e2e-${Date.now()}@bid.local`;
  const password = "e2e-password-123";
  let page: Page;
  /** Proposals that should remain after the discard, checked after reload. */
  let remaining = -1;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    await skipTour(context);
    page = await context.newPage();
    await signUp(page, email, password);
  });

  test.afterAll(async () => {
    await deleteAccount(page, password);
    await page.context().close();
  });

  test("creates an idea from the studio", async () => {
    await expect(page.getByText("Tu estudio está en silencio.")).toBeVisible();
    await page.getByRole("button", { name: "Nueva idea" }).click();
    await page.getByLabel("Nombre de la idea").fill("Café para oficinas");
    await page.getByRole("button", { name: "Empezar a conversar" }).click();
    await expect(page).toHaveURL(/\/ideas\//);
    await expect(page.getByRole("article", { name: "Bienvenida del coach" })).toBeVisible();
  });

  test("a welcome topic prefills the composer without sending", async () => {
    await page.getByRole("button", { name: "Problema" }).click();
    await expect(page.locator("#composer")).toHaveValue("El problema es que ");
    await expect(page.getByRole("article", { name: "Mensaje del coach" })).toHaveCount(0);
  });

  test("the coach answers in stream and the extraction proposes", async () => {
    await page.locator("#composer").fill(
      "El problema es que las oficinas no tienen buen café. Vendo café por suscripción mensual de 30 euros. Me preocupa la logística.",
    );
    await page.keyboard.press("Enter");
    await expect(page.getByRole("article", { name: "Mensaje del coach" })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Lo que hemos identificado" })).toBeVisible();
    await expect(page.getByText(/0 de 10 validadas/)).toBeVisible();
  });

  test("accepting validates only after the API answers", async () => {
    await page.getByRole("button", { name: "Sí, añadir al plan" }).first().click();
    await expect(page.getByText(/1 de 10 validadas/)).toBeVisible();
  });

  test("discarding can be undone, then is sent", async () => {
    const before = await page.getByRole("button", { name: "Descartar" }).count();
    test.skip(before === 0, "the extractor proposed nothing else to discard");

    await page.getByRole("button", { name: "Descartar" }).first().click();
    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect(page.getByRole("button", { name: "Descartar" })).toHaveCount(before);

    await page.getByRole("button", { name: "Descartar" }).first().click();
    // The card switches to its undo state at once; the request is only sent
    // when the 5 s window ends, so wait for the countdown to disappear.
    await expect(page.getByRole("button", { name: "Deshacer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Deshacer" })).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Descartar" })).toHaveCount(before - 1);
    remaining = before - 1;
  });

  test("the plan survives a reload (server truth)", async () => {
    await page.reload();
    await expect(page.getByText(/1 de 10 validadas/)).toBeVisible();
    if (remaining >= 0) {
      // The discard reached the API: the proposal is gone after reloading.
      await expect(page.getByRole("button", { name: "Descartar" })).toHaveCount(remaining);
    }
  });

  test("trace, canvas and timeline read the same graph", async () => {
    const plan = page.locator("#pane-plan");
    await plan.getByRole("button", { name: "Ver en la conversación" }).first().click();
    await expect(page.locator("article:focus")).toHaveAttribute("aria-label", "Tu mensaje");

    await page.getByRole("button", { name: "Ver como lienzo" }).click();
    await expect(page.getByRole("dialog").locator("section")).toHaveCount(10);
    await page.getByRole("dialog").getByRole("button", { name: "Cerrar" }).click();

    await page.getByRole("button", { name: "Ver línea de tiempo" }).click();
    await expect(page.getByText("Escribiste").first()).toBeVisible();
    await expect(page.getByText(/Confirmado · /).first()).toBeVisible();
  });
});

test.describe("demo account (read-only)", () => {
  test("filters and searches the studio", async ({ page, context }) => {
    await skipTour(context);
    await signInDemo(page);
    await page.getByLabel("Buscar ideas").fill("cafe");
    await expect(page.locator("ol > li h3").first()).toContainText("Café");
    await page.getByLabel("Buscar ideas").fill("zzzz");
    await expect(page.getByText("Ninguna idea coincide.")).toBeVisible();
  });

  test("shows the guided tour on a first visit", async ({ page }) => {
    await signInDemo(page);
    await page.goto("/ideas/00000000-0000-4000-8000-000000000001");
    await expect(page.getByRole("dialog", { name: "Conversa con tu coach" })).toBeVisible();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: "Empezar" }).click();
    await expect(page.getByRole("dialog", { name: /Guía|coach|plan/ })).toHaveCount(0);
  });

  test("an unknown idea says it does not exist", async ({ page, context }) => {
    await skipTour(context);
    await signInDemo(page);
    await page.goto("/ideas/00000000-0000-4000-8000-0000000000ff");
    await expect(page.getByRole("heading", { name: "No encontramos esa idea" })).toBeVisible();
  });
});
