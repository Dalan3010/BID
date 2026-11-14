import { expect, type BrowserContext, type Page } from "@playwright/test";

/** Marks the guided tour as seen, so it does not cover the workspace. */
export async function skipTour(context: BrowserContext) {
  await context.addInitScript(() => {
    window.localStorage.setItem("bid:tour:workspace", "1");
  });
}

/** Creates a throwaway account and lands on the dashboard. */
export async function signUp(page: Page, email: string, password: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Nombre").fill("Prueba E2E");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear mi estudio" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Deletes the signed-in account through the profile screen. */
export async function deleteAccount(page: Page, password: string) {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  await page.getByLabel("Confirma con tu contraseña").fill(password);
  await page.getByRole("button", { name: "Eliminar definitivamente" }).click();
  await expect(page).toHaveURL(/\/$/);
}

/** Signs in with the seeded demo account (read-only use in tests). */
export async function signInDemo(page: Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Entrar con la cuenta demo" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
