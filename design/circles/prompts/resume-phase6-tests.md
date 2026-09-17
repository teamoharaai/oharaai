# Circles — Resume: Phase 6 (tests)

You are continuing the **Circles** initiative — the friends-only social layer that
is Home (`/dashboard`, nav label "Home"). Migrations **053 + 054 are applied and
verified live**. The server layer (Phase 3), the client swap (Phase 4, behind
`FEATURES.CIRCLES_ENABLED` = **false**), **Fix 0** (comment soft-delete, CD-021),
and **Phase 5a** (Today's Focus weekly Task count, CD-003) are built, `tsc` clean,
and **committed** on `feat/circles-home` (`0adcc02`). Phase 5b (invite links) is
**deferred** (CD-022). Work on `feat/circles-home`; do NOT commit to `main` (main
lands only via the Phase 8 PR with the user's go-ahead). Commit only when the user
asks.

**This session = Phase 6: automated tests** (`PLAN.md` §5 Phase 6). Pure-mapper
node unit tests + DB-harness pagination coverage. No product behavior change; no
schema change; no live apply. If a test surfaces a real bug, **stop and confirm**
the fix approach before changing product/DB code (a mapper tweak is fine; an RLS/
RPC/type-contract change is L3 → ask).

## Read first (in this order)
1. `design/circles/MEMORY.md` — durable facts + gotchas (053+054 live; the
   node-runner has **no `@/` import map**, so test-reachable modules use relative
   imports or type-only `@/` imports — tracker-metrics **D-004**; the local PG16
   harness recipe; `.env.local` points at the **live** project).
2. `design/circles/OUTSTANDING.md` — phase board (Phase 6 row) + follow-ups.
3. `design/circles/PLAN.md` §5 **Phase 6** acceptance; `design/circles/DECISIONS.md`
   (esp. CD-004 privacy spine, CD-005 snapshot, CD-013/CD-014/CD-018 mapping rules,
   CD-021 comment-delete).
4. `lib/db/circles-core.ts` — the pure, node-testable core (type-only `@/` imports):
   `classifyPgError`, `mapAuthor`/`buildAuthorMap`, `mapFeedRow`, `mapPostCore`,
   `mapGoalSummary`, `mapSentInvite`, and the validators (`validateUuid`,
   `validatePostBody`/`validateCommentBody`, `parseCreatePostInput`,
   `parseInviteeIds`, `validateInviteResponse`, `parsePublicGoalId`).
5. `features/circles/progress.ts` (type-only import — testable) and
   `features/circles/format.ts` (**verify** its `@/lib/goals/schema` import is
   `import type` / otherwise D-004-safe before test-importing it).
6. Existing test-style precedent to mirror: `features/tasks/utils.test.ts`,
   `lib/activity/goal-activity.test.ts` (node `--experimental-strip-types --test`,
   relative imports); the `test:tasks` / `test:tasks:db` scripts in `package.json`.
7. Root `CLAUDE.md`; `supabase/CLAUDE.md` (053+054 ledger); `lib/db/CLAUDE.md`;
   `features/CLAUDE.md`.

## Scope

### 6a. Node unit tests for the pure core (relative imports only, D-004)
- **`lib/db/circles-core.test.ts`** (new) — cover:
  - `classifyPgError`: 42501→FORBIDDEN, P0002→NOT_FOUND, 22023→INVALID_INPUT,
    23505→CONFLICT, unknown→INTERNAL.
  - `mapFeedRow` / `mapPostCore` / `mapAuthor` / `buildAuthorMap`: snake→camel,
    author hydration (present + null when unfriended), link snapshot fields.
  - `mapGoalSummary`: whitelisted shape (CD-004) — milestones title+done only,
    `weeklyTask` present vs **null when target 0** (the graceful-degradation rule),
    access passthrough.
  - `mapSentInvite` (**CD-014/CD-018**): pending/declined→`pending`,
    accepted→`accepted`, withdrawn/unexpected→**null (dropped)**.
  - validators: `validatePostBody`/`validateCommentBody` length bounds,
    `parseCreatePostInput` (link kind/ref pairing, ≤280 description, CD-005),
    `parseInviteeIds`, `validateInviteResponse`, `parsePublicGoalId`, `validateUuid`.
- **`features/circles/progress.test.ts`** (new) — the milestone fraction +
  "No milestones yet" + weekly-count formatting rules (CD-003).
- Optional: extract the pure aggregation in
  `lib/db/tasks.ts:fetchWeeklyTaskCountsByGoal` (occurrence rows → per-goal
  `{done,target}`, drop-when-target-0) into a tiny pure helper and unit-test it;
  the week-window math is already covered by `lib/time/zoned-calendar`.
- Add a **`"test:circles"`** script to `package.json`
  (`node --experimental-strip-types --test <the new *.test.ts>`), mirroring
  `test:tasks`. Confirm each test-reachable import resolves without the `@/` map
  (relative imports; type-only `@/` is fine — it's stripped).

### 6b. DB-harness pagination coverage
- `scripts/circles-security.test.sql` already asserts the comment soft-delete
  round-trip (053+054). **Add feed pagination coverage** for `get_circles_feed`:
  insert ≥3 posts as the author, assert the default page order (newest first) and
  that `p_before = <cursor>` returns only older rows and respects `p_limit`
  clamping (`least(greatest(coalesce(limit,20),1),50)`). Keep it inside the
  existing rolled-back / disposable-cluster flow; `npm run test:circles:db` stays
  green (applies 053+054).

## Acceptance
- **`npm run test:circles`** (new) green — pure-core + progress tests pass with the
  strip-types runner (no `@/`-map failures).
- **`npm run test:circles:db`** green — now including the feed-pagination assertions
  (still applies 053+054).
- `npx tsc --noEmit` clean before and after.
- No product/DB behavior change (tests only). Any real bug found → stop and confirm.

## Every session
- Baseline + finish with `npx tsc --noEmit`.
- Document in order: `design/circles/changelog/006-<slug>.md` (from `TEMPLATE.md`)
  → `OUTSTANDING.md` (Phase 6 → ☑, exact next action = Phase 7 docs) → any new
  `DECISIONS.md` entries → `MEMORY.md` facts → `audits/` only if a live apply/gate
  (none expected this phase) → root `CHANGELOGCODEX.md`.
- Branch `feat/circles-home`; never commit to `main`; commit only when the user
  asks; never apply a migration live without explicit go-ahead; stop at any L3.
- **Next after Phase 6:** Phase 7 (docs — lift CLAUDE.md "No feed", add Circles to
  Data Model/Naming, `API_CONTRACT.md` incl. the new `GET /api/goals/weekly-task-counts`,
  root `DECISIONS.md` pointer) → Phase 8 (signed-in QA + PR; flip `CIRCLES_ENABLED`).
