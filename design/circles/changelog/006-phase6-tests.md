# Session 006 — Phase 6 (automated tests)

- **Date:** 2026-09-17
- **Task(s):** Phase 6 (tests) — pure-core node unit tests + DB-harness feed pagination
- **Agent/model:** Opus 4.8
- **tsc baseline (before):** clean

## Goal of this session

Lock the Circles pure core (mappers + validators) and the milestone/weekly-count
progress rules behind fast node unit tests, and extend the DB security harness to
cover `get_circles_feed` pagination (order, cursor, limit clamping). Tests only —
no product/schema/DB behavior change, no live apply.

## Changes

- **`lib/db/circles-core.test.ts`** (new) — 22 tests over the pure core, relative
  imports only (D-004; `circles-core.ts`'s `@/types/supabase` import is type-only,
  stripped by the runner):
  - `classifyPgError`: 42501→FORBIDDEN, P0002→NOT_FOUND, 22023→INVALID_INPUT,
    23505→CONFLICT, unknown/missing→null.
  - `mapAuthor`/`buildAuthorMap`: snake→camel, null-safe display name/avatar, keying.
  - `mapFeedRow`/`mapPostCore`: count/flag coercion, author hydration (present +
    null when unfriended), link snapshot built only when kind+ref+title all present.
  - `mapGoalSummary` (CD-004): whitelisted shape (milestones title+done only,
    private fields dropped), `weeklyTask` present vs **null when SQL emits
    `weekly_task: null`** (the target-0 graceful-degradation case — 053 L321–326),
    access default, non-object → null.
  - `mapSentInvite` (CD-014/CD-018): pending/declined→pending, accepted→accepted,
    withdrawn/unexpected→**null (dropped)**, invitee hydration + respondedAt.
  - validators: `validateUuid`, `validatePostBody`/`validateCommentBody` bounds,
    `parseCreatePostInput` (link kind/ref pairing, ≤280 description, CD-005),
    `parseInviteeIds` (non-empty, ≤50, dedupe), `validateInviteResponse`,
    `parsePublicGoalId`.
- **`features/circles/progress.test.ts`** (new) — 6 tests for CD-003:
  `milestoneProgress` (done/total, ratio **null not 0%** when empty),
  `milestoneLabel` ("X of Y milestones" / "No milestones yet"), `weeklyTaskLabel`
  (formats `done / target this week`, **null at target 0** — graceful degradation).
- **`package.json`** — new **`test:circles`** script
  (`node --experimental-strip-types --test lib/db/circles-core.test.ts
  features/circles/progress.test.ts`), mirroring `test:tasks`.
- **`scripts/circles-security.test.sql`** — appended a `get_circles_feed`
  pagination section. Seeds 55 stamped author posts (direct superuser inserts —
  053 grants `authenticated` SELECT only), then as author A asserts: default page
  = 20; `p_limit => 1000` clamps to **50**; `p_limit => 0` clamps to **1** and is
  the newest row; top-3 are the three newest (newest-first); `p_before` returns
  only strictly-older rows; `p_before` + `p_limit` returns the two newest below the
  cursor. Assertions use created_at aggregates (order-independent), stays inside
  the existing rolled-back / disposable-cluster flow.

## Tests

- Added: `lib/db/circles-core.test.ts`, `features/circles/progress.test.ts`;
  extended `scripts/circles-security.test.sql`.
- Commands run + result:
  - `npx tsc --noEmit` → **pass** (before and after)
  - `npm run test:circles` → **28 passed / 0 failed**
  - `npm run test:circles:db` → **pass** (053+054 applied; `INSERT 0 55`; all
    assertions passed; re-apply-053-must-fail guard held)

## Decisions made

- None. No new `DECISIONS.md` entries; no product/schema/DB behavior change.
- No bug surfaced. The one thing that looked like it might ("null when target 0")
  is enforced at the SQL layer (`circles_goal_summary`, 053 L321–326) and in
  `weeklyTaskLabel`; `mapGoalSummary` faithfully passes the SQL's `null` through —
  tests assert the real contract, no change needed.

## Follow-ups / handoff

- **Next: Phase 7 (docs).** Lift the CLAUDE.md "No feed" rule; add Circles to the
  Data Model + Naming sections; add `GET /api/goals/weekly-task-counts` to
  `API_CONTRACT.md` (CTO/goals lane, not a `/api/circles/**` route); add a root
  `DECISIONS.md` pointer. Then Phase 8 (signed-in QA + PR; flip `CIRCLES_ENABLED`).
