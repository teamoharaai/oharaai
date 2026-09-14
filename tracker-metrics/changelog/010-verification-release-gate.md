# Session 010 — Automated + manual verification / release gate (Task 10)

- **Date:** 2026-09-13
- **Task(s):** 10 (final — P0 release gate)
- **Agent/model:** Opus 4.8, high effort
- **tsc baseline (before):** clean (exit 0)

## Goal of this session

Close the tracker-metrics initiative: add a `test:tracker-metrics` package
script, run the full automated matrix, audit every remaining
`current_value`/`currentValue` reference for legacy-safety, confirm the prior
deletion findings still hold, map the manual matrix to its automated coverage,
and make the final ship/no-ship call. No product-behavior changes intended
(release gate only).

## Changes

- **`package.json`** — added `test:tracker-metrics` script (mirrors the
  `test:momentum` / `test:constellation` style; `node --experimental-strip-types
  --test`). Runs the full suite:
  `lib/goals/tracker-cadence.test.ts`, `lib/goals/tracker-period.test.ts`,
  `lib/goals/due-today.test.ts`, `lib/db/paginate.test.ts`,
  `lib/db/tracker-mutations.test.ts`, and
  `features/goals/tracker-optimism.test.ts`, `tracker-display.test.ts`,
  `tracker-grouping.test.ts`, `tracker-card-display.test.ts`,
  `tracker-boundary.test.ts`, `tracker-detail-state.test.ts`,
  `dashboard-due-today.test.ts`. File list verified against `rg`/`ls`, not
  hardcoded from memory.
- No product source changed. The audit surfaced one dead store action
  (`updateTrackerValue`) and one accepted legacy read (`HomeGoalPreview`); both
  are documented below and left in place (see D-012) — neither is a bug, so per
  Task 10 ground rules no behavior was altered.

## Tests

- Added/updated: none (coverage from Tasks 0–9 is sufficient; this task wires
  the runner and runs the matrix).
- Commands run + result:
  - `npx tsc --noEmit` → **pass** (exit 0), before and after.
  - `npm run test:tracker-metrics` → **116 passed / 0 failed**.
  - `npm run test:momentum` → **64 passed / 0 failed** (shared cadence/tz
    primitives + `current_value` strip-before-compute unaffected).
  - `node --test features/goals/*.test.ts` (all goals suites incl. non-tracker
    `navigation`, `goals-workspace`, `active-goal-selectors`,
    `dashboard-goal-activity`) → **64 passed / 0 failed**.
  - `npm run test:ios-contract` (shared migration/Tracker contract) → **4 passed
    / 0 failed**.
- **>1,000-log fixture confirmed** proves full sum/history (no API row-ceiling
  truncation):
  - `lib/db/paginate.test.ts:47` — 1,500 logs paginate; `rows.length === 1500`,
    derived `currentValue === 1500`.
  - `lib/db/tracker-mutations.test.ts:335` — 1,500 logs × value 2 → prior-phase
    `achieved === 3000`.

## `current_value` / `currentValue` reference audit

Classification key: **(a)** legacy-safe read outside period UI · **(b)** DB
insert default (column is `numeric NOT NULL DEFAULT 0`, stays for back-compat) ·
**(c)** `periodState`-derived value, NOT the legacy scalar · **(d)** comment ·
**(e)** generated schema type · **(momentum)** Momentum's own DTO, out of scope
(strips `current_value` before compute — MEMORY/audit 001 confirmed legacy-safe).

