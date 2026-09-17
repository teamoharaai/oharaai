# Tasks Initiative — Compounding Memory

Durable facts for the Metrics→Tasks salvage. Read first. Append; correct stale
facts in place. Dated so drift is visible. Parent facts live in `../MEMORY.md`.

## Repo & branch realities (2026-09-15)

- **Canonical line is `origin/main`** (the Tasks taxonomy). Local `main` was
  realigned to it. The tracker-metrics `tracker-metrics/` docs on this line are
  the pre-fork (Tasks 0–2) versions; the FULL Tasks 3–10 docs + code are on
  branch **`feat/tracker-metrics-archive`** (`bbd5c6c`, pushed).
- **`feat/port-tracker-optimism-boundary`** (`0317484`, pushed) already ports two
  salvage pieces onto Tasks: `features/tasks/task-optimism.ts`,
  `task-boundary.ts`, `hooks/useTaskBoundaryRefresh.ts`, wired into
  `useGoalTasks` (public API unchanged → `TasksPanel` upgraded for free). tsc
  clean; `test:tasks` 32/32.

## T2 shipped — Upcoming collapse (2026-09-16, session 002)

- **`features/tasks/utils.ts`:** `buildTaskSections` de-dupes `sections.upcoming`
  to one entry per `task.id` (kept AFTER the `occurrenceSortValue` sort → first
  seen per task = earliest future occurrence; cross-task order preserved).
  `today`/`anytime`/`completed` untouched; `{ task, occurrence }` shape unchanged
  so `fetchTodayTaskItems` is unaffected. Added pure `shortDate(YYYY-MM-DD)`
  helper (hand-parsed, no `Date`/UTC drift).
- **`features/tasks/components/TasksPanel.tsx`:** `TaskRow` has optional
  `showNextDate`; Upcoming section passes it → secondary line `scheduleLabel ·
  next <shortDate>`. `slice(0, full ? 30 : 4)` now caps tasks, not occurrences.
- 6 new cases in `features/tasks/utils.test.ts`. tsc clean; `test:tasks` 38/38.
- Lives on `feat/port-tracker-optimism-boundary` (same branch as T1). Land via
  reviewed PR + teammate sign-off (TD-005) — NOT pushed to main.

## T3 shipped — Goal-activity L1 + 7-day row (2026-09-16, session 003)

- **New files:** `lib/activity/goal-activity.ts` (pure `buildActivityWindow` +
  `GoalActivityKind`/`GoalActivityEvent`/`ActivityDayBucket`/`ActivityWindowOptions`;
  node-tested in `lib/activity/goal-activity.test.ts`, registered in `test:tasks`);
  `lib/db/goal-activity.ts` (reader `fetchGoalActivityEvents` + `fetchProfileTimezone`);
  `features/goals/components/GoalActivityRow.tsx` (pure props render);
  `features/goals/hooks/useGoalActivityWindow.ts`;
  `app/api/goals/activity-window+api.ts`.
- `types/activity.ts` extended (extend-only) with `task_completed` +
  `TaskCompletedActivity`. Adding the kind forced a new case in the exhaustive
  `activityPresentation` switch in `GoalsWorkspace.tsx` — watch for other
  exhaustive `ActivityKind` switches when extending again (tsc catches them).
- **Render surface reality (TD-010):** `AnalyticsPanel.tsx` /
  `IntelligencePanel.tsx` are **unmounted** (no screen imports them) — the
  design's anchors were wrong. The live goal-analytics surface is
  `GoalAnalyticsCard` inside `SelectedGoalWorkspace`'s `ContextRail`
  (`GoalsWorkspace.tsx`); the "LAST 7 DAYS" row landed there.
- **Generated-types gotcha:** the Tasks tables (`tasks`/`task_occurrences`/
  `task_schedules`) are NOT in `types/supabase.ts`. Data access uses an untyped
  `SupabaseClient` + `.from('task_occurrences')` (same as `lib/db/tasks.ts`).
  `profiles.timezone` DOES exist in the generated types.
- L1 output shape is the stable seam for the recap pipeline (TD-007, kept OFF)
  and Phase C (T4) — do not change it; only add reader sources.

## PR #21 MERGED — T1+T2+T3 shipped to main (2026-09-16, session 004)

- **PR:** https://github.com/teamoharaai/oharaai/pull/21 (`feat/port-tracker-optimism-boundary`
  → `main`). **Squash-merged as `466b44a`; branch deleted.** Spanned T1
  (`0317484`) + T2 (`0179197`) + T3 (`0034a5b`) + docs. TD-005 gate satisfied:
  teammate sign-off + user go-ahead. tsc clean + test:tasks 47/47 re-verified on
  main post-merge.
- **Commit grouping (TD-011):** T2 = `features/tasks/*`; T3 = `lib/activity` +
  `lib/db/goal-activity` + `types/activity` + `features/goals/*` + `app/api` +
  `package.json`; docs = `tracker-metrics/tasks/**` + `CHANGELOGCODEX.md` + the
  session-001 `docs/CLAUDE.md` + `lib/ai/CLAUDE.md` corrections (kept in the docs
  commit because they belong to this initiative — they cite `design/002`).
- **Merge gate (TD-005) — CLEARED:** teammate signed off on the `features/tasks`
  slice + L1 shape and the user gave go-ahead; squash-merged 2026-09-16. Sign-off
  notes captured in **TD-012**: (1) T1 boundary refresh confirmed to use canonical
  occurrence/schedule tz (not device tz); (2) `ActivityDayBucket[]` is the stable
  **engagement** seam only — keep it frozen + source-additive in T4; the recap
  pipeline (TD-007, OFF) assembles richer Task/Milestone/Reflection/Note context,
  not L1; (3) the GoalAnalyticsCard placement (TD-010) is provisional — owner's
  Goals V2.0 polish pass may relocate the row (mount point only, not reader/contract).
