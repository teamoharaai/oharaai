# Design — To-Do × Metric Unification (goal-detail Tasks panel)

- **Date:** 2026-09-19
- **Initiative:** Goal Detail Redesign (follow-on). Evolves Design 003
  (`tracker-metrics/tasks/design/003-cadence-completions-roll.md`) and the
  goal-detail-redesign README's "one scheduling engine, no parallel machinery."
- **Status:** SIGNED OFF (2026-09-19). Decisions **TM-1 … TM-9** locked (see the
  resolved table at the bottom). **Phase 1 (due-date-at-creation) + Phase 2 (scope
  organizer + `PlanItem` unification) BUILT** (tsc green, `test:tasks` green, web
  bundle compiles; live click-through pending). **Phase 3 (flexible "N×/week"
  frequency) AUTHORED and verified offline** (tsc + `test:tasks` 78/78 + bundle
  green); migration `059_tasks_weekly_count_frequency.sql` (renumbered from 057 —
  057/058 were already taken by todo_due_time / goal_sticky_notes) was **applied +
  verified live via the mgmt API 2026-09-19** (dry-run in a rolled-back txn showed 5
  correct one-per-week occurrences with no mid-week miss; ledger latest=059). Phase
  4 (optional) follows.
- **Phase 3 build notes.** `weekly_count` is additive: `task_schedules` gains
  `target_count` + the `weekly_count` recurrence kind; `create_task_v1` forces the
  Task to `quantity`/target=N so the existing counter mechanic drives per-week
  progress; the reconcile RPC materializes one week-anchored occurrence per ISO
  week and marks it missed only once the whole week has elapsed (never mid-week).
  Per the signed-off edit-path decision, `update_task_v1` /
  `replace_task_schedule_v1` are **unchanged** (daily/weekly-only) and TaskForm
  shows a weekly_count Task's frequency **read-only** (save never routes through
  replaceSchedule, so it can't be clobbered); editing the frequency in place is
  deferred to a later pass.
- **Phase 2 build note — added a sixth bucket, `Later`.** The doc's Part 3 lists
  five sections; to keep the bucketer **total** (README "never strand a To-Do"
  invariant), dated items beyond the relative Upcoming window fall into a
  collapsible **Later** section rather than vanishing. Overdue / In-scope /
  Upcoming are unchanged; Someday stays undated-only.
- **Ownership / cascade:** `features/tasks/*` UI + client projection = **VP
  Product / L1**. The flexible-frequency schedule (Phase 3) touches
  `task_schedules` semantics + materialization RPC = **CTO / schema / L3** →
  design sign-off before PRs.
- **Validation gate:** every phase ends `npx tsc --noEmit` green + `npm run
  test:tasks` green + verified live. Each phase is independently shippable and
  reversible.

---

## Problem (user's words, paraphrased)

1. A To-Do can be struck through / undone and it saves, but it "lacks
   functionality and interconnectedness."
2. There's no way to set a **due date at creation** — you must create the item,
   then open it and edit the time. Want a **small calendar icon** in quick-add,
   with a worry about "latency, scalability."
3. A To-Do is only meaningful if you can **plan**: today, tomorrow, next week,
   and **far-future** dates — prep a week's list for a goal, with occasional
   "I need this done TODAY," and set items for later.
4. This makes **Metrics** meaningful too: pick a **frequency** — "Run 3 times a
   week (1/3 runs)."
5. Merge the two: **"a to-do is just a task without a counter / selected days of
   the week — it only has a Due Date."**
6. The **Today / This Week / This Month** organizer should drive **Upcoming**
   relative to the selected scope: on *Today*, Upcoming = tomorrow; on *This
   Week*, Upcoming = next week; on *This Month*, Upcoming = next month.

---

## Part 0 — The thesis: they are already one entity

There is no separate To-Do storage. In code a To-Do is a **projection** of a
`Task` (no active schedule + no counter). So the "merge" is **not a schema
migration** — it's a shared *projection + organizer* over the union, plus **one
additive capability** (flexible frequency). This is the reliability/scalability
headline: **reuse the one occurrence engine; add no parallel machinery** (Design
003 / README invariant).

