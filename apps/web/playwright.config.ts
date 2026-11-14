import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end walkthrough of BID against the REAL API.
 *
 * Prerequisites (see `e2e/README.md`):
 * - `pnpm dev` running at the repo root (API on :3001, client on :3000),
 *   with Postgres migrated and seeded (`pnpm db:migrate && pnpm db:seed`).
 * - A Chromium: either `pnpm exec playwright install chromium` once, or an
 *   existing binary in `BID_E2E_CHROMIUM`.
 *
 * The suite creates a temporary account and deletes it at the end; it only
 * reads the demo account.
 */
export default defineConfig({
  testDir: "./e2e",
  // One worker, in order: the steps share one temporary account.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.BID_E2E_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: process.env.BID_E2E_CHROMIUM
      ? { executablePath: process.env.BID_E2E_CHROMIUM }
      : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});
