# Tracker Metrics — Compounding Memory

Durable facts that survive across sessions. Read this first. Append new facts;
correct stale ones in place. Each fact is dated so drift is visible.

## Repo realities (updated 2026-09-11)

- **Implementation state: Tasks 0–8 done.** **Task 8 done (session 008):** the
  tracker card DISPLAY is finally driven off the log-derived `periodState`,
  retiring the interim legacy-scalar read (D-007/D-008). New pure, node-tested
  `features/goals/tracker-display.ts` (relative imports + `import type` — D-004):
  `counterProgressPercent` (0–100 clamp, missing/zero target → denom 1),
  `currentPeriodValue`/`isTrackerPeriodComplete` (null-safe), `habitBucketViews`
  (exactly 7 `recentPeriods` dots oldest→newest current-last, trusts derivation
  ordering; pads to 7 empty placeholders when `periodState` null; slices newest 7),
  `bucketPeriodLabel` (date / "Week of …" / "Month YYYY" via `Intl` in the
  period-state tz). `TrackerCard.tsx`: removed the `displayValue` local state +
  effect (last scalar-drift path); counter number/bar, habit dots (same 26px +
  `brt.rose`/`border.warmSubtle` tokens, now with a11y bucket labels), checklist
  checked/strike (from `isCompleted` **only**, dropped `|| displayValue >= target`)
  all read `periodState`. The habit/checklist control is now an accessible
  **checkbox toggle** (`accessibilityRole="checkbox"`, `checked`) that logs when
  unchecked and calls `onUncompleteTracker` when checked, disabled when the
  applicable handler is absent — a discrete control, card-as-a-whole is never an
  undo target. `onLogUncomplete` threaded `TrackersPanel`→`TrackerCard`;
  `GoalsWorkspace` wires `onLogUncomplete={goalDetail.onUncompleteTracker}` at both
  call sites and **removed the dead `TrackerList`** (+ its now-unused `Tracker`
  import). +15 tests (9 pure display + 6 text-level; `tracker-detail-state.test.ts`
  completion assertion updated to the `isTrackerPeriodComplete` helper). tsc clean;
  goals 58/58; momentum 64/64. New decision **D-010** (periodState is the sole
  display source incl. the null/unhydrated empty fallback: counter 0, habit 7 empty
  dots). **Interim caveat now RESOLVED** — the card no longer reads
  `trackers.current_value`. **Next: Task 9** (dashboard migrate off
  `/api/goals/complete-tracker` + tz-aware `due-today`, then delete legacy route +
  `completeTracker` wrapper — D-009). See `changelog/008-*`.
- **Implementation state (prior): Tasks 0–7 done.** **Task 7 done (session 007):**
  goal-detail trackers now render in **Ongoing** vs **Completed** sections. New
  pure, node-tested `features/goals/tracker-grouping.ts` (relative imports —
  D-004): `isTrackerCompleted(t)=t.periodState?.isCompleted ?? false` and
  `partitionTrackersByCompletion(trackers)→{ongoing,completed}` (sorts by
  `sortOrder` once, splits, preserves order per section, non-mutating).
  `TrackersPanel.tsx` replaced the flat `sortedTrackers` map with
  `useMemo(()=>partitionTrackersByCompletion(trackers),[trackers])` + a
  `renderSections()` that emits a FLAT sibling array
  `[Ongoing header?, …ongoing, Completed header?, …completed]` — headers
  (`accessibilityRole="header"`, overline typography) render only when the
  section is non-empty; **null-cadence/unhydrated stays Ongoing** with the
  cadence-not-set affordance. All cards + headers are siblings keyed by
  `tracker.id`, so a card moving groups on optimistic complete keeps its instance
  + `isSaving`. `hasTrackers`/add-form `marginTop` now key off `trackers.length`.
  +10 tests; tsc clean; goals 43/43; momentum 64/64. No new decision.
  **Interim (unchanged):** counter/checklist visible display still legacy-scalar
  until Task 8; `onUncompleteTracker` still has no card gesture. **Next: Task 8.**
  See `changelog/007-*`.
