# Session 004 — Tasks 3+4: tracker contract + period derivation (atomic)

- **Date:** 2026-09-09
- **Task(s):** Tasks 3 and 4 (one atomic change)
- **Agent/model:** Opus 4.8, high effort
- **tsc baseline (before):** clean (exit 0)

## Goal of this session

Land the shared `Tracker` period contract, a pure log→period-state derivation
function, and the frequency-batched, paginated hydrated goal-detail read path —
together, as one atomic change. `tracker_logs` becomes the evidence for
goal-detail period progress/completion; `trackers.current_value` is no longer
read or written for period UI.

## Changes

- **`features/goals/types.ts`** — added `TrackerPeriodBucket` and
  `TrackerPeriodState` (re-exported from `@/lib/goals/tracker-period`); added
  `Tracker.periodState: TrackerPeriodState | null`; documented that legacy
  `Tracker.currentValue` is NOT current-period truth; **removed `currentValue`
  from `TrackerUpdates`** (progress is no longer client-writable).
- **`lib/goals/tracker-period.ts`** (new) — pure `deriveTrackerPeriodState(meta,
  logs, tz, asOf)`. Buckets via `getRecentPeriodBounds(freq, asOf, tz, 7)`; sums
  per bucket and current period; `hasLog` on half-open bounds. Completion:
  checklist/habit = ≥1 current-period log; counter = current sum ≥ positive
  `targetValue`. Returns 7 buckets for configured cadence, `null` for null
  frequency. Relative imports only (D-004). Also exports `TrackerPeriodBucket`,
  `TrackerPeriodState`, `TrackerPeriodLog`, `TrackerPeriodInput`,
  `TrackerMeasure`, `RECENT_PERIOD_COUNT`.
- **`lib/db/paginate.ts`** (new) — generic `fetchAllPages(fetchPage, pageSize=500)`
  mirroring the `lib/db/friends.ts` / `constellation.ts` loop (fetch fixed pages
  until a short page; throw on any page error). Reader injected as a callback so
  it's pure/test-reachable (D-004). `PAGE_SIZE = 500`.
- **`features/goals/services/goal-service.ts`** —
  - `mapTracker` now initializes `periodState: null` on raw/list trackers.
  - Removed the `updateTracker` `current_value` patch line (field is no longer
    in `TrackerUpdates`).
  - Added hydration: `fetchProfileTimezone`, `fetchPeriodLogsForGroup`
    (paginated, selects only `id, tracker_id, value, logged_at`, orders by
    `logged_at` then `id`), `hydrateGoalTrackers` (partitions trackers by cadence
    and issues **≤3 parallel** period-log batches — one per non-empty cadence,
    each using that cadence's exact 7-period lower bound; a monthly tracker never
    forces 7 months of daily logs), `fetchHydratedGoalDetail`, and
    `TrackerPeriodLoadError`. One `asOf` reused across every tracker. On log-read
    failure the goal is returned unhydrated (`periodState: null`) with an `error`
    string — never mapped to zero/incomplete.
- **`features/goals/hooks/useGoalDetail.ts`** — opening detail now always runs
  `fetchHydratedGoalDetail` for the **selected goal only** (tracked by a new
  `hydratedGoalId` guard); a listed goal is no longer treated as already
  hydrated. One `asOf` captured per open. Log-read errors surface via
  `trackerError`. The global list is not hydrated. (Existing `completedTrackerIds`
  left intact — Task 6 removes it.)
- **`features/goals/components/TrackerCard.tsx`** — compile-safety only for the
  `TrackerUpdates.currentValue` removal: dropped the manual-edit `currentValue`
  write and made counter `increment()` inert (see D-007). The real counter-log
  rewrite is Task 5/8.

## Tests

- Added: `lib/goals/tracker-period.test.ts` (20 cases) — 3 types × 3
  frequencies; counter below/at/above target; counter with absent/zero target;
  habit & checklist presence; multiple logs in one period; half-open bounds
  (start included / end excluded); previous-period bucket placement; one asOf
  across cadences; invalid-tz→UTC; distinct+ordered per-cadence read windows;
  null-frequency → null; 7 contiguous buckets oldest→newest.
- Added: `lib/db/paginate.test.ts` (5 cases) — order-preserving accumulation;
  exact-multiple extra empty page; error propagation; invalid page size; **>1000
  (1500) logs paginated → correct final sum** through the derivation.
- Commands + result:
  - `npx tsc --noEmit` → **pass (exit 0)** before and after.
  - `node --experimental-strip-types --test lib/goals/tracker-period.test.ts lib/db/paginate.test.ts`
    → **25 passed / 0 failed** (20 derivation + 5 pagination).
  - `node --experimental-strip-types --test lib/goals/tracker-cadence.test.ts`
    → pass (no regression).
  - `npm run test:momentum` → **64 passed / 0 failed** (shared contract touch).
  - Existing `features/goals/*.test.ts` (goals-workspace, active-goal-selectors)
    → **9 passed / 0 failed**.

## Decisions made

- **D-007** — removing `TrackerUpdates.currentValue` (mandated by the Tasks 3+4
  contract) forces neutralizing the two write sites that used it now, so tsc
  stays green; Task 5 owns the full mutation/UI rewrite. See `DECISIONS.md`.

## Follow-ups / handoff

- **Next action:** **Task 5** — authenticated logging/uncomplete + legacy fixes
  (refactor `completeTracker` into a shared auth mutation; stop writing
  `current_value`; counter/habit/checklist logging; null-cadence rejection;
  idempotent complete; uncomplete deletes current-period logs; return the
  `periodState` DTO). Depends on Tasks 1 and 3+4 — both now done → **GO**.
- Counter `+1` is temporarily inert on the branch (D-007); Task 5 restores it via
  authenticated logging. Do not ship 3+4 without 5 close behind.
- Live hydration read path (profile tz + ≤3 log batches) is covered by fixtures
  only; prod has 37 logs / 0 monthly trackers, so >1000-log pagination and
  monthly buckets have no live coverage by design.
- No commit made this session (user has not asked to commit).
