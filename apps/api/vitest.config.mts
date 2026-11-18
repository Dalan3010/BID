import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Integration tests opt in through TEST_DATABASE_URL and are skipped when it
    // is absent, so `pnpm test` never needs a database.
    environment: "node",
  },
});
