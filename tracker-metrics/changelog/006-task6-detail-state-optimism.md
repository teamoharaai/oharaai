# Session 006 — Task 6: goal-detail state, optimistic mutations, boundary refresh

- **Date:** 2026-09-11
- **Task(s):** Task 6
- **Agent/model:** Opus 4.8, high effort
- **tsc baseline (before):** clean (exit 0)

## Goal of this session

Delete the local `completedTrackerIds` set so completion is DB-derived; move all
three tracker mutations (complete / counter-log / uncomplete) onto the shared
authenticated `POST /api/trackers/log` route and reconcile from the returned
`periodState`; add per-tracker optimism, an in-flight guard, and a latest-mutation
ordering guard with rollback-if-still-latest; add a functional `patchTracker`
store action; add cadence-boundary refresh (timer + RN foreground + web
visibility/focus); and rederive after a frequency/target edit. Legacy-route
removal is deferred (D-009) because the dashboard still consumes it (Task 9).

## Changes

- **`features/goals/tracker-optimism.ts`** (new, relative imports — D-004) — pure,
  node-testable core: `completionValueForTracker` (mirrors the server rule);
  `applyOptimisticComplete/Uncomplete/Counter` (immutable current-bucket
  transforms; no-op on a null period state); `patchTrackerInGoals` (functional
  merge-by-id reducer); and the per-tracker mutation registry
  (`createMutationRegistry`, `beginMutation` → seq or `null` when an identical
  action is in flight, `isLatestMutation`, `endMutation`, `resetRegistry`).
- **`features/goals/tracker-boundary.ts`** (new, relative imports) — pure
  `earliestConfiguredPeriodEndEpoch` and `computeBoundaryDelayMs` (fires just
  after the earliest configured `endExclusive`; past boundary → min delay).
- **`features/goals/hooks/useTrackerBoundaryRefresh.ts`** (new) — effect hook:
  a timer keyed on the earliest boundary epoch (memoized so optimistic patches
  don't churn it) + RN `AppState` `active` + web `visibilitychange`/`focus`.
- **`features/goals/store.ts`** — added `patchTracker(goalId, trackerId, patch)`
  (functional merge via `patchTrackerInGoals`); `upsertTracker` (whole-object
  replace) retained for add/delete rollback.
- **`features/goals/hooks/useGoalDetail.ts`** —
  - Deleted `completedTrackerIds` state, its reset, and its `UseGoalDetailResult`
    member. Added a `mutationRegistry` ref (reset on goal change).
  - `onCompleteTracker` → posts `/api/trackers/log` `action:'complete'`;
    optimistic complete; reconcile via `periodStateFromDto`+`patchTracker`;
    dropped the `success`-only assertion and the `currentValue:1` write; idempotent
    skip when already completed; guards + rollback-if-latest.
  - `onLogCounter` → added optimistic +1 bucket bump + in-flight guard +
    rollback-if-latest on top of the existing reconcile.
  - `onUncompleteTracker` (new) → `action:'uncomplete'`; optimistic clear +
    reconcile (habit/checklist only; counters short-circuited).
  - All three: `beginMutation`/`isLatestMutation`/`endMutation`, best-effort
    Momentum refresh on success, shared `trackerMutationErrorMessage` (keeps the
    `UnauthorizedError` copy).
  - `onSaveTracker` now merges metadata via `patchTracker` (preserving the live
    `periodState`), and on a frequency/target change drops the stale state and
    calls the new stable `refreshDetail()` to rederive.
  - Added `refreshDetail` (stable; reads store via `getState()`), wired into
    `useTrackerBoundaryRefresh`.
- **`features/goals/components/TrackerCard.tsx`** — removed the `isCompleted`
  prop; the card now derives `isCompleted` from `tracker.periodState?.isCompleted
  ?? false` (interim until Task 8 rewrites the card).
- **`features/goals/components/TrackersPanel.tsx`** — removed the `completedIds`
  prop and its `TrackerCard` pass-through.
- **`features/goals/components/GoalsWorkspace.tsx`** — removed
  `completedIds={goalDetail.completedTrackerIds}` from both panel call sites.
- **`docs/API_CONTRACT.md`** — marked `/api/goals/complete-tracker` deprecated;
  documented that goal detail no longer uses it and that its removal (with the
  `completeTracker` wrapper) is pending the Task 9 dashboard migration (D-009).

## Tests

- Added:
  - `features/goals/tracker-optimism.test.ts` (15 cases) — completion-value rule;
    optimistic complete/uncomplete/counter incl. immutability + null no-ops;
    `patchTracker` non-clobber; in-flight double-tap = one completion; different
    action supersedes; `resetRegistry`; and an end-to-end handler simulation
    proving failed-optimistic rollback and complete-then-uncomplete out-of-order
    ordering.
  - `features/goals/tracker-boundary.test.ts` (4 cases) — earliest boundary,
    fire-after-boundary delay, expired→min-delay, none→no-timer.
  - `features/goals/tracker-detail-state.test.ts` (5 text-level cases) — no local
    completion set anywhere; all three actions on `/api/trackers/log`; optimism +
    guards present; frequency/target invalidation→rederive; boundary hook wiring.
- Commands + result:
  - `npx tsc --noEmit` → **pass (exit 0)** before and after.
  - `node --experimental-strip-types --test` new suites → **20 passed / 0 failed**.
  - Task 3/4/5 suites (`tracker-mutations`, `tracker-period`, `paginate`,
    `tracker-cadence`) → **57 passed / 0 failed**.
  - `features/goals/*.test.ts` + `features/momentum/refresh.test.ts`
    → **16 passed / 0 failed**.
  - `npm run test:momentum` → **64 passed / 0 failed**.

## Decisions made

- **D-009** — legacy `/api/goals/complete-tracker` retirement deferred to Task 9.
  The route's deletion was conditioned on "no client references it"; the dashboard
  due-today card still calls it and its migration is Task 9 scope. Task 6 migrates
  only the goal-detail client and marks the route deprecated; Task 9 deletes the
  route + the `completeTracker` wrapper. See `DECISIONS.md`.

## Follow-ups / handoff

- **Next action:** **Task 7** — Ongoing/Completed grouping in `TrackersPanel.tsx`
  partitioned on `tracker.periodState?.isCompleted ?? false`.
- **Interim (unchanged):** counter/checklist visible display still reads the
  legacy scalar until Task 8; `periodState` is authoritative in the store.
  `onUncompleteTracker` exists on the hook but has no card gesture yet — Task 8
  adds the accessible complete/uncomplete toggle and threads it through the panel.
- **Task 9 must** migrate the dashboard off `/api/goals/complete-tracker`, then
  delete the route file and the `completeTracker` wrapper in `lib/db/goals.ts`
  (keep `logTrackerMutation`/adapter). See D-009.
- Live DB untouched this session (no migration, no data writes).
- No commit made (user has not asked to commit).
