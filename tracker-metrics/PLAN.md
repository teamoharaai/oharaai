# Tracker Metrics Implementation Plan

Status: approved design, revised for implementation
Purpose: source of truth for the dedicated tracker-metrics implementation session
Owner: CEO lane (types/architecture) + CTO lane (schema/services) — see `CLAUDE.md` File Ownership
Cascade level: **L3** (shared type contract, database migration, authenticated mutations)
Last revised: 2026-08-26

## New-session opener

Read this entire file before making changes. Then read `AGENTS.md`, `CLAUDE.md`,
`CONTEXT.md`, and the scoped implementation files named by the active task.

Execute tasks in the order defined here. Do not combine unrelated cleanup with
this work. Tasks 3 and 4 intentionally form one atomic code change, and Tasks 5
and 6 should be implemented back-to-back so no mutation contract is left without
its client integration.

For every code-changing task:

1. Run `npx tsc --noEmit` before editing and record whether the baseline is clean.
2. Make only the changes required by the active task.
3. Add or update the task-specific automated tests.
4. Run `npx tsc --noEmit` after editing plus the relevant test command(s).
5. Update `CHANGELOGCODEX.md` with what changed, why, and the affected files.
6. Review the diff for unrelated changes before handing off.

Do not apply a database migration merely because the migration file was created.
Applying and verifying the migration is an explicit part of Task 2 and must use
the repository's approved live-database process.

## Problem statement

1. Trackers never reset on cadence. `trackers.current_value` is a persistent
   scalar with no period concept.
2. Goal-detail completion state is held in the local `completedTrackerIds` React
   set, so navigation and reloads can make the UI disagree with the database.
3. Habit circles use `round(currentValue)` rather than calendar evidence, so
   daily, weekly, and monthly trackers render the same incorrect history.
4. Trackers render as one flat list instead of Ongoing and Completed groups.
5. Counter increments and manual current-progress edits bypass `tracker_logs`.

## Final product and data decisions

These decisions are settled for this plan.

### Canonical evidence

- `tracker_logs` is the source of truth for period progress and completion.
- `trackers.current_value` remains in the database for backward compatibility,
  but tracker-metrics code stops writing it and never uses it for period UI.
- Do not drop or rename `trackers.current_value` in this initiative.
- Do not add a persistent completion column.
- Counter increments insert `tracker_logs` rows just like habit/checklist logs.

### Completion semantics

- **Checklist:** complete when at least one log exists in the current period.
- **Habit:** complete when at least one log exists in the current period.
- **Counter:** complete only when the sum of current-period log values is greater
  than or equal to its positive `targetValue`.
- Counter progress may exceed the target; UI progress bars remain capped at 100%.
- A checklist log has value `1`.
- A habit one-tap log uses a positive `targetValue` when present, otherwise `1`.
- A counter `+1` log has value `1`. A future arbitrary-increment UI is out of
  scope, but the server validation should accept only finite positive values.

### Uncomplete semantics

- Habit and checklist trackers support a reversible current-period toggle.
- Uncomplete deletes **all** current-period logs for that habit/checklist tracker,
  ensuring the derived completion state becomes false even if duplicate logs
  exist from retries or older clients.
- Counter trackers do not use the cross-out/uncomplete gesture. A separate
  decrement/undo-counter interaction is out of scope.
- This does not conflict with one-way top-level Goal completion.

### Cadence and timezone semantics

- Daily, weekly, and monthly periods are evaluated in `profiles.timezone`, an
  IANA timezone. Never use the Vercel/server process timezone as user-local time.
- Invalid or missing profile timezones deterministically fall back to `UTC`,
  matching the existing Momentum time behavior.
- Weekly periods use ISO-style Monday starts.
- All bounds are half-open: `startInclusive <= loggedAt < endExclusive`.
- One `asOf` instant is captured per read/mutation and reused for every tracker
  calculation in that operation.