| Location | Reference | Class | Verdict |
|---|---|---|---|
| `types/supabase.ts` 1070/1078/1086/1373/1387/1401 | `current_value` on generated `trackers` (+ archive) row types | (e) | Keep — column exists in DB; generated file. |
| `app/(app)/dashboard.tsx` 369/370/450 | `summary.currentValue` | (momentum) | Keep — Momentum summary DTO, not a tracker. |
| **`app/(app)/dashboard.tsx` 612** | `tracker.currentValue < tracker.targetValue` (`HomeGoalPreview.nextTracker`) | **(a)** | **Keep w/ justification (D-012).** Label-picker on the un-hydrated goal-LIST path where `periodState` is never populated; selects which tracker *title* to show, renders no period state. Switching would require hydrating the whole dashboard list (out of scope). |
| `lib/db/tracker-inserts.ts` 24 | `current_value: 0` on insert | (b) | Keep — explicit default, matches column default. |
| `lib/db/goals.ts` 618 | `current_value: 0` on clone insert | (b) | Keep — same. |
| `lib/db/goals.ts` 515 | comment | (d) | n/a |
| **`features/goals/store.ts` 53–61** | `updateTrackerValue` action sets `tracker.currentValue` | **(a) DEAD** | **Keep for now (D-012).** `rg` confirms zero callers (interface + impl only). Never runs, so legacy-safe; noted as optional post-initiative cleanup rather than a Task 10 behavior change. |
| `features/goals/services/goal-service.ts` 56 | `DbTrackerRow.current_value` type | (e) | Keep. |
| `features/goals/services/goal-service.ts` 212 | `currentValue: toNumber(row.current_value, 0)` | (a) | Keep — hydrates the legacy `Tracker.currentValue` field consumed only by the accepted dashboard:612 read. |
| `features/goals/services/goal-service.ts` 387 | `current_value` in `GOAL_SELECT` column list | (a) | Keep — feeds the above; harmless select. |
| `features/goals/services/goal-service.ts` 667 | `currentValue: dto.currentValue` in `periodStateFromDto` | (c) | Keep — maps the DERIVED DTO value into `TrackerPeriodState`. |
| `features/goals/services/goal-service.ts` 745 | comment | (d) | n/a |
| `features/goals/types.ts` 72 | `Tracker.currentValue: number` field | (a) | Keep — field still populated for back-compat; display no longer reads it. Removing it depends on dropping the DB column (deferred). |
| `features/goals/types.ts` 155 | comment | (d) | n/a |
| `features/goals/hooks/useGoalDetail.ts` 228 | `currentValue: saved.currentValue` in metadata-save patch | (a) | Keep — pass-through so the store Tracker stays fully populated; display reads `periodState`, not this. |
| `features/goals/tracker-optimism.ts` 58/71/86 | `next.currentValue = …` | (c) | Keep — sets `TrackerPeriodState.currentValue` (derived), not the scalar. |
| `features/goals/tracker-display.ts` 40/48/50 | `periodState?.currentValue`; `counterProgressPercent` param | (c) | Keep — derived. |
| `features/goals/components/TrackerCard.tsx` 65/171/190/341/415 | local `currentValue = currentPeriodValue(tracker.periodState)` | (c) | Keep — derived; card no longer reads the scalar. |
| `features/goals/components/ExtendGoalModal.tsx` 65 | `periodState?.currentValue ?? 0` | (c) | Keep — derived. |
| `lib/db/tracker-mutations.ts` 134/162 | DTO `currentValue`; `currentValue: state.currentValue` | (c) | Keep — derived DTO. |
| `lib/goals/tracker-period.ts` 39/96/99/107 | derivation logic | (c) | Keep — derived. |
| `features/momentum/services/momentum-service.ts` 255/965/980/1000 | `current_value` selected then stripped; goal-diagnostic `currentValue` | (momentum) | Keep — do not touch (MEMORY). |
| comments-only: `tracker-mutations.ts` 6/105, `phase-summary.ts` 5, `tracker-period.ts` 4/44, `due-today.ts` 8, `TrackerCard.tsx` 61/135, `tracker-display.ts` 4, `ExtendGoalModal.tsx` 57, `docs/*` | doc/comment | (d) | n/a |

**Conclusion:** No tracker **period UI** reads `trackers.current_value`. The only
non-derived reads left are (a) the accepted `HomeGoalPreview` label picker on the
un-hydrated list path, and its hydration plumbing (`goal-service` →
`Tracker.currentValue`), plus the dead `updateTrackerValue` action. All writes
are (b) `NOT NULL DEFAULT 0` insert defaults. Everything else is `periodState`-
derived, generated types, or comments.

## Dead-code / deletion findings (re-confirmed this session)

- `app/api/goals/complete-tracker+api.ts` — **absent** (`ls` → No such file).
- `completeTracker` wrapper in `lib/db/goals.ts` — **gone** (`rg` → none; the
  remaining `complete-tracker` hits are `onUncompleteTracker`, unrelated).