**The discriminator (TM-1):**

| | **To-Do** | **Metric** |
|---|---|---|
| Carries | a **Due Date** (+ optional time) | a **frequency** and/or a **counter** |
| Schedule | none (one-time) | `task_schedules` (daily / set-days / **N-per-period**) |
| Counter | none (binary) | optional `quantity` target ("1/3") |
| Example | "Email advisor — by Tue" | "Run 3×/week (1/3)" |
| Field set today | `dueDate` only | `schedules[]` (+ `completion_mode=quantity`) |

Everything downstream (organizer, Upcoming, completion, history) operates on the
**union**, not on two code paths.

---

## Part 1 — Unified client projection: `PlanItem` (TM-2)

Normalize both kinds into one in-memory shape, derived from already-loaded goal
tasks (no new fetch):

```ts
type PlanItem = {
  taskId: string;
  occurrenceId: string | null;
  title: string;
  kind: 'todo' | 'metric';
  date: string | null;              // todo.dueDate OR occurrence.scheduledLocalDate (YYYY-MM-DD)
  time: string | null;
  status: 'pending' | 'completed' | 'missed';
  progress: { done: number; target: number } | null;  // metric counter → "1/3"
};
```

- **To-Do** → one `PlanItem` (its `dueDate` + display occurrence).
- **Metric, set-days** → one `PlanItem` for its next occurrence (reuse the
  existing `buildTaskSections` "collapse to earliest next" rule, TD-002).
- **Metric, N-per-period** → one `PlanItem` per period-occurrence with `progress`.

One list, one bucketer. The organizer never branches on kind — that is what makes
the merge *real* rather than cosmetic. Rows render a small kind affordance;
metrics render `done/target`.

---

## Part 2 — Due date at creation (TM-3)

**UI:** add a **📅 calendar icon** to the To-Do quick-add row → opens the
existing token-driven `DatePicker` (already built; `components/ui/DatePicker.tsx`).
Alongside it, **quick-plan chips**: `Today · Tomorrow · This Weekend · Next Week`
for fast week-prep; the calendar covers arbitrary and **far-future** dates.

**Latency / scalability (the stated worry) — this is a net win, not a cost:**
- The create RPC **already accepts `dueDate`.** Setting it at creation is the
  **same single write** — and it **removes** today's create-then-edit *second*
  write. Fewer round-trips, not more.
- The `DatePicker` and chips are **pure client**; no query, no server work.
- Values stay canonical local-calendar `YYYY-MM-DD` strings (repo rule), so no
  timezone conversion cost on the write path.

Net: **negative latency cost**, zero new scaling surface.

---

## Part 3 — The organizer becomes a time-scope selector (TM-4)

Reframe the pills from *filters over To-Dos* into a **scope selector over the
whole panel**. Scope `S ∈ { Today, This Week, This Month }`. For the selected
scope the panel renders these sections, in order:

| Section | Contents | Notes |
|---|---|---|
| **Overdue** | past-due To-Dos + missed occurrences | **Pinned, always shown**, never hidden by scope (safety: overdue must surface) |
| **In {S}** | union of PlanItems dated within S | the plan for the chosen window |
| **Upcoming** | PlanItems dated in the **next period after S** | Today→tomorrow · This Week→next week · This Month→next month (TM-5) |
| **Someday** (collapsible) | undated To-Dos + unscheduled items | reachable, but out of the way |
| **Completed** (collapsible) | history | keeps the plan clean |

This is exactly the user's "what's in scope + a peek at what's next" model, and
it is **one pure function** over `PlanItem[]`:

```ts
bucketPlanItems(items: PlanItem[], scope: Scope, now: Date):
  { overdue, inScope, upcoming, someday, completed }
```

