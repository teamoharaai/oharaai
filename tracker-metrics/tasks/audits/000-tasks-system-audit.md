# Audit 000 — Tasks system vs. tracker-metrics salvage

- **Date:** 2026-09-15
- **Branch audited:** `feat/port-tracker-optimism-boundary` (off canonical `origin/main`)
- **Salvage source:** `feat/tracker-metrics-archive` (Tasks 3–10, incl. Task 10)
- **Method:** read of migrations 047–051, `features/tasks/*`, live-DB grant/state
  checks (mgmt API), and diff against the archived tracker-metrics work.

## 1. Where things stand (facts)

- **Live DB is cut over.** `schema_migrations` tops at **051**. Legacy
  `trackers`/`tracker_logs` still exist and are **readable**, but `authenticated`
  has **no INSERT/UPDATE/DELETE** on them (freeze executed). New `tasks`,
  `task_schedules`, `task_occurrences`, `task_mutation_receipts` are live and
  writable. → **Any Metrics write path is dead in prod; Tasks is canonical.**
- **Tasks data model** (048):
  - `tasks`: `completion_mode ∈ {binary, quantity}`, `target_quantity`,
    `quantity_unit`, `status ∈ {active,complete,archived}`, plus `legacy_*`
    columns backfilled from trackers (source `legacy_tracker`).
  - `task_schedules`: **versioned**, `recurrence_kind ∈ {daily, weekly}` only
    (**no monthly**), `interval_count`, `weekdays[]`, `timezone`, `is_active`.
  - `task_occurrences`: **materialized** scheduled slots — `occurrence_key`
    (unique per task), `status ∈ {pending,completed,skipped,missed,cancelled}`,
    `actual_quantity`, `scheduled_local_date`, `completed_at`. This is the analog
    of a `tracker_log`, but **status-bearing and pre-generated**, not append-only.
  - Server RPCs own all writes: `create_task_v1`, `update_task_v1`,
    `archive_task_v1`, `replace_task_schedule_v1`, `reconcile_task_occurrences_v1`,
    `set_task_occurrence_status_v1`, `set/adjust_task_occurrence_quantity_v1`,
    `log_completed_task_v1`.
- **Client already built by the teammate:** `features/tasks/` — `types.ts`,
  `services/task-service.ts`, `hooks/useGoalTasks.ts`, `components/TasksPanel.tsx`,
  `utils.ts` (`buildTaskSections`, `activeTaskSchedule`, `dateInTimeZone`),
  `validation.ts`, tests (`utils.test.ts`, `architecture.test.ts`).

## 2. Metrics → Tasks concept mapping

| Metrics (Tasks 3–10) | Tasks (canonical) | Note |
|---|---|---|
| Tracker (`type: counter`) | Task `completion_mode: quantity` (+ `target_quantity`, `quantity_unit`) | **This is the renamed "counter" the user described.** ±1 via `adjust_task_occurrence_quantity_v1`. |
| Tracker (`type: habit`/`checklist`) | Task `completion_mode: binary` | complete/uncomplete an occurrence. |
| `frequency: daily/weekly/monthly` | `task_schedules.recurrence_kind: daily/weekly` | **Monthly dropped** (prod had 0 monthly trackers — likely intentional; confirm). |
| `tracker_logs` (append-only) | `task_occurrences` (materialized, status-bearing) | Fundamental model shift: server pre-generates slots. |
| `periodState` derived on read | occurrence rows queried directly | Read-time bucketing largely unnecessary. |
| `current_value` scalar | `legacy_current_value` (read-only import) + `actual_quantity` | |

## 3. The three user-reported issues — root causes

### (A) Upcoming "spam" — one row per future occurrence  ⟶ **UI/sectioning bug**
`reconcile_task_occurrences_v1` materializes occurrences from `start_date`
through `least(coalesce(p_through_date, today+28), today+180)` — a **28-day
default horizon**. For a daily task that is ~27 future `pending` rows.
`buildTaskSections` (`features/tasks/utils.ts`) pushes **every** occurrence with
`scheduledLocalDate > today` into `upcoming`, and `TasksPanel` renders
`sections.upcoming.slice(0, full ? 30 : 4)` as **one `TaskRow` per occurrence**
(keyed by `occurrence.id`). → the same task appears ~28 times.
**Fix direction:** collapse Upcoming to **one row per task** (next occurrence +
a schedule summary like "Daily · next Tue"), not one per materialized day. Pure,
low-risk, testable change in `utils.ts` + `TasksPanel`. (Our Metrics
Ongoing/Completed grouping thinking — one card per unit, not per log — applies.)

