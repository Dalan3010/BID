/**
 * Runtime configuration of the client.
 *
 * `NEXT_PUBLIC_API_URL` is baked into the bundle at build time and comes from
 * the single `.env.local` at the repository root (see `next.config.ts`).
 */
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
).replace(/\/+$/, "");

/** The public demo account seeded by `pnpm db:seed`. */
export const DEMO_ACCOUNT = {
  email: "demo@bid.local",
  password: "demo1234",
} as const;
