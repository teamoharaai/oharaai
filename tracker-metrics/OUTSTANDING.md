# Tracker Metrics — Outstanding / Task Board

Live status of every plan task. Update at the end of each session. The next cold
agent should be able to read only this file (plus `MEMORY.md`) and know the
exact next action.

Legend: ☐ not started · ◐ in progress · ☑ done · ⚠ blocked

## Next action

**Initiative COMPLETE (Tasks 0–10 all done).** Task 10 (release gate) closed in
session 010: `test:tracker-metrics` script added; full automated matrix green
(`tsc` clean, tracker-metrics 116/116, momentum 64/64, goals 64/64,
ios-contract 4/4, >1000-log fixture proven); `current_value` audit done (no
period UI reads the scalar); deletion findings re-confirmed; manual matrix
mapped to automated coverage; **ship call: SHIP (see below)**. New decision
**D-012**. Nothing blocks release. No commit yet (awaiting go-ahead; target
branch `main`). See `changelog/010-*`.

Only optional post-initiative cleanups remain (not blockers) — see Open items.

## Task status

| # | Task | Status | Notes |
|---|---|---|---|
| 0 | Contract & data preflight | ☑ | Done sessions 000–001. Plan reconciled to repo + **live DB audited** (`audits/001-preflight-audit.md`). All schema/index/RLS/consumer-trace items resolved. Null-frequency inventory done (36 null / 29 weekly / 4 daily / 0 monthly). GO for Task 1. |
| 1 | Shared tz-aware cadence utilities | ☑ | Done session 002. `lib/time/zoned-calendar.ts` (extracted + cached formatters), `lib/goals/tracker-cadence.ts` + 13 tests. Momentum re-exports primitives (64/64 unchanged). tsc clean. See `changelog/002-*`. |
| 2 | Period-query index migration | ☑ | Done session 003. `046_tracker_logs_period_index.sql` created + applied live; compound covering index `tracker_logs_tracker_id_logged_at_idx` verified via `pg_indexes`, redundant `idx_tracker_logs_tracker_id` dropped, `schema_migrations` 046 row inserted (D-003). EXPLAIN seq-scans at 37 rows (expected). tsc clean. See `audits/002-*` + `changelog/003-*`. |
| 3+4 | Tracker contract + period derivation | ☑ | Done session 004. `TrackerPeriodBucket`/`TrackerPeriodState`/`Tracker.periodState` in types; `currentValue` removed from `TrackerUpdates` (D-007); `lib/goals/tracker-period.ts` pure derivation (+20 tests); `lib/db/paginate.ts` helper (+5 tests, incl. >1000-log sum); `hydrateGoalTrackers`/`fetchHydratedGoalDetail` frequency-batched ≤3-parallel paginated read; `useGoalDetail` always hydrates the selected goal only. tsc clean; momentum 64/64. See `changelog/004-*`. |
| 5 | Auth logging/uncomplete + legacy fixes | ☑ | Done session 005. Shared `mutateTrackerLog` core (`lib/db/tracker-mutations.ts`) behind an injected `TrackerMutationDb` port + adapter/`logTrackerMutation` in `goals.ts`; single actioned route `app/api/trackers/log`; `completeTracker` delegates + returns `{success,periodState}`; `current_value` write removed; null-cadence rejected; complete idempotent; uncomplete deletes-all; counter `+1` restored via `onLogCounter`; clone phase-summary + ExtendGoalModal log-derived (D-008). +19 tests; tsc clean; momentum 64/64. See `changelog/005-*`. |
| 6 | Goal-detail state + optimistic mutations | ☑ | Done session 006. Deleted `completedTrackerIds` (completion now DB-derived via `periodState?.isCompleted`); complete/counter/uncomplete all on `/api/trackers/log` + reconcile `periodStateFromDto`; per-tracker in-flight + latest-mutation ordering guards with rollback-if-latest; functional `patchTracker` store action; `useTrackerBoundaryRefresh` (timer + RN foreground + web visibility/focus); `onSaveTracker` rederives on frequency/target change. Legacy route retirement deferred to Task 9 (D-009 — dashboard still uses it). +24 tests; tsc clean; momentum 64/64. See `changelog/006-*`. |
| 7 | Ongoing/Completed grouping | ☑ | Done session 007. Pure `partitionTrackersByCompletion`/`isTrackerCompleted` in `features/goals/tracker-grouping.ts`; `TrackersPanel` splits Ongoing/Completed off `periodState?.isCompleted` in a `useMemo([trackers])`, null-cadence stays Ongoing, headers only when non-empty (accessible), `sortOrder` preserved per section, cards keyed by id survive group moves. +10 tests; tsc clean; goals 43/43; momentum 64/64. No new decision. See `changelog/007-*`. |
| 8 | Tracker card + habit-history rewrite | ☑ | Done session 008. Pure `features/goals/tracker-display.ts` (progress clamp, seven `recentPeriods` buckets oldest→newest current-last, a11y date/week/month labels) drives `TrackerCard` DISPLAY off `periodState` — counter value/progress, checklist checked/strike from `isCompleted`, habit dots from buckets (null → seven empty placeholders). Removed `displayValue` local state. Accessible checkbox toggle (`accessibilityRole="checkbox"`, checked) logs + calls `onUncompleteTracker`, threaded hook→`TrackersPanel`→`TrackerCard`. Dead `TrackerList` + its `Tracker` import removed from `GoalsWorkspace`. +15 tests (9 pure + 6 text-level); tsc clean; goals 58/58; momentum 64/64. New decision **D-010**. See `changelog/008-*`. |
| 9 | Dashboard daily-state alignment | ☑ | Done session 009. New pure `lib/goals/due-today.ts` (`deriveDueTodayState` — tz-aware daily window + log-derived completion + `periodEndExclusive`); `due-today+api.ts` reads `profiles.timezone`, queries only today's window (paginated), returns `currentPeriodValue`/`isCompletedThisPeriod`/`periodEndExclusive` (dropped `currentValue`/`lastCompletedAt`); `dashboard.tsx` `DueTodayZone` on shared `/api/trackers/log` (counter→`counter-log`, else `complete`), reconciles `periodState`, refreshes at local midnight via `useTrackerBoundaryRefresh`. Legacy `complete-tracker` route + `completeTracker` wrapper **deleted** (D-009 met); core/adapter kept. +14 tests (8 pure + 6 text-level); tsc clean; goals+lib 129/129; momentum 64/64. New decision **D-011**. See `changelog/009-*`. |
| 10 | Automated + manual verification | ☑ | Done session 010. `test:tracker-metrics` script added (12 files); matrix green — `tsc` clean, tracker-metrics 116/116, momentum 64/64, goals 64/64, ios-contract 4/4; >1000-log fixture proves full sum/history. `current_value` audit: no period UI reads the scalar; only accepted `HomeGoalPreview` label read + dead `updateTrackerValue` + insert defaults remain (D-012). Deletion findings re-confirmed. Manual matrix mapped to automated coverage. **SHIP.** See `changelog/010-*`. |

