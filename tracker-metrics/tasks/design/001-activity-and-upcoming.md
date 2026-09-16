# Design 001 — Upcoming collapse + Goal-activity (L1)

- **Date:** 2026-09-16
- **Initiative:** #1 Tasks-salvage (this repo of docs).
- **Status:** Settled. This is the contract the implementation and any reviewer
  build against. Decisions: TD-002, TD-004, TD-005, TD-006. Supersedes the DRAFT
  framing in `PLAN.md`.
- **Ownership:** `features/tasks/*` is the teammate's slice → **design sign-off
  before PRs** (TD-005). The shared reader lives in `lib/` (CTO); the render lands
  on the goal Analytics surface in `features/goals/*` (VP Product).

---

## Part A — Upcoming collapse (TD-002)

### Problem (confirmed root cause)

`fetchGoalTasks` (`lib/db/tasks.ts`) reconciles a **28-day horizon** of
`task_occurrences`. `buildTaskSections` (`features/tasks/utils.ts:66`) pushes
**every** occurrence with `scheduledLocalDate > today` into `upcoming`, and
`TasksPanel` renders **one `TaskRow` per occurrence** (keyed by `occurrence.id`).
A daily task therefore shows ~27 identical Upcoming rows.

### Change (pure, UI-only — no schema/RPC/horizon change)

1. **`buildTaskSections` collapses `upcoming` to one entry per task.** After the
   existing per-occurrence classification, de-dupe `upcoming` by `task.id`,
   keeping the **earliest future actionable occurrence** (the current sort already
   orders by `occurrenceSortValue`; take the first per task). `today`, `anytime`,
   and `completed` semantics are **unchanged**.
   - The section item shape (`{ task, occurrence }`) is unchanged, so
     `fetchTodayTaskItems` (which reuses `buildTaskSections`) is unaffected — it
     only reads `today` + completed-today.
2. **`TasksPanel` renders the collapsed row** with a schedule summary. The row's
   secondary line already calls `scheduleLabel(task)` (`utils.ts:32`); add the
   next date, e.g. `` `${scheduleLabel(task)} · next ${shortDate(occurrence.scheduledLocalDate)}` ``.
   The `sections.upcoming.slice(0, full ? 30 : 4)` cap stays (now it caps *tasks*,
   not occurrences).

### Acceptance

- Creating a daily task shows **exactly one** Upcoming row.
- A weekly task with 3 weekdays shows **one** Upcoming row (next occurrence).
- Multiple tasks preserve `occurrenceSortValue` order across their next
  occurrences.
- `today` / `missed` / `anytime` / `completed` counts are identical before/after.

### Test cases (`features/tasks/utils.test.ts`, node `--test`)

- daily task, 28 pending future occurrences → `upcoming.length === 1`.
- two daily tasks → `upcoming.length === 2`, ordered by earliest next date.
- task with a `today` occurrence **and** future occurrences → appears in `today`,
  and its single collapsed row in `upcoming` (today is not swallowed).
- weekly task (weekdays [1,3,5]) → one `upcoming` row = earliest future weekday.
- no future occurrences (only completed) → `upcoming.length === 0`.

---

## Part B — Goal-activity model (L1) (TD-006)

### Purpose

A per-day, per-goal **engagement** signal, in the user's timezone, that renders
as (1) a **7-day weekday (MTWTFSS) emblem row** and (2) a **GitHub-style
heatmap**, and whose output is stable for the future weekly-recap consumer
(TD-007). It is **not** a per-task history — it is goal-level "which days did you
engage this goal, and how."

### Layering & ownership

- **L0 — capture (exists):** `task_occurrences` (status `completed`), goal-linked
  Entries (`echo_entry_links` → `echo_entries`), `milestones.completed_at`.
- **L1 — derivation (`lib/`, shared, pure core):** because the union spans
  features and `features/*` cannot cross-import (`features/CLAUDE.md`), the
  derivation is **shared**. Proposed home: `lib/activity/goal-activity.ts` (pure)
  + `lib/db/goal-activity.ts` (the row reader).
- **Render:** goal **Analytics** surface. `IntelligencePanel` sits **beneath**
  `AnalyticsPanel` (TD-006). Render components consume L1 output as props (no
  data access in components — `features/CLAUDE.md` rule 3).

### The pure function (source-agnostic, timezone-agnostic)

```ts
// lib/activity/goal-activity.ts — pure; node-test reachable (D-004: relative
// imports + `import type` only; no `@/`).

// Extends types/activity.ts ActivityKind (extend-only per types/CLAUDE.md).
export type GoalActivityKind =
  | 'task_completed'       // Phase B
  | 'entry_created'        // Phase C (note or reflection linked to the goal)
  | 'milestone_completed'; // Phase C

/** One engagement event, already resolved to a LOCAL calendar date by the reader. */
export interface GoalActivityEvent {
  goalId: string;
  kind: GoalActivityKind;
  localDate: string; // 'YYYY-MM-DD' in the user's profile timezone
}

/** One day in the window. Oldest→newest; the last bucket is today. */
export interface ActivityDayBucket {
  date: string;               // 'YYYY-MM-DD' (local)
  isoWeekday: number;         // 1..7 (Mon..Sun) — drives the MTWTFSS row
  kinds: GoalActivityKind[];  // DISTINCT kinds active that day → emblem set
  count: number;              // total events that day → heatmap intensity
  isToday: boolean;
}

export interface ActivityWindowOptions {
  asOfLocalDate: string; // today in the user's tz ('YYYY-MM-DD')
  days: number;          // 7 for the row; e.g. 63/70/84 for the heatmap
}

export function buildActivityWindow(
  events: readonly GoalActivityEvent[],
  options: ActivityWindowOptions,
): ActivityDayBucket[];
```

