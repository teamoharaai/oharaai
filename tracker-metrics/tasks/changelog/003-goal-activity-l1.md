# Session 003 — Goal-activity L1, occurrences-only + 7-day row (T3)

- **Date:** 2026-09-16
- **Task(s):** T3 (design/001 Part B, TD-006; render placement TD-010)
- **Agent/model:** Opus 4.8
- **tsc baseline (before):** clean

## Goal of this session

Ship the L1 goal-activity signal: a pure, source-agnostic, timezone-agnostic
day-bucketing function + a `lib/db` reader (Phase B: task_occurrences completed
only) + the 7-day weekday emblem row on the live goal-analytics surface. Establish
the stable output shape the weekly-recap pipeline (TD-007) and Phase C union (T4)
build on — no contract change between phases.

## Changes

- **`lib/activity/goal-activity.ts`** (new, pure) — `buildActivityWindow(events,
  { asOfLocalDate, days })` → exactly `days` contiguous `ActivityDayBucket[]`,
  oldest→newest with today last; `kinds` distinct in `GOAL_ACTIVITY_KIND_ORDER`;
  empty days `kinds:[], count:0`; events outside `[asOf-(days-1), asOf]` excluded.
  No `Date.now()`/`Intl` (relative import of `addLocalDays` — D-004). Types
  `GoalActivityKind` / `GoalActivityEvent` / `ActivityDayBucket` /
  `ActivityWindowOptions`.
- **`lib/db/goal-activity.ts`** (new, reader) — `fetchGoalActivityEvents(db,
  userId, goalId, { sinceLocalDate, profileTimezone, sources })` +
  `fetchProfileTimezone(db, userId)`. Phase B source `task_completed`: goal-scoped
  `tasks` → their `task_occurrences` where `status='completed'`, local day =
  `localDateForInstant(completed_at, tz)` (actual engagement day). Uses an untyped
  `SupabaseClient` + `.from('task_occurrences')` because the Tasks tables are not
  in the generated `types/supabase.ts` (same pattern as `lib/db/tasks.ts`). Never
  reads trackers / tracker_logs. Phase C sources attach behind the same signature.
- **`types/activity.ts`** (extend-only) — added `task_completed` to `ActivityKind`
  + `TaskCompletedActivity` variant + union member.
- **`features/goals/components/GoalActivityRow.tsx`** (new, pure render) — consumes
  `ActivityDayBucket[]` as props (no DB — features/CLAUDE.md rule 3). 7 MTWTFSS
  cells, filled accent dot when `count>0`, hollow otherwise, today emphasized;
  accessibility label `<weekday>, <date>[, today]: <kinds|no activity>`.
- **`app/api/goals/activity-window+api.ts`** (new route) — mirrors
  `activity+api.ts`; resolves tz, computes `asOfLocalDate`/`sinceLocalDate`, reads
  events (sources `['task_completed']`), returns `{ buckets }`. `days` clamped
  [1,120].
- **`features/goals/hooks/useGoalActivityWindow.ts`** (new hook) — mirrors
  `useActivity`; returns `{ buckets, loading, error }`.
- **`features/goals/components/GoalsWorkspace.tsx`** — mounted `GoalActivityRow`
  under a "LAST 7 DAYS" heading inside `GoalAnalyticsCard` (TD-010); added a
  `task_completed` case to the exhaustive `activityPresentation` switch (required
  by the `ActivityKind` extension).

## Tests

- Added: `lib/activity/goal-activity.test.ts` — 9 node cases (contiguity/ordering/
  isoWeekday, single-day fill, distinct+same-kind counts, empty input, window
  exclusion, isToday-last, longer heatmap window, days<1). Registered in the
  `test:tasks` script.
- Commands run + result:
  - `npx tsc --noEmit` → pass
  - `npm run test:tasks` → 47 passed / 0 failed
- Not exercised: live visual render (Expo RN Web boot not run this session). The
  pure fn is node-tested; the reader's columns (`profiles.timezone`,
  `task_occurrences.status/completed_at/task_id`, `tasks.user_id/goal_id`) were
  verified against the generated types + existing readers; the route/hook mirror
  the proven `useActivity` path.

## Decisions made

- **TD-010** — L1 emblem row lands in `GoalAnalyticsCard`; the design's
  `AnalyticsPanel`/`IntelligencePanel` anchors are unmounted, so the
  "IntelligencePanel beneath AnalyticsPanel" instruction is moot/deferred.

## Follow-ups / handoff

- Next action: **T4 — L1 cross-feature union + heatmap.** Extend the reader with
  `entry_created` (goal-linked Entries via `echo_entry_links`) +
  `milestone_completed` (`milestones.completed_at`), generalizing
  `features/goals/dashboard-goal-activity.ts` into `lib/`. Multi-emblem row +
  GitHub-style heatmap (same L1 output, longer `days`). `GoalActivityRow` already
  renders `kinds` per day — extend it to a multi-emblem set.
- Landing path (TD-005): T2+T3 on `feat/port-tracker-optimism-boundary`; open a
  reviewed PR (now spans CTO-owned `lib/db` + `app/api` and VP-owned
  `features/goals`). Confirm teammate sign-off before merge. Flag TD-010's
  placement to the reviewer.
- If reads ever exceed the API row ceiling, T5 (`paginate.ts`) applies to the
  occurrence read.
