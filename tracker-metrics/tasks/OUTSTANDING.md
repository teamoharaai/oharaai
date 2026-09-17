# Tasks Initiative — Outstanding / Task Board

Live status. Update at the end of each session. The next cold agent should read
this + `MEMORY.md` and know the exact next action.

Legend: ☐ not started · ◐ in progress · ☑ done · ⚠ blocked · ❓ needs user input

## Next action

**T4 MERGED to main (session 005).** PR #22 squash-merged as `a73ffde`; branch
`feat/goal-activity-union-heatmap` deleted. Phase C union + heatmap; L1 output
shape UNCHANGED. tsc clean + test:tasks **63/63** re-verified on `main`
post-merge. **TD-005 teammate sign-off (cond. a) was WAIVED on the user's explicit
go-ahead — NOT obtained (TD-015).** Cloud `/code-review ultra 22` could not start
(Claude GitHub App lacks repo access); pre-commit `/code-review high` stands.

**Initiative #1 is COMPLETE.** **T5** (server-side date-bounding the union reads)
remains conditional — only if the routine 70-day heatmap read approaches the row
ceiling (bound via `localDateToUtcStart(sinceLocalDate, tz).gte`).

Prior: **T1+T2+T3 MERGED to main (session 004).** PR #21 squash-merged as
`466b44a` after teammate sign-off + user go-ahead (TD-005); branch
`feat/port-tracker-optimism-boundary` deleted. PR:
https://github.com/teamoharaai/oharaai/pull/21. Sign-off notes in TD-012.

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

T1 (session ≤001) + T2 (session 002) + T3 (session 003) all shipped to main via
PR #21 (session 004). Sessions 000/001 were audit + design only.

## Task board

| # | Task | Status | Notes |
|---|---|---|---|
| T0 | Audit Tasks vs. salvage; scaffold docs | ☑ | Session 000. `audits/000`. |
| T0.1 | Settle design (Intelligence/Vaults review, resolve §5) | ☑ | Session 001. `design/001`, `design/002`, TD-002/004–009. |
| T1 | Optimism + boundary-refresh port | ☑ merged (#21) | `0317484` → main via PR #21 squash `466b44a` (session 004, TD-005 sign-off + go-ahead). tsc clean; test:tasks 32/32. |
| T2 | Upcoming collapse (one row per task) | ☑ merged (#21) | Session 002, committed `0179197` → main via PR #21 (`466b44a`). `changelog/002`. TD-002. tsc clean; test:tasks 38/38. |
| T3 | L1 goal-activity, occurrences-only + 7-day row | ☑ merged (#21) | Session 003, committed `0034a5b` → main via PR #21 (`466b44a`). `changelog/003`. TD-006 + TD-010. `lib/activity/goal-activity.ts` (pure, node-tested) + `lib/db/goal-activity.ts` + `GoalActivityRow` in `GoalAnalyticsCard` + `/api/goals/activity-window` + `useGoalActivityWindow`. tsc clean; test:tasks 47/47. |
| T4 | L1 cross-feature union + heatmap | ◐ built, PR open | Session 005, branch `feat/goal-activity-union-heatmap`. TD-006 Phase C + TD-013/TD-014. New pure `lib/activity/goal-activity-sources.ts` (union) + `activity-heatmap.ts`; reader `entry_created`+`milestone_completed`; multi-emblem `GoalActivityRow` + new `GoalActivityHeatmap` in `GoalAnalyticsCard`. L1 shape unchanged. tsc clean; test:tasks 63/63. `changelog/004`. Merge GATED (TD-005). |
| T5 | Pagination / date-bound helper (if needed) | ☐ | Low priority. Only if the union reads (now incl. the routine 70-day heatmap) exceed the row ceiling. Bound via `localDateToUtcStart(...).gte`. |
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
