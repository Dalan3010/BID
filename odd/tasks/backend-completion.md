# Backend completion — functional non-AI product

## Status

In progress on `feat/backend-completion` (cut from `backend`).

## Objective

Close the gaps that stop the product from being usable and demoable without AI:
manual plan authoring, version history, idea CRUD, fresh dashboard timestamps,
and honest error handling.

## Problem

`backend` already exposes authentication, ideas, chat, extraction, proposals,
account export and demo reset. But a newly created idea is empty and there is no
non-AI way to fill it: `editNode`, `confirmNode` and `proposeNode` exist without
HTTP routes, and the plan UI is read-only. `saveVersion` is implemented but never
called in production, so real ideas export `versions: []` and the roadmap's
history flow cannot be shown. Ideas also cannot be renamed, summarized or
deleted, and `ideas.updated_at` goes stale after node changes.

## Scope

In:
- Manual node creation for an open dimension and manual editing of a validated
  node, with `source: "edited"` and no AI involvement.
- Version snapshots on confirmed changes and a version list plus diff endpoint.
- Idea rename, summary update and deletion, owner-scoped.
- `ideas.updated_at` touched on node mutations.
- Error mapping that does not turn infrastructure failures into 404/502.
- Frontend authoring, edit-idea and version-history UI.
- Mock API parity for the new endpoints.
- Tests and documentation for the new behavior.

Out:
- New AI providers, extraction behavior or coach prompts.
- Schema migrations (the existing tables already support this work).
- Production packaging (Dockerfile, compiled API).
- A full graph-diff visualization; the diff is a grouped node list.

## Constraints

- Every route resolves the owner from the session, never from the body.
- `inferred` nodes stay inside the proposal flow. Manual authoring only creates
  `edited` nodes and only edits validated (`confirmed`/`edited`) nodes.
- One version per confirmed change; proposals alone never create versions.
- Conventional commits, no AI attribution.
- The final deliverable is one PR `backend` -> `main`; this branch is merged into
  `backend` with `--no-ff` after verification.
- TDD is not explicitly enabled for this session. New behavior ships with tests,
  but we do not claim strict RED/GREEN evidence.

## Tasks

- [x] T1 — Core: add `diffGraphs` projection and tests. (8671879)
- [x] T2 — Repository: add `updateIdea`, `deleteIdea`, `findVersion`,
      `findLatestVersion`; touch `ideas.updated_at` on node mutations; mirror in
      the in-memory repository. (4cbff6b)
- [x] T3 — Errors: add `DimensionNotEmptyError`, `NotAProposalError`,
      `VersionNotFoundError` and their HTTP mapping. (6d25e89)
- [x] T4 — Use cases: `createManualNode`, `updateIdea`, `deleteIdea`,
      `listIdeaVersions`, `diffIdeaVersion`; make `editNode`, `confirmNode` and
      `resolveProposal` snapshot and enforce owner/provenance rules.
      (4439dd7, 37ba37b)
- [x] T5 — Routes: `POST/PATCH` nodes, `PATCH/DELETE` idea, `GET` versions and
      version diff; Zod schemas; PATCH/DELETE in CORS. (b92f247)
- [ ] T6 — Frontend API client: PATCH/DELETE support and the new methods.
- [ ] T7 — UI: node editor dialog, edit-idea dialog, version history, and
      integration in `use-workspace`, `plan-panel`, `dimension-entry`,
      `workspace-view`.
- [ ] T8 — Mock API: parity for the new endpoints, snapshots and diff.
- [ ] T9 — Tests: core, use cases, repository, routes, frontend, Playwright.
- [ ] T10 — Docs: API contracts, business rules, roadmap and stale references.

## Acceptance criteria

- A user can create an idea, write a response for a dimension without AI, edit
  it, and see the dashboard timestamp update.
- Confirming, editing or resolving a proposal creates a version; the idea page
  lists versions and shows added/modified/removed nodes.
- A user can rename, summarize and delete their own idea; another user cannot.
- The account export includes the versions created by real changes.
- A repository failure answers 500, not 404; a provider failure still answers
  the documented error.
- `pnpm typecheck` and `pnpm test` stay green; DB-gated suites remain opt-in.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm --filter @bid/api test
pnpm --filter @bid/core test
pnpm --filter @bid/web test
```

DB-gated suites need `TEST_DATABASE_URL` and a running Postgres.

## Delivery

- Work-unit commits on `feat/backend-completion`.
- Merge into `backend` with `--no-ff` after the checks pass.
- Do not open the PR from this branch; the user opens `backend` -> `main` later.

## Risks

- `saveVersion` computes `max(version) + 1` without a transaction; concurrent
  confirmed changes can race on the unique index. Acceptable for the demo,
  documented as a follow-up.
- Node mutation and snapshot are not atomic; a snapshot failure leaves the node
  persisted. Documented as a follow-up.
- The first version of an idea with existing nodes contains the whole graph, so
  its diff shows every node as added. This is expected when history starts late.
- Manual authoring is blocked while a dimension has pending proposals, by design.

## Progress log

- 2026-11-16: branch created; plan written. Engram mirror pending (ambiguous
  project from `/home/kom/Proyectos`).
- 2026-11-17: T5 done in `b92f247`. New `routes/nodes.ts` and `routes/versions.ts`;
  `PATCH/DELETE /:id` on the ideas router; `createNodeSchema`, `editNodeSchema`,
  `updateIdeaSchema`; `requiredIntParam` / `optionalIntQuery` answer 400 for a
  non-positive version; CORS now allows PATCH and DELETE. 16 route tests run the
  real Hono app against `InMemoryIdeaRepository`, no database.
  Verification: `pnpm --filter @bid/api typecheck` clean,
  `pnpm --filter @bid/api test` 131 passed / 14 skipped,
  `pnpm typecheck` clean across core, api and Frontend.
- 2026-11-17: T1–T4 were already committed and are now checked off with their
  commits; the plan's list had drifted behind the branch.
- 2026-11-17: route decision — the API answers `{ node }`, `{ idea }`,
  `{ versions }` and `{ diff }`, and `DELETE` answers 204 with no body, so the
  client never parses a payload it cannot use.
- 2026-11-17: full backend stack running against the compose Postgres
  (`postgres:17-alpine`, host 5432, databases `bid` and `bid_test`), migrations
  and seed applied, `pnpm --filter @bid/api dev` on 3001 and Next on 3000.
- 2026-11-17: the DB-gated suites had never actually run; they exposed a
  `postgres-js` serialization bug in a test helper (`Date` passed as a
  parameter). Fixed in `e27ee28` by sending ISO text with a `timestamptz` cast.
  With `TEST_DATABASE_URL` set, the API suite is 145/145 green, none skipped.

## Delivery state

- Branch `feat/backend-completion` vs `backend`: 31 files, 2452 insertions,
  51 deletions. The 400-line review budget is exceeded on purpose: the plan
  states one `backend` -> `main` PR, opened by the user, with this branch merged
  into `backend` `--no-ff`. Delivery strategy: `exception-ok` (explicit in the
  plan, not a silent override).
- Next slice boundary is the whole branch; there is no partial PR planned.
- Per-task sizes above 400 lines were accepted because each is one coherent
  behavior with its tests; no artificial splitting.
