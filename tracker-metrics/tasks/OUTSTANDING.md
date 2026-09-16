# Tasks Initiative — Outstanding / Task Board

Live status. Update at the end of each session. The next cold agent should read
this + `MEMORY.md` and know the exact next action.

Legend: ☐ not started · ◐ in progress · ☑ done · ⚠ blocked · ❓ needs user input

## Next action

**T1+T2+T3 are on PR #21 (→ main), awaiting sign-off (session 004).** Reviewed
PR opened per TD-005: https://github.com/teamoharaai/oharaai/pull/21 (branch
`feat/port-tracker-optimism-boundary` @ `435b92e`). tsc clean; test:tasks 47/47.
**MERGE IS GATED** on (a) teammate sign-off on the `features/tasks` slice + the
L1 output shape and (b) the user's explicit go-ahead. The user may trigger
`/code-review ultra 21` for the billed deep pass. TD-011 records the commit
grouping. After merge → **T4 (union + heatmap)**.

**T3 (L1 goal-activity, occurrences-only + 7-day row) is built (session 003).**
New `lib/activity/goal-activity.ts` (pure `buildActivityWindow`, node-tested),
`lib/db/goal-activity.ts` reader (Phase B `task_completed`), `types/activity.ts`
extended with `task_completed`, `GoalActivityRow` mounted in `GoalAnalyticsCard`
under "LAST 7 DAYS" via `useGoalActivityWindow` + `/api/goals/activity-window`.
tsc clean; `test:tasks` 47/47. **TD-010:** the design's `AnalyticsPanel`/
`IntelligencePanel` anchors are unmounted → row landed in the live
`GoalAnalyticsCard`; panel-reordering deferred.

Next: **T4 — L1 cross-feature union + heatmap** (TD-006 Phase C). Add reader
sources `entry_created` (goal-linked Entries via `echo_entry_links`) +
`milestone_completed` (`milestones.completed_at`), generalizing
`features/goals/dashboard-goal-activity.ts` into `lib/`; multi-emblem row +
GitHub-style heatmap over the same L1 output.

T2 (session 002) + T3 (session 003) both sit on
`feat/port-tracker-optimism-boundary` awaiting a reviewed PR + teammate sign-off
(TD-005). Sessions 000/001 were audit + design only.

## Task board

| # | Task | Status | Notes |
|---|---|---|---|
| T0 | Audit Tasks vs. salvage; scaffold docs | ☑ | Session 000. `audits/000`. |
| T0.1 | Settle design (Intelligence/Vaults review, resolve §5) | ☑ | Session 001. `design/001`, `design/002`, TD-002/004–009. |
| T1 | Optimism + boundary-refresh port | ☑ (PR #21) | On `feat/port-tracker-optimism-boundary` (`0317484`). PR #21 → main, sign-off pending (TD-005). tsc clean; test:tasks 32/32. |
| T2 | Upcoming collapse (one row per task) | ☑ (PR #21) | Session 002, committed `0179197`. `changelog/002`. TD-002. tsc clean; test:tasks 38/38. PR #21 → main; teammate sign-off pending (TD-005). |
| T3 | L1 goal-activity, occurrences-only + 7-day row | ☑ (PR #21) | Session 003, committed `0034a5b`. `changelog/003`. TD-006 + TD-010. `lib/activity/goal-activity.ts` (pure, node-tested) + `lib/db/goal-activity.ts` + `GoalActivityRow` in `GoalAnalyticsCard` + `/api/goals/activity-window` + `useGoalActivityWindow`. tsc clean; test:tasks 47/47. PR #21 → main; sign-off pending (TD-005). |
| T4 | L1 cross-feature union + heatmap | ☐ | TD-006 Phase C. Add `entry_created` + `milestone_completed`; multi-emblem row + heatmap. |
| T5 | Pagination helper (if needed) | ☐ | Low priority. Only if activity/occurrence reads exceed the row ceiling. |
| — | L2 correlation seam | ⏸ OFF | TD-007. Design seam only; recap pipeline (teammate) owns it. Do not build. |
| — | Initiative #2: Vaults↔Notes↔Intelligence | ⏸ separate | TD-008. `design/002`. Hand to Entries owner; consumes L1. Not built here. |

## Resolved questions (audit 000 §5)

- ☑ Activity data model → L1 pure fn in `lib/`, source-agnostic union, occurrences
  first (Phase B) then union (Phase C); profile-timezone bucketing (TD-006).
- ☑ Monthly cadence → daily/weekly only, no server change (TD-004).
- ☑ Coordination → design sign-off → reviewed PRs (TD-005).
- ☑ Placement → 7-day row + heatmap on goal Analytics surface; `IntelligencePanel`
  beneath `AnalyticsPanel` (TD-006).
- ☑ (added) iOS reminders + iOS-contract scope → dropped (TD-009).
- ☑ (added) Vaults/Notes/Intelligence → Vault-as-corpus, insight item (ii),
  split to initiative #2 (TD-008).

## Salvage source

- **`feat/tracker-metrics-archive`** (`bbd5c6c`) — Tasks 3–10, incl.
  `features/goals/tracker-display.ts` (7-dot render source), `tracker-optimism.ts`,
  `tracker-boundary.ts`, `paginate.ts`, Task 10 suite.
