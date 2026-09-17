# Session 007 — Tasks UX Phase 1 (cadence axis, Completions lane, Daily ∉ Upcoming)

- **Date:** 2026-09-16
- **Task(s):** P1 (UX optimization task board, design/003, TD-016…022)
- **Agent/model:** Opus 4.8, high effort
- **tsc baseline (before):** clean

## Goal of this session

Implement Phase 1 of design/003 — pure UI, no schema/RPC/migration. Two-axis
Cadence × Measure model, the `buildTaskSections` reclassify that is the real fix
for daily-Upcoming spam, the merged Completions lane, and the §6 polish.

## Changes

- **`features/tasks/types.ts`** — add `TaskCadence = 'none' | 'daily' | 'setdays'`
  (the honest cadence axis; `setdays` merges the retired Weekly + Custom chips).
- **`features/tasks/utils.ts`** — add `isDailyCadence(task)` (active schedule
  `recurrenceKind === 'daily'`); `buildTaskSections` now **skips Upcoming for
  daily-cadence tasks** (`… > today && !dailyCadence`). This is the TD-021 rule
  change, not a de-dupe; the TD-002 collapse stays as a safety net. Upcoming is now
  fed only by On-set-days next occurrences.
- **`features/tasks/components/TasksPanel.tsx`**
  - Recurrence chips → cadence axis via `CADENCE_CHIPS`: **Once** (no schedule →
    Completion/Anytime) · **Daily** · **On set days** (weekday picker). Dropped the
    `Every 2 weeks` top-level chip and the `custom` chip (folded into On set days).
    Field label `When` → `Cadence`.
  - Dropped the Optional Due Date input and the `none`-recurrence due-date path.
    Existing `intervalCount` (legacy every-2-weeks) and `dueDate` are **preserved**
    on save without a re-authoring input (TD-024, non-destructive).
  - Placeholders: `"20"` → `Quantity`, `"pages"` → `Units` in `TaskForm`; the log
    form's target/unit → `Quantity`/`Units`.
  - **Completions lane** (TD-020): the old `Anytime` section is relabeled
    **Completions** and is the single ad-hoc, day-anchored lane. The retroactive
    `+ Log completed` entry point moved from a separate top-of-panel action into
    the Completions lane header (still `log_completed_task_v1`, reused not rebuilt).
    Today/Upcoming render as their own lanes; empty lanes hidden.
  - **Add Task form copy (TD-025):** `Completion` and `Cadence` headers reviewed and
    **kept**; the optional milestone picker is collapsed behind a **"More options"**
    toggle, and within it the milestone list is a **second click-to-reveal**
    ("Link a milestone (optional)") scoped to **this goal's milestones only**. Both
    toggles auto-expand on edit when a milestone is already linked. No mechanics change.
- **`features/goals/components/GoalsWorkspace.tsx`** — no net change (a `category`
  prop was added then reverted with the chip removal).

## Descoped this session (TD-023)

Category starter chips (TD-022) were built, then **removed on user feedback** — the
surface read as a dead-end (bare titles, no skip, felt hardcoded). Deleted
`features/tasks/suggestions.ts`, the `TaskSuggestion` type, the `category` prop, and
the `TaskForm` prefill plumbing. Returns via its own design pass (see TD-023).

## Tests

- Added: `features/tasks/utils.test.ts` — daily-cadence task (active daily schedule)
  → **0 Upcoming rows**; on-set-days task (active weekly schedule) → **1**
  next-occurrence Upcoming row.
- Added: `features/tasks/architecture.test.ts` — cadence chips (Once/Daily/On set
  days, no "Every 2 weeks", no due-date input, Quantity/Units placeholders);
  Completions lane absorbs the Log-completed entry point.
- Commands run + result:
  - `npx tsc --noEmit` → **pass** (before and after)
  - `npm run test:tasks` → **66 passed / 0 failed**

## Verification

- The changed module compiled cleanly into the Expo RN-Web bundle
  (`expo start --web`, 1650 modules, no errors).
- Live GUI drive of the form was **not completed**: goal-detail `TasksPanel` sits
  behind Supabase auth and this session had no credentials / dev-auth bypass / seed
  to reach a goal-detail screen. tsc + the reclassify/architecture tests stand as
  the evidence for the logic and the rendered structure.

## Decisions made

- **TD-023** — category starter chips (TD-022) deferred out of Phase 1 (user
  feedback); TD-022's static-map call stands, only its Phase-1 shipment withdrawn.
- **TD-024** — cadence-form schedule migration is non-destructive (preserve
  `intervalCount` + `dueDate` on edit without a re-authoring input).
- **TD-025** — Add Task form copy: keep Completion/Cadence headers; collapse the
  milestone picker behind "More options" → a second "Link a milestone" reveal
  scoped to this goal.
- **TD-026** — P1 committed directly to `main` on user direction; TD-005 PR/sign-off
  flow waived for this landing (not pushed).

## Follow-ups / handoff

- **Next action:** route P1 to the `features/tasks` teammate for **TD-005 sign-off**,
  then open a PR against their slice. **Do not merge without user go-ahead.**
- P2 (Week grid + streak display) is the next pure-UI phase. P3/P4 (Roll, promotion)
  remain blocked on CTO schema/RPC.
- **New board item:** starter-chip surface redesign (TD-023) — enriched
  measure·cadence chips + Skip (session vs persisted), or AI per Appendix A.