### (B) 7-dot activity history gone  ⟶ **feature not ported**
Metrics' `features/goals/tracker-display.ts` (`habitBucketViews`,
`bucketPeriodLabel`) rendered exactly seven recent-period dots. `TasksPanel`'s
`TaskRow` shows only the current occurrence's status/quantity — **no history
row**. The archived logic is the salvage source but needs re-pointing:
Metrics dots = 7 cadence periods of ONE tracker; the **user's new intent** = 7
**days**, and eventually **cross-feature** (a dot per day if there was any
engagement — task occurrence completed, milestone hit, or reflection logged).
So this is a re-conception, not a straight port. See PLAN phase for the data
model (start from `task_occurrences` for the goal; later union milestone +
reflection activity per local day).

### (C) Counter → quantity rename, strictly ±quantity  ⟶ **works; parity gap is (B)**
Confirmed intended: Metrics counter is now a `quantity` Task with ±1 controls
against `target_quantity`. Functionally fine. The felt regression is the missing
history visual (B), not the counter mechanics.

## 4. Salvage verdict for sessions 3–10  (what can be pushed / modified / dropped)

| Piece (archive branch) | Verdict | Detail |
|---|---|---|
| Optimistic mutations (registry, rollback, ordering) | ✅ **PORTED & PUSHED** | `features/tasks/task-optimism.ts` on `feat/port-tracker-optimism-boundary`. Ready for PR/merge review. |
| Cadence-boundary refresh | ✅ **PORTED & PUSHED** | `features/tasks/task-boundary.ts` + `useTaskBoundaryRefresh.ts`. Local-midnight per tz + foreground. |
| 7-dot history display (`tracker-display.ts`) | 🔧 **PORT w/ modification** | Re-point onto `task_occurrences`; re-conceive as day-activity (goal #2). Highest user-value item. |
| Ongoing/Completed grouping (`tracker-grouping.ts`) | 🔧 **CONCEPT reuse** | Superseded by `buildTaskSections`, but informs the Upcoming-collapse fix (A). |
| Pagination helper (`lib/db/paginate.ts`) | ➕ **KEEP (low priority)** | Generic; useful if occurrence reads exceed the row ceiling. |
| tz `zoned-calendar`, `tracker-cadence` | ♻️ **ALREADY SHARED** | Landed pre-fork; on origin. Reused by the boundary port. |
| `deriveTrackerPeriodState` (`tracker-period.ts`) | ❌ **DISCARD** | Server materializes occurrences; no read-time bucketing needed. |
| `tracker-mutations.ts` + `/api/trackers/log` | ❌ **DISCARD** | Writes frozen `tracker_logs`; replaced by task RPCs + `/api/tasks/*`. |
| `due-today` tz rewrite | ❌ **DISCARD** | Replaced by `/api/tasks/today` + `fetchTodayTaskItems`. |
| `phase-summary.ts` (from logs) | ❌ **DISCARD** | Replaced by legacy backfill (049) + task model. |
| `TrackerCard` / `TrackersPanel` | ❌ **DISCARD** | Replaced by `TasksPanel`. |
| Task 10 `test:tracker-metrics` + docs | 📎 **ARCHIVE-only** | Behavioral spec value; keep on the archive branch. |

**Net:** most of sessions 3–10's *product* code is superseded (it targeted the
now-frozen tables), but the **UX layer** — optimism (done), boundary-refresh
(done), and the **history-dot visual** (to port) — is the salvage the user wants,
plus the Upcoming-collapse fix. That is a small, high-value surface, not a rewrite.

## 5. Open questions (resolve before building)

1. **Activity-dot data model:** occurrences-only first, or design the
   cross-feature union (occurrences + milestones + reflections per local day) up
   front? What counts as "active" per day, and in whose timezone?
2. **Monthly cadence:** accept the daily/weekly-only schedule model, or is
   monthly needed? (Prod had 0 monthly trackers.)
3. **Ownership/coordination:** `features/tasks/` is the teammate's active slice
   (CLAUDE.md L2/L3). Confirm the collaboration model before landing changes into
   it (PR + their review, vs. a shared design first).
4. **Where the activity visual lives:** inside `TaskRow`, at the goal/`TasksPanel`
   header, or a goal-detail "activity" strip that spans features?