- `TrackerList` in `GoalsWorkspace.tsx` — **gone** (`rg` → none).
- Shared `logTrackerMutation` + `createTrackerMutationDb` — retained, as intended.
- New: `updateTrackerValue` store action is **dead** (no callers) — see audit.

## Manual matrix — automated coverage map

Every settled *semantic* is covered by the automated suite; the "live" column is
the UI/plumbing/DB-side-channel that a unit test cannot exercise.

| Manual case | Automated coverage | Live/manual still needed |
|---|---|---|
| counter/habit/checklist × daily/weekly/monthly completion | `tracker-period.test.ts` (per-type × per-cadence), `tracker-mutations.test.ts` | UI create/edit-metadata taps |
| Log progress | `tracker-mutations.test.ts` (insert + derive) | actual tap |
| Ongoing/Completed grouping | `tracker-grouping.test.ts` (`partitionTrackersByCompletion`) | visual placement |
| Reload / navigate away+back | hydration path (`goal-service`), detail-state tests | real navigation |
| Foreground after simulated expiry | `tracker-boundary.test.ts` (timer + boundary epoch) | real `AppState`/visibility |
| habit/checklist uncomplete clears all current-period evidence | `tracker-mutations.test.ts` (uncomplete-deletes-all) + `tracker-optimism` (`applyOptimisticUncomplete`) | tap-through |
| Backdate prior-period log (SQL) → current stays incomplete | `tracker-period.test.ts` ("a previous-period log fills its own bucket, not the current one") | live SQL against DB |
| Counter below / at / above target | `tracker-period.test.ts` ("below, exactly at, and above a positive target"); `paginate.test.ts` at/above via 1500-log | — (fully covered) |
| Daily/weekly seven-bucket positioning | `tracker-period.test.ts` ("exactly seven contiguous buckets, current last"); `tracker-display.test.ts` (`habitBucketViews`) | visual |
| Device tz ≠ profile tz | `due-today.test.ts` (Tokyo cross-UTC-day), `tracker-period.test.ts` tz cases; Task 9 derives in `profiles.timezone` server-side | real device w/ divergent tz |
| DST spring-forward + fall-back | `tracker-cadence.test.ts` (DST determinism, **D-005 caveat**: asserts actual instants, not idealized 23/25h) | real wall-clock DST |
| null cadence → assign → log | `tracker-mutations.test.ts` (null-cadence `422`); rederive path in `tracker-detail-state`/`optimism` | full create→assign→log flow |
| expired/successor goal read-only | `tracker-mutations.test.ts` (successor rejection → 409) | UI read-only affordance |
| goal extension → accurate prior-phase summaries | `tracker-mutations.test.ts` (`buildPriorPhaseSummary`, incl. >1000 logs) | end-to-end extend modal |

**Drivability of the live column:** the browser/`/run`-drivable subset (create,
edit, log, grouping, reload, uncomplete, counter thresholds, bucket layout, extend
modal) requires a running Expo web server **plus an authenticated Supabase session
against a live DB with tracker seed data** — not available headless in this
background job without credentials/a test account. The remaining cases are not
app-drivable at all and need the user or a controlled environment: **SQL backdate**
(direct DB write), **device tz ≠ profile tz** (a second device/browser tz), and
**real DST wall-clock** (clock change). Recommendation: the automated matrix
already proves every settled semantic; the live column is UI-wiring confirmation.
See the ship call below.

## Decisions made

- **D-012** (new) — accept the `HomeGoalPreview` legacy read + defer the dead
  `updateTrackerValue` cleanup; both legacy-safe, neither a bug, no Task 10
  behavior change. See `DECISIONS.md`.

## Follow-ups / handoff

- Initiative complete pending the ship call. Optional post-initiative cleanups
  (not blockers): remove the dead `updateTrackerValue` store action; once
  `trackers.current_value` is dropped (separate approved schema change), remove
  `Tracker.currentValue` + its hydration and switch `HomeGoalPreview` to a
  hydrated/derived selection.
- No commit made this session (per instruction — awaiting go-ahead; target
  branch: `main`).
