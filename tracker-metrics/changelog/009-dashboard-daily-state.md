# Session 009 — Task 9: dashboard daily-state alignment + legacy-route deletion

- **Date:** 2026-09-11
- **Task(s):** Task 9
- **Agent/model:** Opus 4.8, high effort
- **tsc baseline (before):** clean (exit 0)

## Goal of this session

Migrate the dashboard due-today card off the legacy
`/api/goals/complete-tracker` route onto the shared `POST /api/trackers/log`;
make `GET /api/trackers/due-today` timezone-aware and return log-derived booleans
instead of stale `current_value`/`lastCompletedAt` scalars; and — once no
reference remained — delete the legacy route file and the `completeTracker`
wrapper (D-009), keeping the shared mutation core/adapter.

## Changes

- **`lib/goals/due-today.ts`** (new, pure, relative imports — D-004) —
  `deriveDueTodayState(meta, logs, timezone, asOf)` computes the CURRENT daily
  window via the shared `getPeriodBounds('daily', …)` and returns
  `{ currentPeriodValue, isCompletedThisPeriod, periodEndExclusive }`. Completion
  mirrors the settled semantics used by `deriveTrackerPeriodState` (counter: sum
  ≥ positive target; habit/checklist: any presence). `tracker_logs` is the sole
  evidence; never the legacy scalar, never a client clock.
- **`app/api/trackers/due-today+api.ts`** (rewrite) — reads `profiles.timezone`
  (normalized), derives one daily half-open window in that zone, queries only
  daily trackers and only that window's logs (`fetchAllPages`, `gte`/`lt`), and
  returns per-tracker `currentPeriodValue`, `isCompletedThisPeriod`,
  `periodEndExclusive`. Dropped `currentValue` and `lastCompletedAt` from the
  response and the last-log map.
- **`app/(app)/dashboard.tsx`** (`DueTodayZone`) — consumes the boolean
  `isCompletedThisPeriod`; removed the browser-timezone `isCompletedToday`
  helper and all `lastCompletedAt` handling. `handleComplete` now posts
  `/api/trackers/log` with `action` chosen by type (`counter → 'counter-log'`,
  else `'complete'`) and reconciles from `payload.periodState.isCompleted`.
  Added a stable `load` (`useCallback`) + `isMountedRef` and wired
  `useTrackerBoundaryRefresh` over minimal `periodEndExclusive`-carrying
  stand-ins so the zone refreshes at user-local midnight and on
  foreground/visibility/focus (mirrors goal detail). New imports: `useCallback`,
  `Tracker` type, `useTrackerBoundaryRefresh`.
- **`app/api/goals/complete-tracker+api.ts`** — **deleted** (last caller migrated).
- **`lib/db/goals.ts`** — **deleted** the `completeTracker` wrapper. Kept
  `logTrackerMutation` + `createTrackerMutationDb` (the shared core/adapter).
- **`docs/API_CONTRACT.md`** — replaced the deprecated complete-tracker section
  with a "Removed" note; rewrote the due-today section to the new
  booleans/period-end shape and timezone semantics.

## Tests

- Added: `lib/goals/due-today.test.ts` (8 pure tests: tz window incl. Tokyo
  cross-UTC-day case, invalid-tz→UTC fallback, habit/checklist presence, counter
  target boundary, zero/null target never completes, out-of-window logs ignored,
  DST spring-forward determinism per D-005).
- Added: `features/goals/dashboard-due-today.test.ts` (6 text-level tests:
  dashboard on the shared route, action-by-type, periodState reconcile + no
  client-clock helper, boundary refresh, tz-aware booleans-not-scalars route,
  and the legacy route file + `completeTracker` wrapper are gone while the core
  remains).
- Commands run:
  - `npx tsc --noEmit` → pass (before and after)
  - `node --test lib/goals/due-today.test.ts` → 8/8 pass
  - `node --test features/goals/dashboard-due-today.test.ts` → 6/6 pass
  - `node --test features/goals/*.test.ts lib/goals/*.test.ts lib/db/paginate.test.ts lib/db/tracker-mutations.test.ts` → 129/129 pass
  - `npm run test:momentum` → 64/64 pass

## Decisions made

- **D-011** — Dashboard due-today: action-by-type (counter `+1`, else complete),
  one-way card (no dashboard uncomplete gesture), and reuse of
  `useTrackerBoundaryRefresh`. Also confirms the D-009 deletion condition is met.

## Follow-ups / handoff

- **Next: Task 10** (automated + manual verification / release gate). Add a
  `test:tracker-metrics` package script covering cadence, derivation, due-today,
  and tracker-state tests; run the full matrix; review remaining
  `current_value`/`currentValue` references for legacy-safety; execute the manual
  matrix. No blockers.
- Note: `HomeGoalPreview` in `dashboard.tsx` still reads `tracker.currentValue`
  on the goal-LIST path (`nextTracker` selection) — pre-existing, outside the
  due-today card, and legacy-safe for now; flag it in the Task 10
  current_value audit.
