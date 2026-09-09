# Tracker Metrics — Working Directory

This folder is the single home for the tracker-metrics initiative: the plan, the
compounding cross-session context, and all documentation an agent needs to
resume work with full context.

## What Ohara Is (the goal of this work)

Trackers currently never reset on cadence, hold completion in local React state,
and render habit history from a scalar instead of calendar evidence. This
initiative makes `tracker_logs` the canonical source of truth for period
progress, completion, and history, evaluated in the user's IANA timezone. See
`PLAN.md` for the full, settled design.

## Files

| File | Purpose |
|---|---|
| `PLAN.md` | Source-of-truth implementation plan (Tasks 0–10). Do not silently edit its settled decisions; record deviations in `DECISIONS.md`. |
| `MEMORY.md` | Compounding facts that survive across sessions — repo realities, gotchas, confirmed state. Read this first every session. |
| `DECISIONS.md` | Dated decision log (ADR-style). Every deviation from `PLAN.md` or new judgment call goes here. |
| `OUTSTANDING.md` | Live task board: per-task status, blockers, and next actions. |
| `changelog/` | One file per work session. Append-only history of what changed and why. |
| `audits/` | Point-in-time verification reports (tsc, tests, live-DB checks, security). |

## Session protocol (every agent, every session)

1. **Read** `MEMORY.md`, then `OUTSTANDING.md`, then the section of `PLAN.md` for
   the active task. Also read root `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`.
2. **Baseline**: run `npx tsc --noEmit` and record clean/dirty in the session
   changelog.
3. **Work** the active task only (respect the atomicity rules in `PLAN.md`:
   Tasks 3+4 are one change; Tasks 5→6 land back-to-back).
4. **Test**: add/update task tests; run `npx tsc --noEmit` + the relevant test
   commands after editing.
5. **Document, in this order**:
   - Create/append `changelog/NNN-<slug>.md` (what changed, why, files, test
     results).
   - Update `OUTSTANDING.md` (move the task's status, add follow-ups/blockers).
   - Add any new judgment calls to `DECISIONS.md`.
   - Add durable facts/gotchas to `MEMORY.md`.
   - Record verification runs in `audits/` when a task has an acceptance gate.
   - Also update root `CHANGELOGCODEX.md` (the repo-wide log the plan requires).
6. **Handoff**: leave `OUTSTANDING.md` accurate enough that the next cold agent
   knows the exact next action.

## Current status (as of session 002)

**Tasks 0–1 complete.** Preflight review + full live-DB audit done (sessions
000–001). Task 1 shipped the shared timezone-aware cadence utilities
(`lib/time/zoned-calendar.ts`, `lib/goals/tracker-cadence.ts` + 13 tests; tsc
clean; Momentum 64/64 unchanged). **Next: Task 2** — `046` index migration (NOT
044/045, both taken). See `changelog/002-task1-cadence-utilities.md`.
