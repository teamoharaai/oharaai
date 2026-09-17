# Design 003 — Tasks UX: two-axis model, Completions, Roll, Weekly grid

- **Date:** 2026-09-16
- **Initiative:** #1 Tasks-salvage (UX optimization phase).
- **Status:** Settled with the user (2026-09-16 brainstorm). This is the contract
  implementation and reviewers build against. Decisions: TD-016 … TD-022.
  Appendix A (AI suggestions) is **exploratory — not canon**; captured for record.
- **Ownership / cascade:** `features/tasks/*` is the teammate's slice → **design
  sign-off before PRs** (TD-005). The Roll occurrence-creation RPC + the
  `source='rolled'` enum + promotion skip-count persistence are **CTO / schema
  (L3)**. Everything else is **VP Product / pure UI (L1)**.

---

## Problem (user's words)

Tasks has good building blocks but "lacks a sense of organization and visuals."
Specific pains:
1. A **daily** task spams **Upcoming** (residual after the TD-002 collapse: a
   daily task still emits a meaningless `Upcoming · next <tomorrow>` row).
2. **"One time"** and **"Daily"** feel like the same thing; **Custom** overlaps
   Weekly.
3. No **Today / Weekly** surface to plan ahead ("next week", "next Sunday").
4. **Optional Due Date** is unwanted.
5. Quantity placeholders are unprofessional (`"20"`, `"pages"`).
6. Open question: should Tasks vary by goal **category**?

---

## Part 0 — The mental model: two orthogonal axes (TD-016)

The root confusion is that five recurrence chips (`One time / Daily / Weekly /
Every 2 weeks / Custom`) mix **two independent questions**. Split them:

**Axis 1 — Cadence** (how/whether it recurs):

| Cadence | Definition | Lives in | Rollable? |
|---|---|---|---|
| **Completion** | ad-hoc, no schedule; a checklist item for the goal anchored to a day | **Today** checklist (+ Anytime backlog) | ✅ roll forward one day at a time |
| **On set days** | pick weekday(s); 1 day = once/week, 3 days = 3×/week | its **next** occurrence in **Upcoming** | ✗ (schedule already defines the future) |
| **Daily** | every day; shorthand for "all 7 days" | **Today** only — **never Upcoming** | ✗ (already recurs tomorrow) |

**Axis 2 — Measure** (how you mark one occurrence):

| Measure | Meaning |
|---|---|
| **Check off** (binary) | did it / didn't |
| **Quantity** | an **amount per occurrence** (20 pages, 30 min) |

**Any cadence can carry either measure.** This 2-axis matrix replaces the five
overlapping chips and removes every overlap the user named:
- *"One time" vs "Daily"* → same axis, opposite ends of a **cadence ladder**
  (Completion = ad-hoc bottom, Daily = committed top).
- *Weekly vs Custom* → merged: **On set days** is one control (tap weekdays).
- *"Every 2 weeks"* → demoted from a top-level chip (rare `intervalCount:2`;
  fold into an advanced toggle later, not v1).

---

## Part 1 — The counter conflict, resolved (TD-017)

The user's core conflict: rolling a task repeatedly "just becomes a counter,"
which collides with the Quantity counter. Resolution — there are **two distinct
counts and they never merge**:

- **Streak (cadence count)** — *how many days/times you showed up*. **Derived
  history** from completed `task_occurrences` (reuse the L1 `buildActivityWindow`
  machinery from design 001 / `lib/activity/goal-activity.ts`). Applies to **any**
  task, including a plain check-off. Feeds the heatmap / activity signal.
- **Quantity (measure count)** — *how much in one sitting*. An explicit
  per-occurrence value that exists **only** when the user picked Quantity mode.

**Rolling builds a Streak, never a Quantity.** Rolling a check-off Completion
creates **another binary occurrence** for tomorrow; completing it increments the
derived streak. The task does **not** silently become a quantity counter. The two
axes stay orthogonal — confirmed by the user ("keep them fully separate").

---

## Part 2 — Roll mechanic (TD-018)