- Pre-commit `/code-review high`: no blocking findings. Two low-sev notes
  (unbounded completed-occurrence read → the documented T5 trigger; tiny
  `isoWeekdayForYmd` duplication constrained by D-004) — left as-is.

## T4 MERGED — Phase C union + heatmap (2026-09-17, session 005)

- **PR #22 squash-merged to `main` as `a73ffde`; branch deleted.** tsc clean +
  `test:tasks` **63/63** re-verified on `main` post-merge (was 47). **Merge gate
  (TD-005): teammate sign-off (cond. a) was WAIVED on the user's explicit
  go-ahead — NOT obtained (TD-015).** Cloud `/code-review ultra 22` could not
  start (Claude GitHub App lacks `teamoharaai/oharaai` access); notify the
  features/goals owner post-hoc. **Initiative #1 is COMPLETE** (T5 conditional).
- **L1 output shape UNCHANGED** (honors TD-012 caveat). `buildActivityWindow` was
  already union-capable — no edit. Phase C only added reader **sources**.
- **New pure module `lib/activity/goal-activity-sources.ts`** — source-agnostic
  row→event normalizers (`taskOccurrenceRowsToEvents` / `entryLinkRowsToEvents` /
  `milestoneRowsToEvents`), relative-import + node-tested (D-004). This is the
  "cross-feature union generalized into `lib/`"; the `lib/db` reader composes it
  (no `features/*` import). `features/goals/dashboard-goal-activity.ts` is LEFT
  intact — it answers "latest activity" off `updated_at`, a different question
  (**TD-014**).
- **Reader `lib/db/goal-activity.ts`** — `fetchEntryCreatedEvents`
  (`echo_entry_links` `container_type='goal'` + `confirmed=true` →
  `echo_entries.created_at`) + `fetchMilestoneCompletedEvents`
  (`milestones.completed_at`, goal+owner scoped). All three in generated types;
  Tasks tables stay untyped (unchanged).
- **New pure `lib/activity/activity-heatmap.ts`** — `groupBucketsIntoWeeks`
  (Monday-aligned via `startOfIsoWeekYmd`, null-padded, order-preserving) +
  `heatmapIntensityLevel`. Node-tested.
- **Render:** `GoalActivityRow` → multi-emblem set (task green / entry tealMid /
  milestone rose); new pure `GoalActivityHeatmap`; both mounted in
  `GoalAnalyticsCard` ("LAST 7 DAYS" row + new "ACTIVITY" heatmap). **One**
  `useGoalActivityWindow(goal.id, 70)` call feeds both (row = `slice(-7)`) —
  **TD-013** (window=70, single read). `types/activity.ts` NOT touched.
- **T5 still not triggered but closer:** union fetchers read full history +
  in-memory `sinceLocalDate` filter; the routine 70-day heatmap makes this the
  documented unbounded read. Bound via `localDateToUtcStart(...).gte` when needed.

## Live DB (verified via mgmt API, 2026-09-15)

- `schema_migrations` tops at **051**. `trackers`/`tracker_logs` readable but
  **writes revoked from `authenticated`** (freeze active). `tasks`,
  `task_schedules`, `task_occurrences`, `task_mutation_receipts` live + writable.
- Mgmt API query endpoint works with a curl UA (see root
  `ref_supabase_migration_apply.md`); project ref `rrgiqemscnyaqkculnmb`.

## Tasks model (must-know)

- `completion_mode`: `binary` (habit/checklist analog) | `quantity` (**the
  renamed Metrics counter**; ±1 vs `target_quantity`/`quantity_unit`).
- `task_schedules.recurrence_kind`: **daily | weekly only — NO monthly.**
  Versioned; `weekdays[]` (ISO 1–7); per-schedule `timezone`.
- `task_occurrences`: materialized, status-bearing (`pending/completed/skipped/
  missed/cancelled`), `scheduled_local_date`, `actual_quantity`. Server RPCs own
  all writes. `reconcile_task_occurrences_v1` pre-generates a **28-day default
  horizon** (max 180) of occurrences.
- Client: `features/tasks/` — `buildTaskSections` (today/upcoming/anytime/
  completed) buckets each actionable occurrence by `dateInTimeZone(tz, now)`;
  `TasksPanel` renders **one `TaskRow` per occurrence**.

## Confirmed issue root-causes (audit 000)

- **Upcoming spam** = reconcile 28-day horizon × `buildTaskSections` (all future
  occurrences → upcoming) × `TasksPanel` one-row-per-occurrence. Fix: collapse
  Upcoming to one row per task. UI-only, pure/testable.
- **7-dot history gone** = never ported; `TaskRow` shows only current status.
  Salvage from archived `features/goals/tracker-display.ts`, re-pointed onto
  `task_occurrences` and re-conceived as day-activity (goal #2, cross-feature).
- **Counter rename** = intended (`quantity` mode); mechanics fine, only the
  history visual regressed.

## Gotchas (inherited)

- **D-004:** node tests have no `@/` map → test-reachable modules use relative
  imports + `import type`. (The ported task-optimism/task-boundary already comply.)
- `features/tasks/` is the teammate's active slice → CLAUDE.md **L2/L3
  coordination** before landing changes.
- `npx tsc --noEmit` must pass before + after every change.

## Decisions

- Decision ids for this initiative are **`TD-NNN`** (see `DECISIONS.md`), separate
  from the parent `D-NNN`.
