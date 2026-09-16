# Session 002 — Upcoming collapse (T2)

- **Date:** 2026-09-16
- **Task(s):** T2 (design/001 Part A, TD-002)
- **Agent/model:** Opus 4.8
- **tsc baseline (before):** clean

## Goal of this session

Close the "Upcoming spam" regression: a daily task materialized across the
28-day horizon rendered ~27 identical Upcoming rows. Collapse Upcoming to one
row per task (its earliest future actionable occurrence) with a schedule + next
date summary. Pure/UI-only — no schema/RPC/horizon change.

## Changes

- **`features/tasks/utils.ts`** —
  - `buildTaskSections` now de-dupes `sections.upcoming` to one entry per
    `task.id` after the existing `occurrenceSortValue` sort, keeping the first
    (= earliest future) occurrence. Cross-task ordering by next date is preserved.
    `today` / `anytime` / `completed` semantics unchanged; section item shape
    `{ task, occurrence }` unchanged (so `fetchTodayTaskItems` is unaffected).
  - Added pure `shortDate(localDate)` helper — parses a `YYYY-MM-DD` local
    calendar string by hand (no `Date`/UTC drift) → e.g. `"Sep 12"`.
- **`features/tasks/components/TasksPanel.tsx`** —
  - `TaskRow` gains an optional `showNextDate` prop; when set, the secondary line
    becomes `` `${scheduleLabel(task)} · next ${shortDate(...)}` `` (milestone
    suffix preserved).
  - The Upcoming section descriptor sets `showNextDate: true` (Today/Anytime
    `false`); the flag is threaded into each `TaskRow`. The
    `slice(0, full ? 30 : 4)` cap stays — now caps tasks, not occurrences.

## Tests

- Added/updated: `features/tasks/utils.test.ts` — 6 new cases:
  - daily task, 28 future occurrences → `upcoming.length === 1` (earliest kept)
  - two tasks → `upcoming.length === 2`, ordered by earliest next date
  - task with a Today occurrence + future → Today keeps it, Upcoming collapses to 1
  - weekly task (Mon/Wed/Fri) → one Upcoming row = earliest future weekday
  - only-completed task → `upcoming.length === 0`
  - `shortDate` renders local date without tz drift (+ null → `''`)
- Commands run + result:
  - `npx tsc --noEmit` → pass
  - `npm run test:tasks` → 38 passed / 0 failed

## Decisions made

- None new. Implementation matches `design/001` Part A / TD-002 exactly. The
  `showNextDate` prop (vs. a section-label string check) is a minor render-local
  choice, not a design deviation.

## Follow-ups / handoff

- Next action: **T3 — L1 goal-activity, occurrences-only** (`design/001` Part B,
  TD-006): pure `lib/activity/goal-activity.ts` + `lib/db/goal-activity.ts`
  reader (`task_occurrences` status `completed`, bucketed by `profiles.timezone`
  via `lib/time/zoned-calendar.ts`), extend `types/activity.ts` `ActivityKind`
  with `task_completed`, render the 7-day weekday emblem row on the goal
  Analytics surface with `IntelligencePanel` beneath `AnalyticsPanel`.
- Landing path (TD-005): T2 sits on `feat/port-tracker-optimism-boundary`
  (the teammate's `features/tasks/` slice). Open a reviewed PR; do NOT push to
  main. Confirm teammate sign-off before merge.