- `frequency: null` means **cadence not configured**. Its period state is `null`,
  it remains in Ongoing, and logging is rejected until the user selects a
  daily/weekly/monthly cadence. Do not silently coerce it to weekly.

### Habit history semantics

- Every habit renders exactly seven period buckets ordered oldest to newest.
- Daily: seven local calendar days.
- Weekly: seven Monday-start calendar weeks.
- Monthly: seven calendar months.
- A bucket is filled when any log exists within its half-open bounds.

### Scope boundaries

- No analytics/telemetry tables, events, or instrumentation.
- No milestone behavior changes.
- No changes to Constellation, Vault, or Echo.
- Momentum remains log-driven. Run its relevant tests, but do not redesign it.
- No new SQL aggregation RPC in Phase 1. Use bounded, frequency-batched,
  explicitly paginated reads. A database aggregation function is a future
  optimization only if measured volume justifies it.

## Client domain contract

Keep the raw persisted tracker fields and group derived state under one property
instead of adding several unrelated top-level fields.

```ts
export interface TrackerPeriodBucket {
  startInclusive: Date;
  endExclusive: Date;
  value: number;
  hasLog: boolean;
}

export interface TrackerPeriodState {
  asOf: Date;
  timezone: string;
  startInclusive: Date;
  endExclusive: Date;
  currentValue: number;
  isCompleted: boolean;
  recentPeriods: TrackerPeriodBucket[]; // exactly 7, oldest -> newest
}

export interface Tracker {
  // Existing persisted/domain fields remain.
  periodState: TrackerPeriodState | null;
}
```

`periodState: null` means cadence is not configured or detailed period state has
not yet been hydrated. The selected goal-detail screen must not present a
null/unhydrated state as an authoritative incomplete result; it should remain in
its loading/error flow until detail hydration succeeds.

Network/API responses use ISO timestamp strings. Convert them to `Date` objects
at the existing client mapping boundary. Do not pass `Date` objects through JSON
and assume they remain dates.

`TrackerUpdates` must not contain `currentValue`. Once logs are canonical,
current progress is not directly client-writable.

## Read-path design

Goal-list data is not authoritative goal-detail tracker state. `mapTracker`
initializes `periodState` to `null`; opening goal detail always performs a detail
refresh and hydrates the selected goal.

For one selected goal:

1. Fetch the goal/trackers and the authenticated user's profile timezone.
2. Capture one `asOf` instant.
3. Partition tracker IDs by daily, weekly, and monthly frequency.
4. Issue at most three period-log queries in parallel, one per non-empty
   frequency group, using that group's exact seven-period lower bound.
5. Select only `id, tracker_id, value, logged_at`.
6. Order deterministically by `logged_at`, then `id`.
7. Paginate with `.range()` until fewer than the configured page size are
   returned. Never assume an unpaginated response is complete.
8. Group and derive period state through one pure function.
9. If any log read fails, surface a tracker-state load error. Do not silently map
   missing evidence to zero/incomplete.

Do not use one global seven-month lower bound: that would fetch seven months of
daily counter logs whenever the goal also contains one monthly tracker.

## Mutation contract

All tracker logging and uncomplete operations go through authenticated Expo API
routes and the ownership/read-only checks already used by `completeTracker`.

Mutation input includes `goalId` and `trackerId`; counter logging may additionally
include a validated positive value. The server resolves tracker type, frequency,
target, profile timezone, and the authoritative period bounds. Never trust those
fields from the request body.

Mutation responses return the canonical updated tracker period-state DTO, not
only `{ success: true }`. The client may update optimistically but must reconcile
with the returned state.

Habit/checklist complete is idempotent for normal clients: if a current-period
log already exists, return current state without adding another. The client also
maintains a per-tracker in-flight guard. Uncomplete deletes every current-period
habit/checklist log.

Frequency or target edits invalidate existing derived state. After either edit,
refetch/rederive the tracker instead of preserving an old period state whose
bounds or completion threshold are no longer valid.