- **Roll is Completion-only.** A Completion has no schedule; rolling it inserts a
  **pending occurrence for tomorrow** (or a chosen future day), which then appears
  in **Upcoming / This Week**. This is the "carry the intention forward one day at
  a time without committing to a schedule" behavior (the stock-roll metaphor).
- Daily / On-set-days tasks are **not** rollable (their future is already defined).
- Each rolled occurrence is its **own binary check-off** on its own day.
- **Backend (CTO / L3):** occurrence creation today only goes through RPCs
  (`log_completed_task_v1`); there is **no** generic "create one pending
  occurrence for date X." Roll needs either a new RPC (`roll_completion_v1`) or an
  extension, plus `source='rolled'` added to the `task_occurrences.source` CHECK
  (`supabase/migrations/048_…:114` → new migration). Do **not** write
  `trackers`/`tracker_logs`.

---

## Part 3 — Promotion loop (TD-019)

The graduation path from ad-hoc → committed, and the ecosystem payoff (spontaneous
behavior feeds structure, which feeds the activity signal → Intelligence).

- **Trigger:** after a rolled Completion has been **done 3 days running**
  (consecutive completed rolled occurrences), surface a gentle prompt: *"You've
  done this 3 days straight — make it Daily?"*
- **Actions:** **Promote** (one tap → convert the Completion into a Daily task,
  attaching a `task_schedule` recurrenceKind `daily`) **or Skip**.
- **Skip is recorded.** Persist a **promotion skip count** per candidate task; each
  Skip increments it. This is a **behavioral signal** (reluctance to commit → a
  pattern for the future weekly-recap / Intelligence consumer, TD-007 seam — do
  NOT write `character_profile` here). Re-offer on the next qualifying streak.
- **Storage (CTO / schema, L3):** the skip count needs a home — a `tasks` column
  (e.g. `promotion_skip_count int not null default 0`) or a small side table.
  Team decision; it is net-new persisted state, not derivable.

*Threshold (3), consecutive-vs-cumulative streak semantics, and re-offer cadence
are the settled defaults; revisit only if they feel naggy in testing.*

---

## Part 4 — Completions absorb Log-completed (TD-020)

One ad-hoc lane. **Completions** unifies:
- forward ad-hoc ("I want to do this for the goal today"), and
- retroactive ("I already did this") — today's `LogCompletedForm`
  (`TasksPanel.tsx:267`) + `POST /api/tasks/log-completed`
  (RPC `log_completed_task_v1`).

Both are unscheduled, day-anchored, rollable. UI merges the two entry points into
the Completions lane; the retroactive RPC path is **reused**, not rebuilt. The
existing **Anytime** section (no-schedule tasks) is Completions' backlog tail.

**Naming caveat:** an unchecked Completion is really a *to-do*, so "Completions"
reads slightly off for the pending state. Kept as the user's chosen lane label;
revisit if it confuses in testing.

---

## Part 5 — Weekly grid in the per-goal TasksPanel (TD-021)

View home = **enrich `features/tasks/components/TasksPanel.tsx`** (not a new route,
not the dashboard grid). Per-goal, scoped, reuses the component.

- **Today** (default): today's occurrences — Daily rhythm + any On-set-days
  occurrence due today + Completions for today. Missed/overdue one-shots surface
  here.
- **Week** (new grid): Mon→Sun columns, aligned via the existing
  `startOfIsoWeekYmd` / `ActivityDayBucket` primitives (design 001). Renders:
  - **Daily** task → one row spanning all 7 columns.
  - **On set days** task → marks only on its weekdays; tap a future day to plan.
  - **Completion** → checklist chip on its day; a **rolled** one → chip on the
    target future day.
- **Classification change (pure, `features/tasks/utils.ts:57` `buildTaskSections`):
  Daily never enters Upcoming.** Upcoming is fed only by (a) On-set-days next
  occurrences and (b) rolled Completions. This is the real fix for the spam — a
  rule change, not a de-dupe. The TD-002 collapse stays as a safety net.