## Open items / follow-ups

- [x] ~~Inventory live null-frequency rows~~ → done in audit 001: **36 null**,
      29 weekly, 4 daily, **0 monthly**. See risk #2/#3 below.
- [x] ~~Confirm exact name of redundant index~~ → `idx_tracker_logs_tracker_id`
      (plain btree on `tracker_id`), confirmed in audit 001.
- [x] ~~**Task 2 must insert the `schema_migrations` row after applying 046.**~~
      → done session 003: `046` row inserted and re-queried; live history now
      tops at `046` (with the known `045` gap still owned by Entries). (D-003)
- [ ] **Prod has 0 monthly trackers and only 37 total logs** → Task 8 monthly
      buckets still have NO prod coverage; prove via fixtures/tests only.
      (Task 3+4 >1000-log pagination is now fixture-covered in
      `lib/db/paginate.test.ts`, and monthly derivation in
      `lib/goals/tracker-period.test.ts`.)
- [ ] **36 of 69 trackers have null cadence** → Task 5 rejection copy is friendly
      ("Set a daily, weekly, or monthly cadence before logging progress.", `422`);
      still verify Task 7's "cadence not set" affordance is not a dead-end.
- [x] ~~Task 5 DTO change breaks the client contract~~ → made **additive**:
      responses are `{success:true, periodState}`, so `onCompleteTracker`'s
      `success`-only assertion keeps working untouched. Task 6 consumes
      `periodState` and drops the `success` check (D-008).
- [x] ~~**Task 9 must delete the legacy route** `app/api/goals/complete-tracker`
      + the `completeTracker` wrapper in `lib/db/goals.ts`~~ → done session 009:
      dashboard migrated onto `/api/trackers/log`, both deleted, shared
      `logTrackerMutation`/adapter kept (D-009 condition met). `rg` confirms zero
      remaining references and a test asserts the files are gone.
- [x] ~~**Task 10 current_value audit:** `HomeGoalPreview` in `dashboard.tsx`
      still reads `tracker.currentValue` on the goal-LIST path (`nextTracker`
      selection)~~ → done session 010: verdict **keep-with-justification**
      (legacy-safe read outside period UI, on the un-hydrated list path; label
      picker only). Full audit table in `changelog/010-*`. See **D-012**.
- [ ] **Optional post-initiative cleanup (not a blocker):** remove the dead
      `updateTrackerValue` store action (`features/goals/store.ts:53` — zero
      callers, still writes the legacy scalar). Deferred out of the release gate
      per D-012.
- [ ] **Optional post-initiative cleanup (needs separate schema approval):** once
      `trackers.current_value` is dropped, remove `Tracker.currentValue` + its
      `goal-service` hydration and give `HomeGoalPreview` a hydrated/derived
      tracker selection. Tracked in "Deferred" (dropping the column).
- [ ] **Manual matrix live column** — every settled semantic is automated; the
      UI-wiring / SQL-backdate / device-tz / real-DST cases need a live
      authed environment or the user (not app-drivable headless here). See the
      coverage map in `changelog/010-*`.
- [x] ~~**Task 8 wires `onUncompleteTracker`**~~ → done session 008: accessible
      checkbox toggle in `TrackerCard` (logs when unchecked, calls
      `onUncompleteTracker` when checked), threaded hook→`TrackersPanel`→
      `TrackerCard`. Counter/checklist/habit display + completion now all read
      `periodState` (legacy scalar retired from the card). See D-010.
- [ ] Info-only (out of scope): raise the live `045` migration-tracking gap to
      the Entries owner. `045` is idempotent so it is not a tracker-metrics
      blocker.
- [ ] Push the local unpushed commit `af20780`? (User has not asked; do not push
      without instruction.)

## Deferred (explicitly out of scope — see PLAN.md "Deferred follow-ups")

- SQL/RPC aggregation of period buckets · persistent period key / idempotency
  key · counter decrement UI · dropping `trackers.current_value` · tracker
  analytics/telemetry.