## Task order and model allocation

Use the exact model/effort shown unless the model is unavailable. If unavailable,
choose the most capable available coding model at the same effort. `xhigh` is
reserved for a final audit when a high-effort implementation reveals unresolved
cross-layer risk; it is not the default for any task.

| Order | Task | Codex model | Reasoning effort |
|---:|---|---|---|
| 0 | Contract and data preflight | `gpt-5.6-sol` | `high` |
| 1 | Shared timezone-aware cadence utilities | `gpt-5.6-sol` | `high` |
| 2 | Period-query index migration | `gpt-5.6-terra` | `low` |
| 3+4 | Tracker contract and period derivation (atomic) | `gpt-5.6-sol` | `high` |
| 5 | Authenticated logging/uncomplete and legacy-consumer fixes | `gpt-5.6-sol` | `high` |
| 6 | Goal-detail state, optimistic mutations, boundary refresh | `gpt-5.6-sol` | `high` |
| 7 | Ongoing/Completed grouping | `gpt-5.6-terra` | `low` |
| 8 | Tracker card and habit-history rewrite | `gpt-5.6-sol` | `medium` |
| 9 | Dashboard daily-state alignment | `gpt-5.6-terra` | `medium` |
| 10 | Automated and manual verification | `gpt-5.6-sol` | `high` |

---

## Task 0 — Contract and data preflight

**Model:** `gpt-5.6-sol`  
**Effort:** `high`  
**Priority:** P0  
**Code change:** No application code expected

### Work

- Confirm the decisions and contracts in this file match the live schema and
  current call sites.
- Read `features/momentum/time.ts` and its tests before designing cadence code.
- Inventory live `trackers.frequency is null` rows if database access is
  available. Record the count; do not mutate them in this task.
- Trace all `current_value`, `currentValue`, `completeTracker`, and
  `tracker_logs` consumers. At minimum include:
  - `features/goals/services/goal-service.ts`
  - `features/goals/hooks/useGoalDetail.ts`
  - `features/goals/components/TrackerCard.tsx`
  - `features/goals/components/TrackersPanel.tsx`
  - `features/goals/components/ExtendGoalModal.tsx`
  - `features/goals/components/GoalsWorkspace.tsx`
  - `lib/db/goals.ts`
  - `app/api/goals/complete-tracker+api.ts`
  - `app/api/trackers/due-today+api.ts`
  - `app/(app)/dashboard.tsx`
  - `features/momentum/services/momentum-service.ts`
- Confirm migration `044` is still the next available number immediately before
  Task 2; change the filename if another migration landed first.

### Acceptance

- No unresolved product semantic remains.
- Every direct `current_value` reader/writer is assigned to a task or explicitly
  documented as legacy and safe.
- Null-frequency handling is confirmed as the deterministic behavior above.

---

## Task 1 — Shared timezone-aware cadence utilities

**Model:** `gpt-5.6-sol`  
**Effort:** `high`  
**Priority:** P0  
**Depends on:** Task 0

### Work

- Extract the reusable timezone primitives currently living in
  `features/momentum/time.ts` into a neutral shared module such as
  `lib/time/zoned-calendar.ts`.
- Preserve compatibility by updating Momentum imports or re-exporting from its
  existing module; do not duplicate the DST conversion algorithm.
- Create `lib/goals/tracker-cadence.ts` with pure functions:

```ts
type PeriodBounds = {
  startInclusive: Date;
  endExclusive: Date;
};

getPeriodBounds(frequency, reference, timezone): PeriodBounds
getRecentPeriodBounds(frequency, reference, timezone, count): PeriodBounds[]
isWithinPeriod(loggedAt, bounds): boolean
```

- `getRecentPeriodBounds(..., 7)` returns exactly seven bounds, oldest to newest,
  with the current period last.
- Cache `Intl.DateTimeFormat` instances by normalized timezone to avoid repeated
  formatter construction during multi-tracker hydration.
