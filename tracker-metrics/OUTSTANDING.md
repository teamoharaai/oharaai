# Tracker Metrics — Outstanding / Task Board

Live status of every plan task. Update at the end of each session. The next cold
agent should be able to read only this file (plus `MEMORY.md`) and know the
exact next action.

Legend: ☐ not started · ◐ in progress · ☑ done · ⚠ blocked

## Next action

**Start Tasks 3+4** (tracker contract + period derivation — **atomic, land
together**). Tasks 0, 1, and 2 are complete; both of the 3+4 dependencies are
satisfied. Add `TrackerPeriodBucket`/`TrackerPeriodState`/`Tracker.periodState`
to `features/goals/types.ts`, remove `currentValue` from `TrackerUpdates`, add
the pure derivation function, and build the frequency-batched paginated hydrated
goal-detail read path (mirror `lib/db/friends.ts` pagination, order by
`logged_at` then `id`, `PAGE_SIZE=500`). Follow D-004 (relative imports) for any
test-reachable module.

## Task status

| # | Task | Status | Notes |
|---|---|---|---|
| 0 | Contract & data preflight | ☑ | Done sessions 000–001. Plan reconciled to repo + **live DB audited** (`audits/001-preflight-audit.md`). All schema/index/RLS/consumer-trace items resolved. Null-frequency inventory done (36 null / 29 weekly / 4 daily / 0 monthly). GO for Task 1. |
| 1 | Shared tz-aware cadence utilities | ☑ | Done session 002. `lib/time/zoned-calendar.ts` (extracted + cached formatters), `lib/goals/tracker-cadence.ts` + 13 tests. Momentum re-exports primitives (64/64 unchanged). tsc clean. See `changelog/002-*`. |
| 2 | Period-query index migration | ☑ | Done session 003. `046_tracker_logs_period_index.sql` created + applied live; compound covering index `tracker_logs_tracker_id_logged_at_idx` verified via `pg_indexes`, redundant `idx_tracker_logs_tracker_id` dropped, `schema_migrations` 046 row inserted (D-003). EXPLAIN seq-scans at 37 rows (expected). tsc clean. See `audits/002-*` + `changelog/003-*`. |
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
- [x] ~~**Task 2 must insert the `schema_migrations` row after applying 046.**~~
      → done session 003: `046` row inserted and re-queried; live history now
      tops at `046` (with the known `045` gap still owned by Entries). (D-003)
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