- Components stay prop-fed (features rule 3); the week buckets are a pure
  derivation over `tasks`, no DB access in the component.

---

## Part 6 — Polish (folds into the above PRs)

- **Drop Optional Due Date.** Remove the `dueDate` input (`TasksPanel.tsx:158,233`)
  and the `none`-recurrence due-date path. One-time **dated** events are
  **Milestones** per CLAUDE.md ("Do not model one-time events as Tasks"); undated
  ad-hoc → Completions. (`Task.dueDate` field can remain in the type/schema unused
  for now; removal is a later cleanup, not this PR.)
- **Placeholders** (`TasksPanel.tsx:220-221`): `"20"` → `"Quantity"`, `"pages"` →
  `"Units"`. Apply the same to `LogCompletedForm` for consistency.
- **Recurrence chips** relabel to the cadence axis: `Once` (→ Completion/Anytime) ·
  `Daily` · `On set days` (weekday picker; merges Weekly + Custom). Drop the
  `Every 2 weeks` top-level chip.

---

## Part 7 — Category starter chips (TD-022)

`GoalCategory` has **~12 values** (`lib/goals/schema.ts`: legacy
`body/mind/money/create/connect/contribute` + creation
`health/finance/career/creative/education/relationships/…`). A full **template
system** (curated, editable sets × 12, a picker, maintenance) is a separate
initiative and risks being prescriptive — **rejected.**

**Shipped instead:** when a goal has a category and **zero tasks**, the empty
state (`TasksPanel.tsx:414`) offers **2-3 tappable starter chips** from a static
`Record<GoalCategory, TaskSuggestion[]>` (each chip carries a title + suggested
measure + suggested cadence). One tap opens `TaskForm` **prefilled**; the user
edits and saves through the normal pipeline. No schema, no new screen. This chip
surface is deliberately the **same UI seam** AI suggestions plug into later
(Appendix A) — the only difference is the source of the chips (static map vs.
model output). Ships in **Phase 1**.

---

## Appendix A — AI-suggested tasks & cadence (EXPLORATORY, not canon)

> Recorded for bookkeeping at the user's request (2026-09-16). **Not in the
> committed design scope**; no TD numbers; do not implement from this section.
> Promote to a Part + TDs only after an explicit design pass.

**Architectural fit (why this shape is forced):** CLAUDE.md — AI insights are
*suggestions only, user confirms, never auto-applied* (token `feedback.pending`
exists for unconfirmed AI banners); all calls route through `lib/ai/client.ts`.
So AI tasks **must** render as **pending chips/banners** the user Accepts / Edits /
Dismisses — identical to the static chip flow above.

**Two AI moments, mapped onto the two axes:**

**① Cold start — suggest the starter set** (goal creation / empty state).
- Highest-signal input already exists: `GoalSmartData`
  (`specific / measurable / timeBound`). A measurable of "read 20 pages" +
  timeBound "30 days" → model proposes *Daily · Quantity 20 pages* — cadence AND
  target, not guesswork.
- UI: the **same chip row** as TD-022; chips are model-generated. Static map is the
  fallback. This is the "Sonnet, Phase 2" hook — no new UI surface.

**② Warm loop — suggest custom cadence from behavior** (ongoing).
- Input: the **L1 activity signal** (`lib/activity/goal-activity.ts` window —
  rolled streaks, promotion skip counts, actual completion weekdays). This is the
  same data feeding the heatmap and the weekly-recap seam (TD-007).
- Behavior: reads the *pattern* → proposes the *specific weekday set*
  (*"You complete this Mon/Wed/Fri — set those days?"*) or a promotion
  (*"rolled 5×; make it Daily?"*). It is the **AI generalization of the hardcoded
  promotion loop (TD-019)** — same intent, smarter trigger.
- UI: pending banner on `TasksPanel`; one tap writes the `task_schedule`.

**End-to-end workflow:**
```
signal (SMART data | activity window)
  → lib/ai/client.ts (Haiku warm-loop / Sonnet cold-start)
  → structured suggestion (schema TBD in AI_RESPONSE_SCHEMA.md)
  → pending chip/banner (feedback.pending)
  → Accept / Edit / Dismiss
  → existing task creation pipeline (never auto-applied)
```