- Reject negative/zero/non-integer history counts.
- Add `lib/goals/tracker-cadence.test.ts` using the repository's Node test style.

### Required tests

- New York daily bounds across spring-forward and fall-back DST.
- New York and Tokyo represent the same instant in different local periods.
- Sunday 23:59 and Monday 00:01 fall in different Monday-start weeks.
- Exact `endExclusive` is outside the period.
- January/December rollover, leap day, 28/29/30/31-day month transitions.
- Seven recent periods are contiguous and oldest-to-newest.
- Invalid timezone falls back to UTC.

### Acceptance

- All functions are deterministic from `(frequency, reference, timezone)`.
- No server-process-local `getFullYear/getMonth/getDate` logic remains in the new
  utilities.
- Momentum time tests and cadence tests pass.

---

## Task 2 — Period-query index migration

**Model:** `gpt-5.6-terra`  
**Effort:** `low`  
**Priority:** P1  
**Depends on:** Task 0

### Work

- Reconfirm the next migration number.
- Create `supabase/migrations/044_tracker_logs_period_index.sql` if `044` remains
  available.
- Add the covering index:

```sql
create index if not exists tracker_logs_tracker_id_logged_at_idx
  on public.tracker_logs (tracker_id, logged_at desc)
  include (id, value);
```

- The existing single-column `idx_tracker_logs_tracker_id` is redundant once the
  compound index is verified. Drop it in the same migration only after confirming
  its exact live name and that no unexpected definition differs from the baseline.
- No column, RLS, or data changes.
- If the live table is large enough that a normal index build creates unacceptable
  lock risk, use the repository-approved non-transactional concurrent-index
  process instead of improvising inside a transactional migration.
- Apply through the established management API query endpoint with explicit user
  agent, then verify live state.

### Verification

- Query `pg_indexes` for the exact definition.
- Run `EXPLAIN` for a representative query filtering `tracker_id` and a
  `logged_at` lower bound; confirm the new index is eligible/used under realistic
  selectivity.
- Confirm the migration filename and live migration history agree.

### Acceptance

- Migration file is versioned and the live index is confirmed.
- No RLS or table-shape changes occurred.
- Any dropped redundant index was verified by exact name first.

---

## Tasks 3 + 4 — Tracker contract and period derivation (atomic)

**Model:** `gpt-5.6-sol`  
**Effort:** `high`  
**Priority:** P0  
**Depends on:** Tasks 1 and 2  
**Atomicity rule:** Do not land Task 3 separately from Task 4

### Work: shared contract

- Add `TrackerPeriodBucket`, `TrackerPeriodState`, and
  `Tracker.periodState` to `features/goals/types.ts` using the contract above.
- Keep the legacy `Tracker.currentValue` field for compatibility, but do not
  reinterpret it as current-period value.
- Remove `currentValue` from `TrackerUpdates`.
- Do not edit generated `types/supabase.ts`; the table shape did not change.
- `mapTracker` initializes raw/list tracker objects with `periodState: null`.

### Work: pure derivation

- Add a pure derivation function that accepts tracker metadata, its bounded log
  rows, timezone, and one `asOf` instant.
- Sum log values per bucket and current period.
- Use the completion semantics defined above.
- Return seven buckets for configured cadence and `null` for null cadence.
- Do not use `trackers.current_value` in the derivation.

### Work: hydrated goal detail

- Update the selected-goal detail read to fetch profile timezone and use the
  frequency-batched, paginated read-path design above.
- Add a small reusable pagination helper with a stable ordering. A goal can have
  more than 1,000 bounded log rows; sums must remain correct.
- Issue at most three log-query batches in parallel, never one query per tracker.
- Change `useGoalDetail` loading behavior so a listed goal is not treated as
  already-hydrated detail. Opening detail must call the hydrated detail path.
- Do not hydrate every goal in the global list; keep the extra work scoped to the
  selected goal for speed.
