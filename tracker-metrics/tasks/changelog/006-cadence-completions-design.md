# Session 006 — Tasks UX optimization: design settlement (cadence, Completions, Roll, Weekly)

- **Date:** 2026-09-16
- **Task(s):** opens the **UX optimization phase** of Initiative #1 (new tasks P1–P4).
- **Agent/model:** Opus 4.8.
- **tsc baseline (before):** not run — **design-only session, no code changed.**

## Goal of this session

Digest the whole Tasks feature with the user and settle a scalable model that
fixes (a) daily tasks spamming Upcoming, (b) the "One time" vs "Daily" vs "Custom"
overlap, (c) the missing Today/Weekly planning surface, and resolve the user's
"rolling becomes a counter" conflict — with **zero ambiguity** before any code.

## What was decided (full trail)

Two-axis model is the spine: **Cadence** (Completion → On-set-days → Daily) ×
**Measure** (Check-off | Quantity). From it:

- **Daily-spam fix is a rule, not a hack:** Daily never enters Upcoming
  (`buildTaskSections`). Upcoming = On-set-days next occurrences + rolled
  Completions only.
- **Counter conflict resolved:** Streak (derived cadence history) vs Quantity
  (explicit per-occurrence amount) are orthogonal and never merge. Rolling builds a
  streak, stays binary.
- **Roll** = Completion-only; inserts a pending future occurrence. **Needs schema**
  (new RPC + `source='rolled'`).
- **Promotion loop:** 3-day rolled streak → offer Daily, with a **Skip that is
  counted** (behavioral signal; TD-007 seam stays OFF). **Needs schema**
  (skip-count persistence).
- **Completions** absorb the retroactive Log-completed flow (reuse
  `log_completed_task_v1`).
- **View home:** per-goal `TasksPanel` with Today + Week grid (no new route).
- **Polish:** drop Optional Due Date; placeholders `"20"→"Quantity"`,
  `"pages"→"Units"`; recurrence chips relabel to `Once / Daily / On set days`.
- **Category starter chips:** static, 2-3 per `GoalCategory`, one-tap prefill on
  the empty state; full template system rejected.
- **AI suggestions (Appendix A, EXPLORATORY, not canon):** ① cold-start starter
  set from `GoalSmartData`; ② warm-loop custom-cadence suggestions from the L1
  activity signal (the AI generalization of the promotion loop). Recorded for
  bookkeeping; no TDs; do not implement without a design pass.

## Changes (docs only)

- **`design/003-cadence-completions-roll.md`** — new; the full settled contract +
  ownership/cascade map + phasing + Appendix A.
- **`DECISIONS.md`** — added **TD-016 … TD-022** (prepended, newest-first).
- **`OUTSTANDING.md`** — added the UX-optimization task board (P1–P4) and set
  Phase 1 as the next action.
- **`changelog/006`** — this file.

## Tests

- None — no code changed. `tsc`/`test:tasks` unaffected.

## Decisions made

- **TD-016** two-axis model · **TD-017** streak≠quantity · **TD-018** Roll
  (Completion-only, needs schema) · **TD-019** promotion + skip-count (needs
  schema) · **TD-020** Completions absorb Log-completed · **TD-021** per-goal
  Today/Week + Daily∉Upcoming · **TD-022** static category chips.

## Follow-ups / handoff

- **Next action: implement Phase 1** (pure UI, no schema) in a new session — see
  OUTSTANDING "Next action". Route the TD-005 teammate sign-off before any PR
  (`features/tasks/*` is the teammate's slice).
- Phases 3–4 (Roll, promotion) are **blocked on CTO** (RPC + migrations); flag for
  scheduling.
- Appendix A (AI) is parked pending its own design pass.
- **Team document / bookkeeping:** this changelog + `design/003` + TD-016…022 are
  the running record of the process; assemble the team-facing writeup from them at
  initiative close.
