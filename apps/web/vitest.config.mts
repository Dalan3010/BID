import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Tests of the client.
 *
 * - `src/lib/**\/*.test.ts`: pure modules, in Node.
 * - `src/components/**\/*.test.tsx`: components with Testing Library. Each of
 *   those files declares `// @vitest-environment jsdom` at the top.
 * - `src/test/setup.ts` stubs `matchMedia` (reduced motion) and cleans up.
 *
 * The end-to-end walkthrough against the real API lives in `e2e/` and runs
 * with `pnpm e2e`, not here.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@bid/core": path.resolve(import.meta.dirname, "../../packages/core/src/index.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
  },
});