- Surface derivation/log-read failures instead of displaying false incomplete
  states.

### Tests

- Add pure derivation tests for all 3 tracker types × 3 frequencies.
- Counter below target, exactly at target, and above target.
- Habit/checklist presence completion.
- Multiple logs in one period and logs exactly on both bounds.
- Mixed-frequency goal with distinct query windows.
- Pagination fixture with more than 1,000 logs and correct final sum.
- Null-frequency tracker returns `periodState: null`.
- One captured `asOf` is used across all trackers.

### Acceptance

- `npx tsc --noEmit` passes in this single atomic change.
- Selected goal detail always receives hydrated tracker period state.
- No N+1 tracker query and no unpaginated correctness ceiling.
- A monthly tracker does not force seven months of daily tracker logs to load.

---

## Task 5 — Authenticated logging/uncomplete and legacy-consumer fixes

**Model:** `gpt-5.6-sol`  
**Effort:** `high`  
**Priority:** P0  
**Depends on:** Tasks 1 and 3+4

### Work: server mutations

- Refactor the existing `completeTracker` path into a shared authenticated
  tracker-log mutation that retains:
  - successor/read-only rejection,
  - goal ownership validation,
  - tracker-to-goal validation,
  - server-resolved type/frequency/target/timezone.
- Stop updating `trackers.current_value`.
- Checklist completion inserts value `1`.
- Habit completion inserts normalized positive `targetValue` or `1`.
- Counter `+1` inserts value `1` through the same authenticated logging boundary.
- Reject logging for `frequency: null` with a clear 409/422-style client error.
- Make normal habit/checklist completion idempotent within the current period.
- Add authenticated uncomplete handling that deletes all current-period logs for
  habit/checklist trackers and rejects counter uncomplete.
- Ensure signatures include `trackerId`, `goalId`, `userId`, and injectable DB
  client where the existing service pattern requires them.
- Return the canonical updated period-state DTO from complete, counter-log, and
  uncomplete responses.

### Work: remove bypasses

- Change the counter `+1` path in `TrackerCard.tsx` so it no longer calls
  `updateTracker({ currentValue })`.
- Remove the manual current-progress input from tracker editing.
- Remove any `currentValue` patching from `goal-service.updateTracker`.

### Work: stale legacy consumers

- Update `cloneGoalWithMilestonesAndTrackers` prior-phase summaries to derive
  tracker achievements from logs rather than stale `current_value`. Paginate any
  raw log reads used for phase summaries.
- Update `ExtendGoalModal` so displayed tracker status/value does not read stale
  `currentValue` as current-period truth.
- Update `docs/API_CONTRACT.md` to describe log-derived completion, reversible
  habit/checklist state, response DTOs, and the new counter behavior.
- Confirm Momentum computation remains log-driven. Remove a now-unused
  `current_value` selection only if it is a tightly scoped cleanup with tests.

### Tests

- Ownership and successor/read-only rejection for every mutation.
- Checklist/habit double-complete does not create normal duplicate logs.
- Counter two taps create two value-1 logs and sum to 2.
- Uncomplete removes all current-period habit/checklist logs and flips completion.
- Uncomplete cannot delete a previous-period log.
- Null cadence is rejected.
- Mutation response contains authoritative updated period state.
- Prior-phase counter/checklist/habit summaries remain correct after
  `current_value` writes stop.

### Acceptance

- No goal tracker UI path writes `trackers.current_value`.
- All mutations are authenticated and reconcile from returned canonical state.
- Extension summaries and documentation no longer promise stale-scalar behavior.

---

## Task 6 — Goal-detail state, optimistic mutations, and boundary refresh

**Model:** `gpt-5.6-sol`  
**Effort:** `high`  
**Priority:** P0  
**Depends on:** Task 5

### Work

- Delete local `completedTrackerIds` state and its reset effect.
- Remove `completedTrackerIds` from `UseGoalDetailResult`, `GoalsWorkspace`, and
  `TrackersPanel` props.
