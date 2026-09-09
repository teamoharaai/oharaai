# Tracker Metrics — Outstanding / Task Board

Live status of every plan task. Update at the end of each session. The next cold
agent should be able to read only this file (plus `MEMORY.md`) and know the
exact next action.

Legend: ☐ not started · ◐ in progress · ☑ done · ⚠ blocked

## Next action

**Start Task 2** (period-query index migration). Tasks 0 and 1 are complete.
Create `046_tracker_logs_period_index.sql` (NOT 044), apply via mgmt API with a
curl UA, **insert the `schema_migrations` row** (D-003), verify with `pg_indexes`
+ EXPLAIN. Then Tasks 3+4 (atomic) can begin — they depend on both 1 and 2.

## Task status

| # | Task | Status | Notes |
|---|---|---|---|
| 0 | Contract & data preflight | ☑ | Done sessions 000–001. Plan reconciled to repo + **live DB audited** (`audits/001-preflight-audit.md`). All schema/index/RLS/consumer-trace items resolved. Null-frequency inventory done (36 null / 29 weekly / 4 daily / 0 monthly). GO for Task 1. |
| 1 | Shared tz-aware cadence utilities | ☑ | Done session 002. `lib/time/zoned-calendar.ts` (extracted + cached formatters), `lib/goals/tracker-cadence.ts` + 13 tests. Momentum re-exports primitives (64/64 unchanged). tsc clean. See `changelog/002-*`. |
| 2 | Period-query index migration | ☐ | Create `046_tracker_logs_period_index.sql` (NOT 044). Re-verify next number first. Apply + verify live via mgmt API (curl UA). |
| 3+4 | Tracker contract + period derivation | ☐ | **Atomic** — land together. Adds `periodState` to types, pure derivation fn, hydrated goal-detail read path. |
| 5 | Auth logging/uncomplete + legacy fixes | ☐ | Refactor `completeTracker`; stop writing `current_value`; counter/habit/checklist logs; null-cadence rejection. |
| 6 | Goal-detail state + optimistic mutations | ☐ | Delete `completedTrackerIds`; add uncomplete/counter handlers; boundary refresh. Land back-to-back with Task 5. |
| 7 | Ongoing/Completed grouping | ☐ | `TrackersPanel.tsx` partition on `periodState?.isCompleted`. |
| 8 | Tracker card + habit-history rewrite | ☐ | 7-bucket history from `recentPeriods`; a11y toggle. Also confirm/remove dead `TrackerList` in GoalsWorkspace. |
| 9 | Dashboard daily-state alignment | ☐ | `due-today+api.ts` tz-aware daily window; return booleans not stale scalars. |
| 10 | Automated + manual verification | ☐ | Add `test:tracker-metrics` script; full matrix; release gate. |

## Open items / follow-ups

- [x] ~~Inventory live null-frequency rows~~ → done in audit 001: **36 null**,
      29 weekly, 4 daily, **0 monthly**. See risk #2/#3 below.
- [x] ~~Confirm exact name of redundant index~~ → `idx_tracker_logs_tracker_id`
      (plain btree on `tracker_id`), confirmed in audit 001.
- [ ] **Task 2 must insert the `schema_migrations` row after applying 046.**
      Live tracking is behind files: file `045` exists but live history tops at
      `044`. No CLI = the insert step gets missed. (D-003)
- [ ] **Prod has 0 monthly trackers and only 37 total logs** → Task 8 monthly
      buckets and Task 3+4 >1000-log pagination have NO prod coverage; prove via
      fixtures/tests only.
- [ ] **36 of 69 trackers have null cadence** → verify Task 5 rejection copy and
      Task 7 "cadence not set" affordance are friendly, not dead-ends.
- [ ] Task 5 DTO change (`{success:true}` → `periodState` DTO) breaks the client
      contract → Task 6 client update must land back-to-back (plan already
      sequences this).
- [ ] Info-only (out of scope): raise the live `045` migration-tracking gap to
      the Entries owner. `045` is idempotent so it is not a tracker-metrics
      blocker.
- [ ] Push the local unpushed commit `af20780`? (User has not asked; do not push
      without instruction.)

## Deferred (explicitly out of scope — see PLAN.md "Deferred follow-ups")

- SQL/RPC aggregation of period buckets · persistent period key / idempotency
  key · counter decrement UI · dropping `trackers.current_value` · tracker
  analytics/telemetry.
