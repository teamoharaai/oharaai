# Tracker Metrics — Compounding Memory

Durable facts that survive across sessions. Read this first. Append new facts;
correct stale ones in place. Each fact is dated so drift is visible.

## Repo realities (updated 2026-09-09)

- **Implementation state: Tasks 0–1 done.** `lib/time/zoned-calendar.ts` and
  `lib/goals/tracker-cadence.ts` (+ test) now exist. Still missing (future
  tasks): `periodState`/`TrackerPeriodState`/`TrackerPeriodBucket` in
  `features/goals/types.ts`, `046` migration, new `app/api/trackers/` mutation
  routes. Next up: Task 2.

- **⚠ Test runner gotcha (D-004):** unit tests run under `node
  --experimental-strip-types --test` with **no `@/` import map**. `@/…` imports
  pass tsc but FAIL at node runtime. Any lib/features module reachable from a
  test must use **relative imports** (e.g. `../../lib/time/zoned-calendar.ts`).
  `@/` is fine only in Expo/Metro-only code (app routes/components).
- **DST transition-day nuance (D-005):** the shared `localDateToUtcStart` (from
  Momentum) yields deterministic, contiguous period bounds, but the lost/gained
  DST hour attaches to a neighboring bucket rather than making the transition day
  a literal 23/25h. Fine for bucketing (determinism+contiguity+coverage hold);
  don't assume pedantic transition-day spans in tests.
- **Test command for cadence** (no package script until Task 10):
  `node --experimental-strip-types --test lib/goals/tracker-cadence.test.ts`.
- **All plan-referenced target files still exist** at their stated paths
  (goal-service.ts, useGoalDetail.ts, TrackerCard.tsx, TrackersPanel.tsx,
  ExtendGoalModal.tsx, GoalsWorkspace.tsx, lib/db/goals.ts,
  complete-tracker+api.ts, due-today+api.ts, dashboard.tsx,
  momentum-service.ts, types.ts). Plan is still structurally valid.
- **The problem state the plan describes is still live**: `completedTrackerIds`
  appears in `GoalsWorkspace.tsx` and `useGoalDetail.ts`; `current_value` /
  `currentValue` is read/written across types.ts, store.ts, TrackerCard.tsx,
  GoalsWorkspace.tsx, ExtendGoalModal.tsx, goal-service.ts, useGoalDetail.ts,
  lib/db/tracker-inserts.ts, lib/db/goals.ts, due-today+api.ts.
- **`features/momentum/time.ts` exists** (~3.8KB) — the timezone primitives Task
  1 must extract into a shared module live here.

## ⚠️ Migration number drift (confirmed 2026-09-09)

- Plan Task 2 says create `044_tracker_logs_period_index.sql`. **044 and 045 are
  already taken**: `044_echo_v1_project_links.sql`,
  `045_entries_brt_idempotent_create.sql`.
- **Next available migration number is `046`.** Task 2 must create
  `046_tracker_logs_period_index.sql`. Re-verify the highest number immediately
  before writing it. See [[DECISIONS.md]] entry D-001.

## Git / remote state (confirmed 2026-09-09)

- Local `main` is **ahead of `origin/main` by 1** unpushed commit (`af20780
  Extend canonical Entries reflection contract`). **Nothing to pull** — remote
  had no commits absent from local. The user's "pull to update local" resolved
  to a no-op after `git fetch`.
- The plan file itself was untracked; it now lives at `tracker-metrics/PLAN.md`.

## Live DB facts (audit 001, confirmed 2026-09-09)

- **`profiles.timezone`**: `text NOT NULL DEFAULT 'UTC'`. Null path is defended
  at the column; `normalizeTimezone()` still needed for *invalid* strings.
- **`trackers.current_value`**: `numeric NOT NULL DEFAULT 0` — cannot be dropped
  without a schema change; inserts don't need it (default covers it). Stop
  reading/writing it for period UI only.
- **`tracker_logs`**: `value numeric NOT NULL DEFAULT 1`, `logged_at timestamptz
  NOT NULL DEFAULT now()`. No period/idempotency column (matches deferred scope).
- **Indexes on tracker_logs**: only `tracker_logs_pkey` + `idx_tracker_logs_
  tracker_id` (plain btree on tracker_id — this is the redundant one Task 2 may
  drop). The plan's compound covering index does NOT exist yet.