- Add `onUncompleteTracker` and a counter-log handler with the same authenticated
  API boundary as Task 5.
- Add per-tracker in-flight mutation state to prevent complete/uncomplete/log
  races and repeated taps.
- Add a `patchTracker`/functional store action rather than replacing a whole
  tracker with a stale object snapshot. Preserve unrelated concurrent edits.
- Optimistically update the affected current bucket/value/completion when safe,
  then reconcile with the server-returned period state.
- Roll back only if the failed request is still the latest mutation for that
  tracker.
- After frequency or target edits, refetch/rederive authoritative state.
- Preserve Momentum refresh after meaningful successful mutations.

### Boundary invalidation

- Find the earliest configured `periodState.endExclusive` in the selected goal
  and schedule a detail refresh just after that instant.
- Clear/recreate the timer when the goal or hydrated state changes.
- Refresh on React Native app foreground/resume.
- On web, refresh on document visibility/focus where the existing platform
  abstractions allow it.
- Recompute the next timer after refresh. Do not rely solely on a timer because
  mobile/browser suspension can delay it.

### Tests

- Navigation/reload preserves DB-derived completion.
- Failed optimistic complete/uncomplete restores the prior state.
- Rapid double tap creates one logical habit/checklist completion.
- Complete followed immediately by uncomplete cannot apply responses out of
  order.
- Frequency and counter-target changes recompute state.
- Simulated period expiry and app resume refresh state.

### Acceptance

- No local completion set exists.
- State remains correct across navigation, reload, focus/resume, and cadence
  rollover.
- Store updates do not overwrite unrelated tracker fields.

---

## Task 7 — Ongoing/Completed grouping

**Model:** `gpt-5.6-terra`  
**Effort:** `low`  
**Priority:** P1  
**Depends on:** Task 6

### Work

- In `TrackersPanel.tsx`, partition configured trackers using
  `tracker.periodState?.isCompleted ?? false`.
- Null-cadence trackers remain Ongoing and show the existing cadence-not-set
  affordance.
- Render Ongoing and Completed sections only when non-empty.
- Preserve `sortOrder` within each section and use memoized derivation so typing
  or unrelated renders do not repeatedly copy/sort larger lists.
- Match existing section-header typography and spacing.
- Add accessible section labels.
- Keep per-tracker pending state visible while a card moves between groups.

### Acceptance

- Checklist/habit move to Completed after one current-period log.
- Counter remains Ongoing below target and moves at/above target.
- Empty section headers are not rendered.
- Ordering remains stable.

---

## Task 8 — Tracker card and habit-history rewrite

**Model:** `gpt-5.6-sol`  
**Effort:** `medium`  
**Priority:** P1  
**Depends on:** Tasks 5–7

### Work

- Drive counter display/progress from `periodState.currentValue`.
- Drive checklist checked/label/strike-through state from
  `periodState.isCompleted`.
- Replace habit `dotCount`/`filledDots` math with exactly seven
  `periodState.recentPeriods` buckets.
- Render buckets oldest to newest, with the current period last.
- Preserve existing dot size and color tokens.
- Add accessible labels that describe the bucket date/week/month and whether it
  has a log.
- Add an explicit accessible toggle/control for habit/checklist complete and
  uncomplete. Do not make the whole editable/deletable card an undo target.
- Use `accessibilityRole="checkbox"` and checked state where supported.
- Keep editing, delete, and logging controls from triggering each other.
- Remove obsolete local display state that can drift from canonical period state.

### Acceptance

- Daily habit logged today fills exactly today's bucket.
- Weekly habit logged this week fills the current week bucket after one log.
- Monthly behavior matches the same rule.
- At the next user-local period boundary, refresh shifts the window and resets
  current completion without navigation.
- Counter and checklist rendering regressions are covered by tests.

---

## Task 9 — Dashboard daily-state alignment