**Rules the function guarantees:**
- Emits exactly `days` buckets, contiguous, **oldest→newest with today last**
  (the archived `tracker-display` ordering; do not re-sort downstream).
- `kinds` is the **distinct set** of kinds seen that day, in a stable order
  (declaration order of `GoalActivityKind`) so the emblem row is deterministic.
- Days with no events → `kinds: []`, `count: 0` (an empty/hollow cell — never
  invented history; mirrors `habitBucketViews` padding intent).
- Pure: no `Date.now()`, no `Intl` — all tz resolution happens in the reader.

### The reader (timezone rule lives here)

```ts
// lib/db/goal-activity.ts
export async function fetchGoalActivityEvents(
  db, userId, goalId, opts: { sinceLocalDate: string; profileTimezone: string; sources: GoalActivityKind[] }
): Promise<GoalActivityEvent[]>
```

- Resolve the user's **`profiles.timezone`** once (default `'UTC'` via
  `normalizeTimezone`). This is the single bucketing tz (TD-006) — per-schedule tz
  is **not** used, because Entries/milestones carry none.
- Convert each raw timestamp to a local date with
  `localDateForInstant(instant, tz)` from `lib/time/zoned-calendar.ts`. Build the
  window start with `addLocalDays(asOf, -(days-1))`; heatmap week alignment uses
  `startOfIsoWeekYmd`.
- **Phase B source (`task_completed`):** `task_occurrences` where
  `status='completed'`, `localDate = localDateForInstant(completed_at, tz)`
  (actual engagement day, not `scheduled_local_date`). Quantity tasks count when
  completed (an occurrence reaching `completed`). Read is scoped to the goal's
  tasks; never touches `trackers`/`tracker_logs`.
- **Phase C sources:** `entry_created` from goal-linked Entries
  (`echo_entry_links` where `container_type='goal'` → `echo_entries.created_at`);
  `milestone_completed` from `milestones.completed_at`. Generalizes the existing
  `features/goals/dashboard-goal-activity.ts` union, moved to `lib/`.

### Render contract

- **MTWTFSS emblem row** (7-day): consumes `ActivityDayBucket[]` (days=7). Per day:
  empty set → hollow dot; else render the **emblem set** — one glyph per kind
  (task glyph, Echo glyph for entries, milestone glyph). Reuse the archived
  `tracker-display` ordering/label patterns (`bucketPeriodLabel`,
  accessibility-label shape), re-pointed onto `ActivityDayBucket`. Accessibility:
  ``${weekdayLabel}, ${date}${isToday?', today':''}: ${kinds.length? kinds joined : 'no activity'}``.
- **Heatmap** (long window): weeks × weekday grid, cell intensity from `count`,
  aligned by `startOfIsoWeekYmd`. Same L1 output, larger `days`.
- Both are pure renders of L1; no component reads the DB.

### Phasing within initiative #1

- **Phase A:** Upcoming collapse (Part A). Independent; ships first.
- **Phase B:** L1 pure fn + reader (occurrences-only) + the 7-day row on the goal
  Analytics surface, `IntelligencePanel` positioned beneath `AnalyticsPanel`.
- **Phase C:** extend reader sources to the union (`entry_created`,
  `milestone_completed`) → multi-emblem row + heatmap. Same output shape.
- **L2 seam (OFF, TD-007):** `buildActivityWindow` output is the stable input the
  weekly-recap pipeline will consume. No summarization / `character_profile`
  writes here.

### Test cases (`lib/activity/goal-activity.test.ts`, node `--test`)

- 7 contiguous days, today last; `isoWeekday` correct for each.
- a `task_completed` event on day D fills only D's bucket (`kinds:['task_completed']`, `count:1`).
- two events same day, different kinds → `kinds` has both (distinct, declaration order), `count:2`.
- two events same day same kind → `kinds` length 1, `count:2`.
- empty input → `days` buckets all `kinds:[]`, `count:0`.
- event outside the window (older than `asOf-(days-1)`) → excluded.
- ordering is oldest→newest with `isToday` only on the last bucket.
- (reader, integration-style if feasible) DST/`profiles.timezone` correctness via
  `localDateForInstant` — an instant near local midnight lands on the correct day.

### Explicitly out of scope (this initiative)

- Any write to `trackers`/`tracker_logs` (frozen), any `task_schedules`/RPC change
  (incl. monthly — TD-004).
- L2 correlation / `character_profile` writes (TD-007).
- Vaults↔Notes↔Intelligence corpus & the `insight`-item loop (TD-008 →
  `design/002`).
- iOS contract / reminders (TD-009).
