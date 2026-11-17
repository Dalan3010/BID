import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration.
 *
 * Only `generate` is used: it turns the TypeScript schema into versioned SQL
 * files under `drizzle/`. Applying them is done by
 * `src/infrastructure/db/migrate.ts` so the same code path runs in development
 * and in any other environment.
 *
 * @see docs/arquitectura.md
 */
export default defineConfig({
  schema: "./src/infrastructure/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