- **Task 6 done (session 006):**
  `completedTrackerIds` local set **deleted** everywhere (hook state + reset +
  `UseGoalDetailResult` + `TrackersPanel.completedIds` + both `GoalsWorkspace`
  call sites); completion is now DB-derived — `TrackerCard` reads
  `tracker.periodState?.isCompleted ?? false` (the `isCompleted` prop is gone).
  All three goal-detail mutations (`onCompleteTracker`/`onLogCounter`/new
  `onUncompleteTracker`) POST the shared `/api/trackers/log` route and reconcile
  via `periodStateFromDto`+`patchTracker`. New pure, node-tested module
  `features/goals/tracker-optimism.ts` (relative imports): optimistic
  complete/uncomplete/counter transforms, `completionValueForTracker`,
  `patchTrackerInGoals` reducer, and a per-tracker mutation registry
  (`beginMutation`→seq|null in-flight guard, `isLatestMutation` ordering guard,
  `endMutation`, `resetRegistry`). Rollback restores the prior `periodState`
  **only if still the latest** mutation → complete-then-uncomplete is
  order-independent. New `features/goals/store.ts` `patchTracker` (functional
  merge-by-id, no whole-object clobber). New boundary refresh: pure
  `features/goals/tracker-boundary.ts` + `hooks/useTrackerBoundaryRefresh.ts`
  (timer at earliest `periodState.endExclusive` + RN `AppState` active + web
  `visibilitychange`/`focus`; recomputed via a memoized boundary epoch).
  `onSaveTracker` now merges metadata via `patchTracker` (preserving live
  `periodState`) and **rederives** (`periodState:null` + `refreshDetail()`) on a
  frequency/target change. +24 tests (15 optimism + 4 boundary + 5 text-level);
  tsc clean; momentum 64/64. **Legacy route NOT deleted** (D-009): dashboard
  still calls `/api/goals/complete-tracker` → Task 9 migrates + deletes it and
  the `completeTracker` wrapper. **Interim (unchanged):** counter/checklist
  visible number still legacy-scalar until Task 8; `onUncompleteTracker` has no
  card gesture until Task 8. See D-009 + `changelog/006-*`. **Next: Task 7.**
- **Task 5 done (session 005):** shared
  authenticated tracker-log mutation core `lib/db/tracker-mutations.ts` (relative
  imports; `mutateTrackerLog` + `TrackerMutationDb` port + `TrackerMutationError`
  + `TrackerPeriodStateDto`/`periodStateToDto`) with the Supabase adapter
  `createTrackerMutationDb` and entry point `logTrackerMutation` in
  `lib/db/goals.ts`; single actioned route `app/api/trackers/log+api.ts`
  (`complete|counter-log|uncomplete`); `completeTracker` now delegates + returns
  `{success,periodState}` and no longer writes `current_value`; complete is
  idempotent; uncomplete deletes ALL current-period logs; null-cadence rejected
  (`422`); counter `+1` restored via `onLogCounter` (non-optimistic reconcile —
  Task 6 adds optimism/boundary); `✓ Log` hidden for counters; manual
  current-progress input removed; clone phase-summary + ExtendGoalModal now
  log-derived (`lib/goals/phase-summary.ts`, paginated). +19 fixture tests; tsc
  clean; momentum 64/64. **Interim:** counter number visible-update waits on
  Task 8 (card still reads legacy scalar). See D-008 + `changelog/005-*`. **Next:
  Task 6** (client state/optimism/boundary refresh; delete `completedTrackerIds`).
- **Tasks 0–4 done.** `lib/time/zoned-calendar.ts` and
  `lib/goals/tracker-cadence.ts` (+ test) exist. **Migration `046` created +
  applied live** (session 003): compound covering index
  `tracker_logs_tracker_id_logged_at_idx (tracker_id, logged_at desc) include
  (id, value)` is live; redundant `idx_tracker_logs_tracker_id` dropped;
  `schema_migrations` now tops at `046`. **Tasks 3+4 done (session 004):**
  `TrackerPeriodBucket`/`TrackerPeriodState`/`Tracker.periodState` now in
  `features/goals/types.ts` (re-exported from `lib/goals/tracker-period.ts`);
  `currentValue` removed from `TrackerUpdates` (D-007); pure
  `deriveTrackerPeriodState` in `lib/goals/tracker-period.ts` (+20 tests);
  generic `fetchAllPages` in `lib/db/paginate.ts` (+5 tests, incl. >1000-log
  sum); `hydrateGoalTrackers`/`fetchHydratedGoalDetail` in `goal-service.ts`
  (frequency-batched, ≤3 parallel paginated reads, one `asOf`); `useGoalDetail`
  always hydrates the selected goal only. Still missing (future tasks): new
  `app/api/trackers/` mutation routes (Task 5). Next up: **Task 5** (auth
  logging/uncomplete + legacy fixes) — and it must **restore the counter `+1`**,
  which is inert on the branch after D-007.

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

## ✅ Migration number drift (RESOLVED 2026-09-09, session 003)

- Plan Task 2 said `044_...`; 044 and 045 were already taken. Task 2 correctly
  created **`046_tracker_logs_period_index.sql`** and applied it live, inserting
  the `schema_migrations` row (D-003). Live history now tops at `046`. The `045`
  gap (idempotent, Entries-domain) still exists and is the Entries owner's
  info-only item. See [[DECISIONS.md]] D-001/D-003/D-006.

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
- **Indexes on tracker_logs** (updated session 003): `tracker_logs_pkey` +
  `tracker_logs_tracker_id_logged_at_idx` (compound covering
  `(tracker_id, logged_at desc) include (id, value)`, added by migration 046).
  The old plain btree `idx_tracker_logs_tracker_id` was **dropped** in 046.
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
