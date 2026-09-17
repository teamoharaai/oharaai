# Session 004 — Goal-activity L1 cross-feature union + heatmap (T4)

- **Date:** 2026-09-16
- **Task(s):** T4 (design/001 Part B, TD-006 Phase C; new TD-013/TD-014)
- **Agent/model:** Opus 4.8
- **tsc baseline (before):** clean · **test:tasks baseline:** 47/47

## Goal of this session

Extend the L1 goal-activity signal from occurrences-only (Phase B) to the full
cross-feature UNION (Phase C: `task_completed` + `entry_created` +
`milestone_completed`) and add a GitHub-style heatmap render. The L1 output
shape (`ActivityDayBucket` / `GoalActivityEvent`) is FROZEN — Phase C adds reader
sources, not a new contract. `buildActivityWindow` was already union-capable
(emits `kinds[]` + `count` for all three kinds) and is UNCHANGED.

## Changes

### Reader / pure (lib/)

- **`lib/activity/goal-activity-sources.ts`** (new, pure, node-tested) — the
  cross-feature union generalized into `lib/`. Three source-agnostic row→event
  normalizers — `taskOccurrenceRowsToEvents`, `entryLinkRowsToEvents`,
  `milestoneRowsToEvents` — each resolving raw rows → `GoalActivityEvent[]` via
  `localDateForInstant`+`normalizeTimezone` (relative imports — D-004),
  since-filtering on the LOCAL date and skipping null timestamps / empty embeds.
  This is where "generalize `features/goals/dashboard-goal-activity.ts` into
  `lib/`" lands: the reader (in `lib/db`) composes these and never imports from
  `features/*` (features/CLAUDE.md rule 2). `dashboard-goal-activity.ts` is left
  intact because it answers a DIFFERENT question — "latest activity" off
  `updated_at` — whereas engagement days key off `created_at`/`completed_at`
  (TD-014).
- **`lib/db/goal-activity.ts`** — added `fetchEntryCreatedEvents` (goal-linked
  Entries: `echo_entry_links` `container_type='goal'` + `confirmed=true` →
  `echo_entries.created_at`, via `!inner`, mirroring
  `fetchLatestReflectionTimestamps`/Constellation Entry-count scoping) and
  `fetchMilestoneCompletedEvents` (`milestones.completed_at`, goal + owner
  scoped, NULL = pending → skipped). Each queries then delegates to the pure
  mapper. `fetchGoalActivityEvents` now dispatches all three sources behind the
  UNCHANGED signature. `echo_entries`/`echo_entry_links`/`milestones` are in the
  generated types; the Tasks tables stay untyped `SupabaseClient` (as before).
- **`lib/activity/activity-heatmap.ts`** (new, pure, node-tested) —
  `groupBucketsIntoWeeks(buckets)` reshapes the contiguous oldest→newest window
  into Monday-aligned `(ActivityDayBucket|null)[][]` week columns via
  `startOfIsoWeekYmd` (leading/trailing `null` pad; buckets never reordered) and
  returns `maxCount`; `heatmapIntensityLevel(count, maxCount)` derives a discrete
  0..4 intensity. Does NOT change `ActivityDayBucket`.
- **`app/api/goals/activity-window+api.ts`** — widened the source set from
  `PHASE_B_SOURCES` to `UNION_SOURCES` (all three). `days` clamp [1,120]
  unchanged; the `days` param alone selects window length, source set is constant
  (serves both the row and the heatmap).

### Render (features/goals/)

- **`GoalActivityRow.tsx`** — extended from one filled/hollow dot to a
  multi-emblem set: one colored glyph per distinct kind in the day's `kinds[]`
  (task=`accent.primary`, entry=`accent.tealMid`, milestone=`brt.rose`), hollow
  outline when empty. Today keeps its ring even when active. A11y label shape
  unchanged. Pure props consumer (no DB).
- **`GoalActivityHeatmap.tsx`** (new, pure props) — weeks × weekday grid,
  single-hue (OHARA green) intensity from `count`, Monday-aligned, today ringed,
  with a weekday gutter and a Less→More legend. Consumes `ActivityDayBucket[]`;
  the week-grouping/intensity math is all in `lib/activity/activity-heatmap.ts`.