**Scoping note:** ① is cheap (rides the TD-022 chip surface). ② is heavier (wire
the activity window as AI input + a suggestion schema) but is the highest-leverage
closure of the behavior→structure loop. Neither is committed here.

---

## Ownership / cascade map

| Work | Layer | Owner |
|---|---|---|
| Placeholders, chip relabel, drop due-date input, Completions lane UI, Week grid, streak display, promotion prompt UI | L1 pure UI | VP Product (`features/tasks`, `components`) |
| `buildTaskSections` reclassify (Daily ∉ Upcoming), week-bucket derivation | L1 pure | VP Product (`features/tasks/utils.ts`) |
| Roll RPC (`roll_completion_v1`), `source='rolled'` enum | L3 schema/API | CTO (`app/api`, `lib/db`, `supabase/migrations`) |
| Promotion `skip_count` persistence | L3 schema | CTO + team |
| Streak = reuse `buildActivityWindow` | L1 pure (exists) | shared `lib/activity` |

---

## Phasing

- **Phase 1 (UI-only, ships first):** placeholders, chip relabel to the cadence
  axis, drop due-date input, `buildTaskSections` reclassify (kills the spam),
  Completions lane (merges Log-completed entry points), streak display from
  existing completed occurrences. No schema.
- **Phase 2:** Week grid in `TasksPanel`.
- **Phase 3 (needs schema, CTO):** Roll (`roll_completion_v1` + `source='rolled'`)
  → rolled Completions in Upcoming/Week.
- **Phase 4 (needs schema, CTO):** Promotion loop + skip-count persistence +
  behavioral-signal seam (kept OFF per TD-007).
- Category **starter chips** (static, TD-022) ship in **Phase 1**.
- **Future (uncommitted):** AI suggestions ①/② (Appendix A) — needs its own design
  pass + TDs before any implementation.

---

## Explicitly out of scope

- Monthly cadence (TD-004), `trackers`/`tracker_logs` writes (frozen),
  `character_profile` writes (TD-007).
- New cross-goal Tasks route / dashboard Weekly grid (user chose per-goal panel).
- Full category template system (rejected; static starter chips ship instead — TD-022).
- AI-suggested tasks/cadence (Appendix A) — exploratory, not this initiative.
- Removing the `Task.dueDate` column (later cleanup, not this initiative).

---

## Decisions

- **TD-016** — Tasks modeled on two orthogonal axes: **Cadence**
  (Completion / On-set-days / Daily) × **Measure** (Check-off / Quantity).
  Replaces the five overlapping recurrence chips.
- **TD-017** — **Streak** (derived cadence history) and **Quantity** (explicit
  per-occurrence amount) are separate and never merge. Rolling builds a streak,
  never a quantity.
- **TD-018** — **Roll** is Completion-only: inserts a pending future occurrence
  (Upcoming). Needs a new RPC + `source='rolled'` (CTO/L3). Daily/On-set-days not
  rollable.
- **TD-019** — **Promotion:** after a 3-day rolled streak, offer promote-to-Daily
  or **Skip**; persist a **skip count** as a behavioral signal (seam OFF, TD-007).
- **TD-020** — **Completions** absorb the retroactive **Log-completed** flow into
  one ad-hoc, day-anchored, rollable lane (reusing `log_completed_task_v1`).
- **TD-021** — View home = **per-goal `TasksPanel`** with **Today** + **Week**
  views; **Daily never enters Upcoming** (`buildTaskSections` rule change is the
  real spam fix).
- **TD-022** — Category task suggestions ship as **static starter chips** on the
  zero-task empty state (2-3 per category, one-tap prefill, no schema, Phase 1);
  the full template system is rejected. The chip surface is the seam AI suggestions
  later plug into (Appendix A).
- **(no TD)** — Appendix A (AI-suggested tasks/cadence) is exploratory; recorded,
  not committed.