- **Prod data**: 69 trackers = 29 counter / 23 habit / 17 checklist; frequency
  = 36 **null** / 29 weekly / 4 daily / **0 monthly**. `tracker_logs` = **37
  rows / 21 trackers**. → monthly buckets + >1000-log pagination have NO prod
  coverage; prove via fixtures.
- **RLS on tracker_logs**: full CRUD, scoped tracker→goal→`user_id=auth.uid()`.
  An authed RLS client suffices for logging AND uncomplete-delete; no
  service-role needed.
- **Migration tracking drift**: file `045_entries_brt_idempotent_create.sql`
  exists but live `schema_migrations` tops at `044`. `045` is idempotent +
  Entries-domain (not our concern), but the lesson is: **Task 2 must insert the
  `schema_migrations` row after applying `046`** (no CLI to do it). See D-003.

## Code facts (audit 001, confirmed 2026-09-09)

- **Auth pattern** (`app/api/goals/complete-tracker+api.ts`): `withAuth` →
  `AuthContext{userId, accessToken}`; `createAuthedClient(accessToken)`; body =
  `{trackerId, goalId}` only; userId is server-side; successor→409 else 500;
  currently returns `{success:true}` (Task 5 changes to periodState DTO).
- **`completeTracker`** (`lib/db/goals.ts:951`): successor→ownership→tracker∈goal
  →insert log(value=null?1:target>0?target:1)→**checklist also writes
  `current_value=1` at :1003** (Task 5 removes). Not idempotent, no null-freq
  rejection, no uncomplete, no counter path, returns void.
- **Counter/manual bypass**: `TrackerCard.tsx` `onSave({currentValue})` →
  `goal-service.updateTracker` patches `current_value` at :559 (Task 5 removes).
- **Local completion set**: `completedTrackerIds` in `useGoalDetail.ts`
  (44/80/182/216/372) + `GoalsWorkspace.tsx` `completedIds` (1054/1114) — Task 6
  deletes entirely.
- **Pagination template EXISTS**: `lib/db/friends.ts` + `lib/db/constellation.ts`
  use `for(from=0;;from+=500){ .range(from,from+499); if(page<500) break }`,
  order by created_at then id. Task 3+4 mirrors this (order by logged_at, id).
  PAGE_SIZE=500 is the repo convention. Goal detail currently fetches trackers
  via `GOAL_SELECT` nested select with NO tracker_logs join → hydration is
  net-new.
- **Momentum coupling**: `refreshMomentumAfterMeaningfulMutation()` called
  `void` (best-effort) at 5 sites in `useGoalDetail.ts`. Momentum is log-driven;
  it selects `current_value` at momentum-service.ts:255 but strips it at :509
  before compute → **legacy-safe, do not touch**.
- **Dead code CONFIRMED**: `GoalsWorkspace.tsx:955 function TrackerList` has no
  JSX call site (Task 8 cleanup).
- **time.ts extraction is low-risk**: outside its module, `momentum/time` is
  imported only by `scripts/momentum-local.integration.mjs` + the test list.
  Extract `normalizeTimezone/zonedDateParts/toYmd/addLocalDays/localDateToUtcStart`
  to `lib/time/zoned-calendar.ts`, re-export from momentum/time. Add the Intl
  formatter cache (currently rebuilt every call).
- **tsc baseline is clean** (exit 0) as of 2026-09-09.

## Applying DB migrations (from user global memory)

- No Supabase CLI available. Apply via the management API query endpoint.
- Cloudflare returns error 1010 and bans the Python-urllib user agent — set a
  curl-style UA on the request. (See root user memory `ref_supabase_migration_apply.md`.)

## Key process constraints (from PLAN.md + CLAUDE.md)

- `npx tsc --noEmit` must pass before AND after every change. No exceptions.
- Do not apply a migration just because the file was created — applying +
  verifying live is an explicit Task 2 step.
- Cascade level L3 (shared type contract, migration, authenticated mutations) —
  types/schema/AI-output changes need team decision per CLAUDE.md ownership.
- `tracker_logs` is canonical; `trackers.current_value` stays in the DB for
  back-compat but tracker-metrics code stops writing/reading it for period UI.
