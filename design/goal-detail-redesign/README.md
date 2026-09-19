# Goal Detail Redesign — Tasks / Reminders / Deadlines

> Status: **BUILT — all 4 phases shipped to the working tree and verified live
> (2026-09-18).** Migrations 055 (delete prep milestones) + 056 (optional counter
> target) applied. Phase 4 was scoped to **pickers-only** (density-aware DatePicker,
> no standalone panel). Owner surfaces span CTO (schema, lib/db, api, migrations) +
> VP Product (components/features). This was an **L3** change: types, schema
> semantics, and the Tasks contract. `npx tsc --noEmit` stayed green throughout.
> Build/verification notes live in `memory/project_goal_detail_redesign.md`.

## Goal of the initiative

Optimize the goal-detail system into a **sustainable, clog-proof pipeline**: one
scheduling engine, a simpler Milestones surface, and reusable calendar rendering.
No parallel/duplicate machinery.

## Locked decisions (from session 2026-09-18)

| # | Decision | Choice |
|---|----------|--------|
| D1 | Reminders modeling | **Reminder = a Task preset** (binary + weekly M–S + no target), reusing `task_schedules`/`task_occurrences`. No second scheduling engine. |
| D2 | `binary` completion mode | **Kept in schema.** It is now the Reminder flavor's mode. Regular Tasks default to the counter; the mode toggle moves into "More options." **Milestones lose check-off/prep entirely.** |
| D3 | Deadline calendar scope | **Cross-goal aggregate** — all milestone + task/reminder due dates across the user's goals, via a server aggregator. |
| D4 | Existing `kind:'prep'` milestone rows | **Deleted** (migration scoped strictly to `kind = 'prep'`, nothing else). |
| D5 | Reminder surfacing in Tasks UI | **"+ Add" preset only** — a "Reminder" option in the add-Task flow that presets binary + weekly M–S. No separate lane; post-creation a Reminder is just a binary weekly Task. |

## The model after this initiative

**Tasks** is the single home for recurring work:

|              | **Task** (default)                | **Reminder** (add-preset)     |
|--------------|-----------------------------------|-------------------------------|
| Completion   | `quantity` (counter, default)     | `binary` ("Check off")        |
| Schedule     | Once / Daily / **M–S set-days**   | **Weekly M–S**                |
| Target       | in "More options" (target+calendar)| none                          |
| Example      | "Read 30 pages"                   | "Run without music"           |

**Milestones** become purely one-time achievements (`completedAt` evidence only).
The Prep zone is removed from `MilestonesPanel`. No check-off/prep checklist.

**Deadline calendar** — new, cross-goal aggregate. Cells darken by *count of
deadlines due that day* (future-facing), distinct from the green engagement
heatmap (past-facing). Weekly default + Month toggle, hover stats. Surfaced when
picking an end date for a goal/milestone/task.

## Conflicts resolved

- **Binary is NOT removed** (would have broken the CLAUDE.md Tasks contract, legacy
  tracker imports, AI goal-creation, and reminders themselves). It is retained and
  repurposed as the Reminder mode. UI-only default change. (D2)
- **No second scheduler.** Reminders reuse the existing Task schedule engine. (D1)
- **The M–S dot selector already exists** as the Tasks "On set days" cadence
  (`TASK_WEEKDAYS`) — we promote/reuse it, we do not build a new one.
- **Two calendars, one engine.** The `GoalActivityPanel` grid primitives
  (`DayCell` / `WeekView` / `MonthView` / tooltip) get extracted into a shared
  calendar component; engagement (green) and deadlines (amber) are two data +
  color configs of it, never a copy-paste.

## Phased build plan (each phase ends tsc-green + verified)

**Phase 0 — Design sign-off.** This doc. No code.

**Phase 1 — Milestones simplification + `⋯` overflow.**
- Remove the Prep zone from `MilestonesPanel`; milestones = one-time only.
- Replace the `✎`/`⌫` row buttons with a single `⋯` overflow menu (Edit / Delete).
- Migration: delete `milestones WHERE kind = 'prep'` (scoped, reversible-by-restore
  only). Confirm `kind` enum handling; keep `achievement`.

**Phase 2 — Tasks form: counter-default + Reminder preset.**
- Default new Tasks to `quantity`; move the completion-mode toggle into "More
  options" alongside target + deadline (mirror milestone builder).
- Add a "Reminder" quick-add preset (binary + weekly M–S, no target). (D5)
- Promote the M–S set-days selector as the primary schedule control.
- Same `⋯` overflow on Task rows.

**Phase 3 — Deadline aggregator (server).**
- New endpoint (pattern of `/api/home/summary`) returning cross-goal deadline
  density: `{ date → count, byKind }` from milestone `dueDate` + task/reminder
  schedule `endDate`/`dueDate`. `lib/db/` service, SWR-cached hook.

**Phase 4 — Shared calendar primitive + Deadline calendar UI.**
- Extract grid primitives from `GoalActivityPanel` into a reusable component.
- Render the deadline calendar (amber ramp) fed by the Phase 3 aggregator.
- Wire it into end-date pickers (goal / milestone / task) as the density-aware
  date picker.

## Open items to confirm during build
- Exact amber/warm ramp tokens (must live in `constants/colors.ts` + tailwind mirror).
- Whether the deadline calendar also gets a standalone panel slot or lives only in
  date-pickers (D3 says surfaced at end-date selection; a panel is optional).
- `⋯` menu: popover vs. action sheet on native.
