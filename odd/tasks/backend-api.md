# Backend API integration

**Objective:** make the Hono API (`apps/api`) part of this repository so the
client can talk to a real backend, keeping the domain in `packages/core` and the
client in `Frontend/`.

The work is delivered as a chain of feature branches over a long-lived
`backend` branch, one branch per backend concern. Each branch adds a coherent,
self-contained slice, and `backend` accumulates them in dependency order.

---

## Constraints

- `packages/core` stays pure and unchanged: it is already shared by the client.
- `Frontend/` keeps its name; the API is added as `apps/api` and the workspace
  gains `apps/*`.
- The API is the only process that talks to Postgres and Better Auth.
- The session is an httpOnly cookie issued by the API; the client sends it with
  `credentials: "include"` and never chooses its own `ownerId`.
- A single `.env.local` at the repository root is shared by both applications.
- One work-unit commit per coherent change, conventional commits, no AI
  attribution.

---

## Branches

| Branch                         | Slice                                                        |
| ------------------------------ | ------------------------------------------------------------ |
| `feat/backend-workspace`       | pnpm workspace, Docker Postgres, env, Hono bootstrap, errors |
| `feat/backend-database`        | Schema, migration `0000`, Drizzle client and repositories    |
| `feat/backend-auth`            | Better Auth on `users`, session guard, account export        |
| `feat/backend-ideas`           | Graph use cases and the `/api/ideas` routes                  |
| `feat/backend-chat`            | `CoachModel` port, streaming, conversation persistence       |
| `feat/backend-extraction`      | `Extractor` port, proposals, quota                           |
| `feat/backend-demo`            | Demo book, reset, seed, API error contract tests             |
| `feat/backend-docs`            | Root README and lockfile                                     |

Each branch is created from the current `backend` and merged back with a merge
commit, so the history shows the backend being built feature by feature.

---

## Acceptance criteria

- `apps/api` is byte-identical to the verified reference implementation.
- `packages/core` is untouched.
- The root workspace installs, typechecks and tests the three packages.
- `Frontend/` builds and keeps talking to `NEXT_PUBLIC_API_URL`.
- The README describes the two applications and the commands to run them.

---

## Verification

- `diff -rq` between `apps/api` and the reference implementation.
- `pnpm install`, `pnpm typecheck`, `pnpm test` (no database required).
- `pnpm --filter @bid/web build` when dependencies are installed.
- DB-gated suites are opt-in through `TEST_DATABASE_URL`.