Reuse/extend `computeTodoDueWindows` for the S and S+1 bounds (Monday-start
weeks, calendar months) and add `today`/`tomorrow`/`nextMonth`. **Pure + fully
unit-tested** (extend `features/tasks/utils.test.ts`), like the current filter
helpers. Switching scope re-runs the function in memory — **no fetch, O(n) string
compares** — so it scales to hundreds of items/goal.

> This *evolves* Design 003's fixed Today/Upcoming/Completions lanes: same engine,
> but the lanes are now derived relative to the chosen scope instead of hard-coded.

---

## Part 4 — Flexible frequency: "N times a week (1/3)" (TM-6)

This is the **one genuinely new modeling concept.** Today `task_schedules`
expresses *"on these specific weekdays."* The user wants *"3 times a week, any
days."* That is a **count-per-period target**, not a day-of-week set.

**Model (additive, L3):** introduce a period-count cadence flavor on the
schedule — recommended as new `recurrence_kind` values `weekly_count` /
`monthly_count`, plus a `target_count` (int) column (nullable; old rows
untouched). Semantics:

- Materialize **one period-anchored occurrence per period** within the rolling
  horizon: `scheduled_local_date = period_start`, `completion_mode = quantity`,
  `target = target_count`.
- "Logging a run" = the existing **`adjust_quantity` / log-one** action →
  `actualQuantity` 1→2→3; `progress = done/target = "1/3"`.
- Period rollover is handled by the **existing horizon materializer / reconcile
  job** — a new *branch*, not a new engine.

**Why this is stressproof:**
- Reuses quantity mechanics, `task_occurrences`, and the reconcile job already in
  production.
- **Bounded growth:** ≤52 rows/yr/task (weekly) — negligible; horizon-capped like
  everything else. No unbounded future generation.
- **Reads unchanged** — the `PlanItem` projection already carries `progress`.
- One additive migration; safe rollout; legacy trackers untouched (frozen).

**Alternative considered — compute-on-read** (store a weekly target on the task,
count completions in the current week at read time): avoids the migration but
pushes period logic onto every read and complicates cross-week history and the
"one row with a counter" UI. **Rejected** in favor of materialized
period-occurrences for read simplicity and engine reuse. (Open: TM-6b below.)

---

## Part 5 — Completion semantics (fixes the "flat strikethrough" note) (TM-7)

- Completing an **in-scope** item moves it into **Completed** (collapses out of
  the active plan) — the list now *reflects progress*, which is the
  "interconnectedness" that's missing today.
- For **N-per-period metrics**, a tap **logs one** (1/3 → 2/3); the row stays
  until the target is met, then completes for the period.
- Undo still works (tap again reopens), but the visual is meaningful because the
  item leaves/returns the active scope.

---

## Part 6 — Add flow after the merge (TM-8, open)

With inline due-date on To-Dos and frequency on Metrics, the current **two
buttons** ("+ Add to-do" / "+ New recurring task") still work, but the natural
convergence is **one composer** whose controls disclose the kind:

```
Title ......................................
📅 Due date   [Today][Tomorrow][Next week][📆]     ← set alone ⇒ To-Do
🔁 Repeat     [Daily][3×/week][Set days…]          ← set ⇒ Metric
#️⃣ Counter    [target] [unit]                       ← set ⇒ measured Metric
Live label: "One-time to-do, due Tue"  /  "Metric — 3×/week"
```

**Decision to confirm:** keep two labeled buttons (explicit, prior choice) **vs**
converge to one kind-disclosing composer (fewer entry points, one code path).
The merge makes the single composer more coherent, but this reverses an earlier
call — hence flagged, not assumed.

---

## Part 7 — Deep interconnection (optional Phase 4) (TM-9)

The strongest link: a dated **To-Do as an instance of a Metric.** "Run at 5am
(Tue)" completing → increments "Run 3×/week" (→ 2/3). Model: To-Do carries an
optional `metric_task_id`; completing it logs one to the metric. This makes the
week-plan (To-Dos) and the measure (Metric) literally one system. **Powerful but
adds a link concept** — proposed as optional, after the core merge lands.