**Model:** `gpt-5.6-terra`  
**Effort:** `medium`  
**Priority:** P1  
**Depends on:** Tasks 1 and 5

### Work

- Update `app/api/trackers/due-today+api.ts` to read the authenticated user's
  profile timezone and compute one current daily half-open bound.
- Query only daily trackers and logs inside that daily window. Paginate the log
  result; do not fetch and sort all tracker history.
- Return `currentPeriodValue`, `isCompletedThisPeriod`, and
  `periodEndExclusive` rather than stale `currentValue`/`lastCompletedAt`.
- Apply the same completion semantics: counters require target, habit/checklist
  require presence.
- Update `app/(app)/dashboard.tsx` to consume the returned boolean rather than
  comparing dates in the browser's timezone.
- Reconcile dashboard completion from the canonical mutation response.
- Refresh the zone at `periodEndExclusive` and on focus/resume, consistent with
  goal detail.

### Acceptance

- A browser/device timezone differing from `profiles.timezone` still shows the
  correct daily state.
- Counter `+1` below target does not mark the dashboard item complete.
- The API never fetches all historical tracker logs.
- Dashboard behavior refreshes at user-local midnight.

---

## Task 10 — Automated and manual verification

**Model:** `gpt-5.6-sol`  
**Effort:** `high`  
**Priority:** P0 release gate  
**Depends on:** All previous tasks

### Automated verification

- Add a `test:tracker-metrics` package script covering cadence, derivation, and
  tracker-state tests.
- Run:
  - `npx tsc --noEmit`
  - `npm run test:tracker-metrics`
  - `npm run test:momentum`
  - existing goal tests affected by the shared `Tracker` contract
- Verify a >1,000-log fixture produces the full sum/history.
- Verify exact-boundary, DST, null-frequency, duplicate-tap, mutation-order,
  frequency-edit, target-edit, and app-resume cases.
- Review every remaining `current_value`/`currentValue` reference and confirm it
  is legacy-safe, a database insert default, or intentionally outside period UI.

### Manual matrix

Exercise counter, habit, and checklist trackers for daily, weekly, and monthly
cadence. For each:

- Create and edit metadata.
- Log progress.
- Confirm Ongoing/Completed grouping matches the settled semantics.
- Reload and navigate away/back.
- Foreground the app after simulated expiry.
- For habit/checklist, uncomplete and confirm all current-period evidence clears.
- Backdate a prior-period log via SQL and verify it does not complete the current
  period.

Additional cases:

- Counter below, exactly at, and above target.
- Daily/weekly habit seven-bucket positioning.
- Device timezone different from profile timezone.
- DST spring-forward and fall-back boundaries.
- Frequency null, then assign cadence and log successfully.
- Expired goal/goal-with-successor remains read-only.
- Goal extension stores accurate prior-phase summaries.

### Dead-code finding

`features/goals/components/GoalsWorkspace.tsx` currently defines a separate
`TrackerList` with no call site. Confirm this remains true with `rg`. It may be
removed as a tightly scoped cleanup in Task 8, including unused imports, but do
not spend implementation effort converting dead UI to the new state contract.

### Release acceptance

- All automated and manual checks pass.
- Database index is confirmed live.
- No tracker period UI reads `trackers.current_value`.
- No direct progress editor bypasses logs.
- No raw-log read can silently truncate at the API row limit.
- Tracker state resets at the user's cadence boundary without requiring manual
  navigation.
- `CHANGELOGCODEX.md` contains explicit entries for every code-changing task.

## Deferred follow-ups

These are deliberately not part of this implementation:

- SQL/RPC aggregation of tracker period buckets. Reconsider only after measuring
  log volume and client/service query latency.
- A unique persistent period key or cross-device transactional idempotency key.
- Counter decrement/undo history UI.
- Dropping `trackers.current_value` after every legacy consumer is retired and a
  separate schema decision is approved.
- Analytics or product telemetry for tracker actions.
