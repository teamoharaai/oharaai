# Session 003 — Phase 3: server data-access + API layer

- **Date:** 2026-09-17
- **Task(s):** PLAN.md Phase 3 (`lib/db/circles.ts` + `app/api/circles/**`)
- **Agent/model:** Opus 4.8
- **tsc baseline (before):** clean

## Goal of this session

Build the server data-access and API layer over the live Migration 053 surface
so later phases can swap the Circles client off fixtures. CTO-lane; no schema
changes.

## Changes

- **`lib/db/circles-core.ts`** (new) — pure, node-testable core: `CircleDataError`
  + `classifyPgError`/`throwCircleError` (42501→FORBIDDEN, P0002→NOT_FOUND,
  22023→INVALID_INPUT, 23505→CONFLICT); camelCase DTOs; row→DTO mappers
  (`mapFeedRow`, `mapPostCore`, `mapGoalSummary`, `mapSentInvite`, `mapAuthor`);
  validators (`parseCreatePostInput`, `parseInviteeIds`, `validateUuid`, …).
  Type-only `@/` imports only (stripped by the node runner — D-004); no runtime
  imports, zero side effects.
- **`lib/db/circles.ts`** (new) — data-access functions calling the 053 RPCs and
  RLS-guarded tables via `createAuthedClient`. Feed + author hydration
  (`get_profiles_by_ids`), post create/delete, encourage/unencourage +
  encouragers list (CD-013), comments list/create/soft-delete, save/unsave/list,
  public-goal get/set, friend-public-goals, shared-with-me, incoming/sent invites
  (CD-014 declined→pending via `mapSentInvite`), send/respond/withdraw, and the
  linkable-items picker (own shareable goals + completed milestones + reflections).
- **`lib/api/circles.ts`** (new) — `ApiResponse` envelope helpers +
  `circlesErrorResponse` mapping `CircleDataError` → HTTP, mirroring
  `lib/api/friends.ts`.
- **`app/api/circles/**`** (new, 17 route files) — `withAuth`-wrapped routes for
  every PLAN §4 row; `user_id` from session only.
- **`docs/API_CONTRACT.md`** — added the "Circles endpoints" section.
- **`scripts/circles-api.smoke.mjs`** (new) + **`package.json`**
  `"test:circles:api"` — route smoke shaped like `momentum-api.smoke.mjs`.

## Tests

- `npx tsc --noEmit` → **pass** (before and after).
- `node --check scripts/circles-api.smoke.mjs` → **pass** (syntax).
- `npm run test:circles:api` → **PASS** (2026-09-17, manual QA). Ran against a
  live signed-in session: I started expo web on :8099 (→ live project
  `rrgiqemscnyaqkculnmb`), the user pasted their `access_token`. Result: all 8
  read endpoints 200; unauth feed + mutation 401; empty body 400; missing delete
  404; create post 201 (id `4113765c…`, appeared in feed) → own delete 200
  (soft-deleted, live data left clean). Server stopped after the run.

## Decisions made

- **CD-018** (declined→pending is a mapper concern; withdrawn omitted from the
  owner's sent list). See `DECISIONS.md`.

## Follow-ups / handoff

- **Next: Phase 4** — client services + store swap behind `FEATURES.CIRCLES_ENABLED`;
  remove `SharedGoal.why`; keep fixtures for tests only.
- Run `npm run test:circles:api` against a signed-in dev session when a server is
  up (set `OHARA_CIRCLES_WEB_ORIGIN` + a session env) to close the Phase 3
  acceptance smoke.
- Phase 6 can node-test the pure mappers in `circles-core.ts` (relative import).
