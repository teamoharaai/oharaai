# Tasks Initiative — Plan (SETTLED 2026-09-16)

> **Status: SETTLED.** The open questions (audit 000 §5) were resolved with the
> user on 2026-09-16 and recorded as TD-002, TD-004…TD-009. The activity visual
> is designed in `design/001-activity-and-upcoming.md`; the Vaults↔Notes↔
> Intelligence work is split out as initiative #2 (`design/002-…`). Record any
> deviation as a new `TD-NNN`.

## Objective

Salvage the valuable UX from tracker-metrics sessions 3–10 onto the canonical
**Tasks** taxonomy, and close the regressions Tasks introduced vs. Metrics —
without touching the frozen legacy tables or fighting the teammate's server
model. Reframe the "7-dot" visual as a **goal-activity (L1) signal** that renders
as a weekday emblem row + heatmap and is stable enough to feed the teammate's
future weekly-recap pipeline. Preserve, don't rebuild.

## Scope split (TD-008)

- **Initiative #1 (this plan):** Upcoming collapse + L0/L1 goal-activity + its
  render on the goal Analytics surface. Touches `features/tasks/*`, a shared
  `lib/` reader, and the goal-detail panels.
- **Initiative #2 (separate, `design/002`):** Vaults↔Notes↔Intelligence corpus.
  Needs the Entries owner; consumes the same L1 signal; **not built here.**

## Guardrails

- Tasks server model (047–051) is canonical; **no writes to `trackers`/
  `tracker_logs`** (frozen). All task writes go through existing RPCs /
  `features/tasks/services`.
- `features/tasks/` is the teammate's slice → **design sign-off, then reviewed
  PRs** (TD-005). No unilateral edits ahead of sign-off.
- No cross-feature imports (`features/CLAUDE.md`); the activity union lives in
  `lib/`. Components receive data as props.
- `npx tsc --noEmit` clean before/after; node `--test` coverage under
  `test:tasks`; test-reachable modules use relative imports + `import type`
  (D-004).

## Phases

### Phase 0 — Audit & scaffold ☑
`audits/000-tasks-system-audit.md` + this doc set. Done session 000. Design
settled session 001 (this session): `design/001`, `design/002`, TD-002/004–009.

### Phase A — Upcoming collapse (T2) · low-risk, ships first
Per `design/001` Part A. Pure `buildTaskSections` de-dupe (one row per task,
earliest future occurrence) + `TasksPanel` schedule-summary render + unit tests.
**Acceptance:** creating a daily task shows exactly one Upcoming row; today/
missed/anytime/completed unchanged.

### Phase B — Goal-activity L1, occurrences-only (T3) · the headline visual
Per `design/001` Part B. Pure `lib/activity/goal-activity.ts`
(`buildActivityWindow`) + `lib/db/goal-activity.ts` reader (source:
`task_completed`, bucketed by `profiles.timezone` via `lib/time/zoned-calendar`).
Render the 7-day weekday emblem row on the goal Analytics surface;
`IntelligencePanel` positioned beneath `AnalyticsPanel`.
**Acceptance:** a goal with recent task completions shows filled emblems on the
right local days; empty → seven hollow cells; pure fn node-tested.

### Phase C — Cross-feature union + heatmap (T4)
Extend the reader to `entry_created` (goal-linked Entries) + `milestone_completed`
(`milestones.completed_at`), generalizing `dashboard-goal-activity.ts` into
`lib/`. Multi-emblem row + GitHub-style heatmap (same L1 output, longer window).
**Acceptance:** a day with an Entry shows the Echo emblem; a day with a completed
milestone shows the milestone emblem; heatmap intensity tracks `count`.

### L2 seam — designed, OFF (TD-007)
`buildActivityWindow` output is the stable input for the weekly-recap pipeline.
**No** summarization, **no** `character_profile` writes, no flag. Owned by the
recap initiative.

### Phase D — Loose ends (T5)
Port `lib/db/paginate.ts` only if occurrence/activity reads can exceed the API
row ceiling. Low priority.

## Not in scope

- Reviving `trackers`/`tracker_logs` writes or Metrics routes/derivation.
- Monthly cadence (TD-004) unless specified later as a server proposal.
- Server RPC/schema changes (coordinate with the teammate if one becomes
  necessary — e.g. an activity index).
- Initiative #2 (Vaults↔Notes↔Intelligence, TD-008).
- iOS contract / reminders (TD-009).

## Build order & the one hard dependency

**T2 (Upcoming collapse) → T3 (L1 occurrences + row) → T4 (union + heatmap).**
T1 (optimism + boundary-refresh, already pushed on
`feat/port-tracker-optimism-boundary`) merges via PR + review (TD-005). The only
cross-initiative dependency: **initiative #2 is blocked until L1 emits its stable,
documented shape** (Phase B) — so land L1 cleanly first.

## Acceptance (initiative #1)

- Upcoming shows one row per task.
- The goal-activity visual is live (Phase B), with the union + heatmap (Phase C)
  and a documented, OFF L2 seam.
- T1 merged via the agreed path.
- tsc clean; `test:tasks` green; `CHANGELOGCODEX.md` has an entry per code task.
