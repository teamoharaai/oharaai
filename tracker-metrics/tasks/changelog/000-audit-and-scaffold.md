# Session 000 — Tasks initiative: audit + scaffold

- **Date:** 2026-09-15
- **Task(s):** T0 (audit + scaffold)
- **Agent/model:** Opus 4.8, high effort
- **tsc baseline (before):** clean (exit 0) — no product code touched

## Goal of this session

Audit the teammate's Tasks taxonomy against the tracker-metrics sessions 3–10
work (now archived) to decide what can be pushed / modified / discarded, root-
cause the user's three reported issues, and scaffold a nested `tracker-metrics/
tasks/` initiative folder following the parent protocol.

## Changes

- No product/source code changed. Created the `tracker-metrics/tasks/` doc set:
  `README.md`, `PLAN.md` (draft), `MEMORY.md`, `DECISIONS.md` (TD-001..TD-003),
  `OUTSTANDING.md`, `changelog/TEMPLATE.md`, this changelog, and
  `audits/000-tasks-system-audit.md` (the substantive audit).

## Findings (see audit 000 for detail)

- **Live DB cut over** to Tasks (migrations 047–051 applied; `schema_migrations`
  at 051). Legacy `trackers`/`tracker_logs` readable but writes revoked from
  `authenticated` → Metrics write paths dead in prod; Tasks is canonical.
- **Concept map:** Metrics counter → Task `completion_mode: quantity`;
  habit/checklist → `binary`; `tracker_logs` → materialized status-bearing
  `task_occurrences`; daily/weekly schedules only (**no monthly**).
- **Issue A (Upcoming spam):** `reconcile_task_occurrences_v1` pre-materializes a
  28-day horizon; `buildTaskSections` + `TasksPanel` render one row per future
  occurrence → the same task repeats ~28×. UI/sectioning fix (collapse per task).
- **Issue B (7-dot history gone):** never ported; `TaskRow` shows only current
  status. Salvage from archived `tracker-display.ts`, re-point onto occurrences,
  re-conceive as cross-feature day-activity.
- **Issue C (counter rename):** intended (`quantity` mode); mechanics fine, only
  the history visual regressed.
- **Salvage verdict:** optimism + boundary-refresh already PORTED & PUSHED
  (`feat/port-tracker-optimism-boundary`); 7-dot visual = PORT-with-modification;
  grouping = concept reuse for the Upcoming fix; pagination = keep low-priority;
  derivation/mutations/routes/due-today/phase-summary/cards = DISCARD (frozen
  tables / superseded by TasksPanel).

## Tests

- None added (docs/audit only). `npx tsc --noEmit` unaffected (clean baseline).

## Decisions made

- **TD-001** (accepted): run Tasks salvage as a nested initiative under
  `tracker-metrics/tasks/` with a `TD-NNN` namespace; parent initiative stays
  closed, archive branch is the salvage source.
- **TD-002** (proposed): Upcoming collapses to one row per task.
- **TD-003** (proposed): 7-dot visual → cross-feature "goal activity", built
  occurrences-first (Phase 1) then generalized (Phase 3).

## Follow-ups / handoff

- **Next action:** settle `PLAN.md` open questions with the user (activity-dot
  data model; monthly; coordination; placement), then build T2 (Upcoming
  collapse) → T3 Phase 1 (activity dots from occurrences).
- Decide the PR/merge path for the already-pushed T1 port into the teammate's
  slice (L2/L3 coordination).