- **`GoalsWorkspace.tsx`** — mounted the heatmap in `GoalAnalyticsCard` (TD-010
  surface) under a new "ACTIVITY" `SectionHeading`, below the existing "LAST 7
  DAYS" row. **One** `useGoalActivityWindow(goal.id, 70)` call now feeds both:
  the 7-day row is `buckets.slice(-7)` of the same window (review fix — was two
  calls / two full-history reads). `types/activity.ts` NOT touched — no consumer
  needs an `entry_created` `ActivityItem` variant (L1 `GoalActivityKind` is a
  separate type; the new components consume `ActivityDayBucket`).

## Tests

- Added `lib/activity/goal-activity-sources.test.ts` (12 cases): per-source
  row→event resolution; null/empty skips; object-vs-array embed flattening;
  since-filter on the LOCAL date; **tz/DST near-local-midnight** (same instant →
  15th in `America/New_York`, 16th in `Asia/Tokyo`); UTC-date-inside-but-
  local-date-outside exclusion; invalid-tz → UTC fallback.
- Added `lib/activity/activity-heatmap.test.ts` (6 cases): Monday alignment +
  leading/trailing pad; order preserved / no duplication; `maxCount`; empty
  window; intensity level scaling + caps.
- Added a three-kind union case to `lib/activity/goal-activity.test.ts`.
- Registered the two new files in the `test:tasks` script (package.json).
- Commands run + result:
  - `npx tsc --noEmit` → pass (exit 0)
  - `npm run test:tasks` → **63 passed / 0 failed** (was 47; +16)
- Pre-commit `/code-review high`: no correctness-critical findings. Applied two
  (single-window reuse → one API call/read; today keeps its ring when active).
  Skipped, with reasons: server-side date-bounding the union reads = **T5** (see
  below); `startOfIsoWeekYmd` kept per design/001 naming; the heatmap's single
  hardcoded `rgba(99,193,116,…)` cites `OHARA_ACCENT_PRIMARY` and needs an alpha
  ramp RN can't take from a hex token; entry fetcher's RLS-only goal scoping
  mirrors the existing `getLinksForGoal`.
- Not exercised: live Expo RN Web render (not booted this session, as in T3). The
  pure fns are node-tested; the reader columns
  (`echo_entry_links.goal_id/container_type/confirmed`, `echo_entries.created_at`,
  `milestones.completed_at/user_id/goal_id`) were verified against the generated
  `types/supabase.ts`; the route/hook are unchanged proven paths.

## Decisions made

- **TD-013** — heatmap window = **70 days**, and a **single** window feeds both
  renders (the 7-day row is the window's last 7 buckets), so goal-detail makes
  one activity request/read, not two.
- **TD-014** — `entry_created` uses `echo_entries.created_at` (the authoring/
  engagement day), NOT `updated_at`, and counts only **confirmed** goal links.
  `features/goals/dashboard-goal-activity.ts` (which uses `updated_at` for
  "latest activity") is a different question and is left in place; the union is
  a NEW pure module in `lib/`, not a move of that reducer.

## Follow-ups / handoff

- **T5 (still not triggered here, but closer):** the union fetchers read full
  completed-occurrence / confirmed-link / completed-milestone history and filter
  `sinceLocalDate` in memory. With the routine 70-day heatmap this is the
  documented unbounded read on every goal-detail view. If it ever approaches the
  row ceiling, bound each query server-side with
  `localDateToUtcStart(sinceLocalDate, tz)` (`.gte`) — that is T5. Not built now.
- **Landing (TD-005):** open a reviewed PR (`feat/goal-activity-union-heatmap` →
  `main`) spanning CTO-owned `lib/db`/`app/api`/`lib/activity`, VP-owned
  `features/goals`, and docs. Merge is GATED on teammate sign-off (the
  `features/tasks`/`features/goals` slices + the union reader) + the user's
  explicit go-ahead. The user (not the agent) can trigger `/code-review ultra`.
- Initiative #1 is complete once this lands (T5 remains conditional).
