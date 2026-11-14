import path from "node:path";

import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

/**
 * The repository has a single `.env.local`, at the root, shared by the API and
 * the client. Loading it here means `NEXT_PUBLIC_API_URL` is declared once.
 */
const repositoryRoot = path.resolve(import.meta.dirname, "..");
loadEnvConfig(repositoryRoot);

const nextConfig: NextConfig = {
  // `@bid/core` ships TypeScript sources; Next compiles them as part of the app.
  transpilePackages: ["@bid/core"],
  turbopack: {
    root: repositoryRoot,
    rules: {
      // Tailwind CSS 4 runs as a Turbopack loader, not as a PostCSS plugin.
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // `next/image` optimizes the pre-graded photography in `public/images` on
    // demand: it serves AVIF/WebP at the width each `sizes` attribute asks for
    // instead of the 2000 px JPEG. The optimizer is `sharp`, which Next.js
    // installs as its own dependency, so nothing extra is required.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