---

## Scalability / latency / reliability — summary (explicit ask)

| Concern | Verdict |
|---|---|
| Reads | **Unchanged.** Goal tasks already SWR-cached via `useGoalTasks`; bucketing is pure client O(n). Scope switch = re-run a pure fn, **no fetch**. |
| Writes | **Fewer.** Due-date-at-creation removes the create→edit second write. Frequency reuses `adjust_quantity`. |
| Row growth | **Bounded** by the existing materialization horizon; period-occurrences add ≤52/yr/task. |
| Schema | **No new tables.** ≤1 additive migration (Phase 3 frequency columns/enum). Old rows untouched → safe. |
| Contract | Task counts keep reading canonical `task_occurrences` only (asserted in `features/tasks/architecture.test.ts`); no legacy trackers. |
| Testability | All date/bucket/frequency logic in **pure functions with `node:test`** coverage. |

---

## Phased build plan (each phase: tsc-green + test:tasks-green + verified)

- **Phase 0** — This doc / sign-off. No code.
- **Phase 1** — **Due-date-at-creation** on To-Do (calendar icon + quick-plan
  chips). Pure UI + reuse of the create RPC. Lowest risk, immediate value.
- **Phase 2** — **Scope organizer + relative Upcoming**; unify To-Do + existing
  metric occurrences into the `PlanItem` bucketer. Pure client + new util tests.
  **No schema.**
- **Phase 3** — **Flexible frequency** (N×/week) metric: additive migration,
  materialization branch, `done/target` UI. **L3 — CTO sign-off.**
- **Phase 4 (optional)** — To-Do↔Metric instance linking + one-composer
  convergence.

---

## Resolved decisions (signed off 2026-09-19)

| ID | Decision | Resolution | Rationale |
|---|---|---|---|
| **TM-8** | Two add buttons vs one kind-disclosing composer | **Keep two** for Phases 1–2; **defer** the one-composer merge to Phase 4, bundled with TM-9. | The two entry points (`ToDoAddRow` inline quick-add vs. `InlineTaskComposer` full recurring composer) are genuinely different-weight interactions. Merging now discards working, verified UI and reverses an earlier call for cosmetic gain; the single composer only becomes coherent once the To-Do↔Metric link exists. |
| **TM-6b** | Count-per-period: materialized period-occurrences vs compute-on-read | **Materialized** period-occurrences. | Reuses `task_occurrences` + `adjust_quantity` + the reconcile job (the "one engine" invariant), keeps reads pure, bounded ≤52 rows/yr/task. *Phase 3, L3 — CTO sign-off on the migration shape.* Design carefully: period rollover is a **new branch** in the reconcile job; a partially-completed period must not be retroactively mis-marked. |
| **Period units** | Weekly-count only vs weekly + monthly | **Weekly-count only.** | CLAUDE.md is explicit ("daily \| weekly — **no monthly**") and Design 003 lists monthly cadence (TD-004) as out of scope. Monthly would reopen a standing architectural rule — a separate decision, not smuggled in here. |
| **Someday** | Always visible-collapsed vs only under a broad scope | **Always visible, collapsed.** | Preserves the coded invariant (`utils.ts`: `all` is the only bucket that shows undated items "so filtering can never strand a To-Do"). Pure client render — zero latency/scale cost. |
| **TM-9** | To-Do↔Metric instance link in scope? | **Out of scope** for the core merge; keep documented as optional Phase 4, shipped with the TM-8 one-composer convergence. | Adds a `metric_task_id` link + completion-cascade semantics. Land it after the core merge proves out. |
| **Naming** | Record UI labels | **To-Do** (one-time) / **Metric** (recurring); entity stays `Task`; `Reminder` remains a *preset within* Metric; kill the stray "Habit" wording in `InlineTaskComposer`. Recorded in `docs/DECISIONS.md` (2026-09-19). | Four names for the recurring thing (Metric / Habit / Reminder / recurring-Task) was accumulating; consolidate the vocabulary. |
