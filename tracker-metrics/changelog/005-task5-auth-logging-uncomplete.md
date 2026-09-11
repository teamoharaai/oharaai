# Session 005 — Task 5: authenticated logging/uncomplete + legacy-consumer fixes

- **Date:** 2026-09-09
- **Task(s):** Task 5
- **Agent/model:** Opus 4.8, high effort
- **tsc baseline (before):** clean (exit 0)

## Goal of this session

Refactor `completeTracker` into a shared authenticated tracker-log mutation
covering checklist/habit complete (idempotent), counter `+1` logging, and
habit/checklist uncomplete (delete all current-period logs); stop writing
`trackers.current_value`; reject null-cadence logging; return the canonical
`{ success, periodState }` DTO; restore the counter `+1` inert since D-007; and
fix the stale-`current_value` legacy consumers (clone phase-summary,
ExtendGoalModal). Client optimism/boundary-refresh (Task 6) and card/dashboard
rendering (Tasks 8/9) are intentionally out of scope.

## Changes

- **`lib/db/tracker-mutations.ts`** (new, relative imports — D-004) — the shared
  mutation core behind a narrow `TrackerMutationDb` port. `mutateTrackerLog`
  enforces successor/read-only → goal ownership → tracker-in-goal → action/type
  compatibility → null-cadence rejection, then does ONE bounded 7-period read and
  derives the authoritative DTO from the resulting log set with a single captured
  `asOf`. Exports `TrackerLogAction`, `TRACKER_LOG_ACTIONS`,
  `TrackerMutationError`(+`trackerMutationErrorStatus`), the port, the wire DTO
  (`TrackerPeriodStateDto`), `periodStateToDto`, and `mutateTrackerLog`. **Never
  writes `current_value`.**
- **`lib/goals/phase-summary.ts`** (new, relative imports) — pure
  `buildPriorPhaseSummary(trackers, logs)`: counter = sum of log values;
  habit/checklist = count of logs (replaces stale `current_value>0?1:0`).
- **`lib/db/goals.ts`** —
  - `createTrackerMutationDb(db)` adapter (authed Supabase → port), with
    paginated `fetchPeriodLogs` (`fetchAllPages`) and a scoped
    `deleteLogsInRange`.
  - `logTrackerMutation(input, db)` — entry point for the shared route.
  - `completeTracker(...)` now delegates to `logTrackerMutation({action:'complete'})`
    and returns `{ success, periodState }`; the checklist `current_value=1` write
    is gone.
  - `cloneGoalWithMilestonesAndTrackers` prior-phase summary now derives from a
    **paginated** phase-window log read (all tracker types) via
    `buildPriorPhaseSummary`; dropped `current_value` from the clone tracker
    select/row type. Removed now-dead `DbCompletableTrackerRow`.
- **`app/api/trackers/log+api.ts`** (new) — single authenticated route with the
  `action` discriminator; validates `{trackerId, goalId, action, value?}`, maps
  `TrackerMutationError` codes to HTTP status (409/404/422/400), returns the DTO.
- **`app/api/goals/complete-tracker+api.ts`** — returns `completeTracker`'s
  `{ success, periodState }` result and maps `TrackerMutationError`
  (successor→409) instead of `GoalExtensionError`.
- **`features/goals/services/goal-service.ts`** — added `periodStateFromDto`
  (ISO→Date mapping boundary). Confirmed `updateTracker` no longer patches
  `current_value` (removed in Tasks 3+4).
- **`features/goals/hooks/useGoalDetail.ts`** — added `onLogCounter`: posts
  `action:'counter-log'` to `/api/trackers/log`, reconciles `periodState` from
  the response, best-effort Momentum refresh. `onCompleteTracker` untouched.
- **`features/goals/components/TrackerCard.tsx`** — `increment()` now calls
  `onLogCounter` (restored); removed the manual current-progress input + its
  state/validation; hid the `✓ Log` one-tap button for counters.
- **`features/goals/components/TrackersPanel.tsx`** + **`GoalsWorkspace.tsx`** —
  thread `onLogCounter` through to the card (both panel instances).
- **`features/goals/components/ExtendGoalModal.tsx`** — checklist done-state and
  tracker value now read `periodState` (not the stale `currentValue`).
- **`docs/API_CONTRACT.md`** — documented `POST /api/trackers/log` (actions,
  semantics, DTO), log-derived completion, reversible habit/checklist state, and
  the legacy `complete-tracker` route's new DTO.

## Tests

- Added: `lib/db/tracker-mutations.test.ts` (19 cases) — successor/ownership/
  tracker-not-found rejection; null-cadence rejection for all actions;
  action/type mismatches; checklist/habit complete value + idempotency;
  complete-with-previous-period-log; two counter taps sum to 2; counter reaches
  target; counter value validation (0/neg/NaN/Infinity → INVALID_VALUE);
  uncomplete deletes ALL current-period logs and cannot reach a previous period;
  DTO shape (ISO strings, 7 buckets); error→status mapping; prior-phase summary
  derivation incl. a >1000-log counter-sum fixture.
- Commands + result:
  - `npx tsc --noEmit` → **pass (exit 0)** before and after.
  - `node --experimental-strip-types --test lib/db/tracker-mutations.test.ts lib/goals/tracker-period.test.ts lib/db/paginate.test.ts lib/goals/tracker-cadence.test.ts`
    → **57 passed / 0 failed**.
  - `npm run test:momentum` → **64 passed / 0 failed**.
  - `features/goals/*.test.ts` + `features/momentum/refresh.test.ts`
    → **16 passed / 0 failed**.

## Decisions made

- **D-008** — injected DB port (not a Supabase fake) for testability; single
  bounded read + local re-derivation; additive `{success, periodState}` DTO;
  counter restore stays non-optimistic (Task 6 adds optimism/boundary), counter
  display still legacy until Task 8; `✓ Log` hidden for counters; phase summary
  log-derived (checklist 0/1 → count). See `DECISIONS.md`.

## Follow-ups / handoff

- **Next action:** **Task 6** — goal-detail state + optimistic mutations. Delete
  `completedTrackerIds`; migrate `onCompleteTracker`/`onLogCounter` to the shared
  `/api/trackers/log` route and consume `periodState` (drop the `success`-only
  assertion); add `onUncompleteTracker`; add per-tracker in-flight guards,
  optimistic bucket updates + rollback, `patchTracker` store action, and boundary
  refresh; then retire `app/api/goals/complete-tracker`.
- **Interim runtime note:** counter `+1` logs correctly and updates store
  `periodState`, but the visible counter number stays put until Task 8 drives
  card display from `periodState`. Do not ship before Task 8.
- Live DB untouched this session (no migration, no data writes); idempotency,
  uncomplete-deletes-all, counter sums, and >1000-log summaries are fixture-proven.
- No commit made (user has not asked to commit).
