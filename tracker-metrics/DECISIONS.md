# Tracker Metrics — Decision Log

ADR-style. One entry per judgment call or deviation from `PLAN.md`. Newest at
top. Never rewrite history — supersede with a new entry.

Format: `D-NNN` · date · status (accepted | superseded | proposed) · context →
decision → consequence.

---

## D-012 · 2026-09-14 · accepted — Task 10 release gate: accept the `HomeGoalPreview` legacy read; defer dead `updateTrackerValue` cleanup

**Context:** Task 10's `current_value`/`currentValue` audit had to resolve two
non-derived references and decide keep-with-justification vs. clean up, under the
Task 10 ground rule that no product behavior changes unless the audit surfaces a
real bug:

1. **`app/(app)/dashboard.tsx:612`** — `HomeGoalPreview` picks a `nextTracker`
   (`goal.trackers.find(t => t.targetValue === null || t.currentValue < t.targetValue)`)
   to display *one tracker's title* as the "next up" label. This runs on the
   dashboard goal-**list** path, where trackers come from `goal-service` (which
   hydrates the legacy `Tracker.currentValue` from `current_value`) but
   `periodState` is **never** populated — hydration only happens for the selected
   goal in `useGoalDetail`. So `periodState` is unavailable here by construction.
2. **`features/goals/store.ts:53–61`** — the `updateTrackerValue` store action
   still writes `tracker.currentValue`, but `rg` confirms it has **zero callers**
   (interface + implementation only). It is dead code.

**Decision:**
- **Keep the `HomeGoalPreview` read, with justification.** It is a legacy-safe
  read *outside* period UI: it selects which title to show, never renders a
  period value or completion state. Because `current_value` is now frozen (Task 5
  stopped writing it), the heuristic is degraded — for post-Task-5 counters it
  tends to `0 < target` (picks the first) — but the outcome is only *which label
  appears*, which is harmless, not a correctness bug. Switching to the derived
  value would require hydrating `periodState` for the entire dashboard goal list
  (a real perf/product change), which is explicitly out of Task 10 scope.
- **Do not delete `updateTrackerValue` in Task 10.** It is dead and therefore
  legacy-safe (never executes). Removing it is a valid cleanup but is a
  product-source change the release gate does not require; record it as an
  optional post-initiative follow-up rather than mixing it into the gate.

**Consequence:** No tracker **period UI** reads `trackers.current_value`; the two
remaining non-derived references are documented and accepted. Two optional
post-initiative cleanups are recorded in `OUTSTANDING.md` (remove
`updateTrackerValue`; and, once the DB column is dropped under a separate approved
schema change, remove `Tracker.currentValue` + its hydration and give
`HomeGoalPreview` a hydrated/derived selection). Neither blocks the ship call.

---

## D-011 · 2026-09-11 · accepted — Dashboard due-today: action-by-type, one-way card, boundary-refresh reuse

**Context:** Task 9 migrates the dashboard due-today card off the legacy
`/api/goals/complete-tracker` route onto the shared `POST /api/trackers/log`.
Three decisions the plan left to implementation:

1. **The shared route rejects `complete` for counters** (`INVALID_ACTION` → 400,
   per D-008), yet due-today lists ALL daily trackers, counters included. Tapping
   a daily counter's checkbox must therefore do something valid.
2. Task 9's prompt notes "habit/checklist complete/uncomplete as applicable —
   check what the dashboard card actually needs." The dashboard checkbox has
   always been a one-way check-off (disabled once done); it has no undo gesture.
3. "Refresh the zone at `periodEndExclusive` and on focus/resume, consistent with
   goal detail." Goal detail uses `useTrackerBoundaryRefresh(trackers, refresh)`,
   which reads only `periodState.endExclusive`.

**Decision:**
- **Action by tracker type.** The card's tap maps `counter → 'counter-log'`
  (a `+1`) and `habit|checklist → 'complete'`. A counter accumulates and its
  checkbox stays tappable/enabled until the server-derived
  `isCompletedThisPeriod` (sum ≥ positive target) flips true; habit/checklist
  complete on the first tap. This satisfies "counter +1 below target does not
  mark complete" without a counter ever hitting the rejected `complete` action.
- **Keep the card one-way.** No uncomplete gesture is added to the dashboard.
  Uncomplete stays a goal-detail concern (the accessible checkbox toggle from
  Task 8); the dashboard remains a lightweight "check it off" surface. Completion
  is reconciled from the mutation response's `periodState.isCompleted`, not a
  client clock.
- **Reuse `useTrackerBoundaryRefresh`.** The dashboard builds minimal
  boundary-carrying stand-ins (`{ periodState: { endExclusive } }` cast to
  `Tracker`) from each item's `periodEndExclusive` and passes them to the same
  hook goal detail uses, so it refreshes at user-local midnight and on
  foreground/visibility/focus with no duplicated timer logic.

**Consequence:** The dashboard and goal detail now share one mutation route, one
completion-derivation path, and one boundary-refresh hook. The due-today API
returns log-derived booleans (`isCompletedThisPeriod`, `currentPeriodValue`,
`periodEndExclusive`) in the user's timezone instead of the stale
`currentValue`/`lastCompletedAt` scalars, so a device timezone differing from
`profiles.timezone` shows the correct daily state. The legacy route +
`completeTracker` wrapper are deleted (D-009 condition met); the shared
core/adapter remain.

---

## D-010 · 2026-09-11 · accepted — Card display is fully periodState-driven, incl. the null/unhydrated fallback

**Context:** Task 8 retires the interim legacy-scalar reads (D-007/D-008) and
drives DISPLAY off `tracker.periodState`. Two shapes have no period data, so a
fallback had to be chosen rather than falling back to the legacy `currentValue`
(which Task 8 explicitly stops reading): (a) null-cadence trackers
(`periodState === null` by derivation), and (b) the brief pre-hydration window
before goal-detail hydration lands (`periodState` is also `null`). The habit dot
row previously used `Math.round(targetValue)` for its dot count and the legacy
scalar for filled dots — both retired.

**Decision:** Display reads only `periodState`, with an explicit, honest empty
fallback:
- **Counter** current value = `periodState?.currentValue ?? 0`; progress =
  `counterProgressPercent(currentValue, targetValue)` (0–100 clamp, missing/zero
  target → denominator 1, non-finite → 0).
- **Checklist** checked/label/strike derive from `periodState?.isCompleted ??
  false` **only** — the old `|| displayValue >= target` fallback is gone.
- **Habit** renders exactly seven `recentPeriods` buckets (oldest→newest, current
  last, trusted from derivation, not re-sorted). When `periodState` is null the
  row **pads to seven empty placeholder dots** (unique negative keys, label "No
  history yet") rather than inventing history or reading the scalar.
- The habit/checklist one-tap control becomes an accessible **checkbox toggle**
  (`accessibilityRole="checkbox"`, `accessibilityState.checked`) that logs when
  unchecked and calls `onUncompleteTracker` when checked; it is disabled when the
  applicable-direction handler is absent. It stays a discrete control — the
  editable/deletable card is never an undo target.

**Consequence:** For the sub-second pre-hydration window a counter shows `0` and a
habit shows seven empty dots instead of a stale legacy value; both resolve the
moment hydration lands (Task 4 hydrates the selected goal on open). This is
acceptable and preferable to presenting an un-derived scalar as period truth. New
pure `features/goals/tracker-display.ts` (relative imports — D-004) owns the
clamp/bucket/label logic and is node-tested; the card is a thin shell. Display
logic now has a single source (`periodState`) with no scalar drift path.

---

## D-009 · 2026-09-11 · accepted — Legacy complete-tracker route retirement deferred to Task 9

**Context:** Task 6's deliverable D says to delete `app/api/goals/complete-tracker`
and its `completeTracker` wrapper *"once no client references it"*. Task 6 migrated
the goal-detail client onto the shared `POST /api/trackers/log` route, but a `grep`
found a second live caller: the dashboard due-today card
(`app/(app)/dashboard.tsx:handleComplete`). Migrating that card is explicitly
Task 9's scope (dashboard daily-state alignment onto `due-today` + the shared
route), and Task 6's ground rules forbid doing Task 9 work.

**Decision:** Honor the conditional wording. Task 6 does **not** delete the route
or the `completeTracker` wrapper — the condition ("no client references it") is not
yet met. Instead: migrate the goal-detail client off it, mark it deprecated in
`docs/API_CONTRACT.md`, and assign the actual deletion (route file +
`completeTracker` wrapper in `lib/db/goals.ts`; keep `logTrackerMutation`/adapter)
to Task 9 once the dashboard is migrated. This supersedes D-008's phrasing that the
route "is retired by Task 6" — it is *migrated off* by Task 6 and *deleted* by
Task 9.

**Consequence:** Both routes coexist during Tasks 6–8: goal detail on
`/api/trackers/log`, the dashboard still on `/api/goals/complete-tracker` (both
return the same additive `{success, periodState}` DTO, so no contract drift). Task 9
owns the final deletion and must confirm no remaining reference before removing the
files.

---

## D-008 · 2026-09-09 · accepted — Task 5 shape: injected DB port, additive DTO, counter restore boundary

**Context:** Task 5 refactors `completeTracker` into a shared authenticated
mutation supporting `complete | counter-log | uncomplete`, must be unit-tested
for orchestration semantics (ownership, successor rejection, idempotency,
counter sums, uncomplete-deletes-all, null-cadence rejection, DTO shape), and
must restore the counter `+1` inert since D-007 — all without doing Task 6's
optimism/boundary-refresh or Tasks 8/9's rendering. Three sub-decisions:

1. **Narrow DB port, not a Supabase fake.** The repo's test runner strips types
   with no `@/` map (D-004) and its convention is to test pure logic, not mock
   Supabase. So the mutation core lives in `lib/db/tracker-mutations.ts`
   (relative imports only) behind a `TrackerMutationDb` port with explicit
   methods; the Supabase-backed adapter (`createTrackerMutationDb`) lives in
   `lib/db/goals.ts` (which uses `@/`) and is NOT imported by any test. Tests
   drive the core through a hand-rolled fake port. Consequence: orchestration is
   fully unit-covered; the thin SQL adapter is covered by tsc + live/manual only.

2. **Single bounded read + local re-derivation.** Rather than read-mutate-reread,
   the core reads the 7-period log window once, applies the insert/delete, then
   derives the authoritative DTO from `priorLogs (± the applied change)` using
   the SAME captured `asOf`. One round-trip; deterministic; matches a re-read
   except under concurrent writes (acceptable at this volume).

3. **Additive DTO + counter-restore stays non-optimistic.** Every action returns
   `{ success: true, periodState: <DTO|null> }` (ISO strings). The legacy
   `complete-tracker` endpoint keeps `success:true` so `onCompleteTracker` is
   untouched (Task 6 consumes `periodState`). Counter `+1` is restored via a new
   additive `onLogCounter` handler + `app/api/trackers/log` route; it reconciles
   `periodState` from the response (no optimism, no in-flight guard, no boundary
   refresh — those are Task 6). Counter card **display** still reads the legacy
   scalar, so a `+1` persists and updates store `periodState` but the visible
   counter number only moves once Task 8 drives display from `periodState`. The
   `✓ Log` one-tap button is hidden for counters (they progress by logging value,
   not one-tap complete), preventing a now-`400` legacy call.

**Also:** prior-phase summaries (`cloneGoalWithMilestonesAndTrackers`) now derive
from logs via the pure `lib/goals/phase-summary.ts` reducer over a **paginated**
phase-window read (counter = sum of values; habit/checklist = count of logs,
replacing the stale `current_value>0?1:0` checklist rule). Checklist summary thus
shifts from 0/1 to a completion count — a deliberate, log-honest change.

**Consequence:** counter `+1` logs correctly end-to-end from Task 5; its visual
update and full optimism/boundary refresh arrive in Tasks 6/8. Do not ship the
initiative before Task 8 (counter display still reads the legacy scalar in the
interim). The `app/api/goals/complete-tracker` route is retired by Task 6 in
favor of the shared `app/api/trackers/log` route.

---

## D-007 · 2026-09-09 · accepted — Removing `TrackerUpdates.currentValue` neutralizes its two write sites now

**Context:** The Tasks 3+4 contract explicitly requires removing `currentValue`
from `TrackerUpdates` ("progress is no longer client-writable once logs are
canonical"). But `TrackerUpdates.currentValue` had three live consumers:
`goal-service.updateTracker` (writes `current_value`), `TrackerCard` manual-edit
`saveEdits` (sends `currentValue`), and `TrackerCard` counter `increment()`
(sends `{ currentValue: next }`). Audit 001 §4 assigned removal of those write
bypasses to **Task 5**. Removing the type field forces those sites to stop
compiling unless changed in this session — a direct conflict between "remove the
field (Task 3+4)" and "remove the bypass (Task 5)".

**Decision:** Honor the explicit contract instruction and remove
`TrackerUpdates.currentValue` in Tasks 3+4. To keep `tsc` green without doing
Task 5's real mutation refactor, apply the **minimal** compile-safety edits:
drop the `current_value` patch line in `updateTracker`; drop the manual-edit
`updates.currentValue` assignment; and make counter `increment()` **inert**
(early-return, no write) with a comment pointing at Task 5. No new logging path,
idempotency, uncomplete, or DTO change is added here — that is all Task 5.

**Consequence:** On this feature branch the counter `+1` button does nothing
until Task 5 wires it to the authenticated counter-logging mutation. The manual
current-progress field no longer persists a value (Task 8 removes the field UI).
This is acceptable only because 3+4 and 5 are sequenced back-to-back and nothing
is shipped between them. Task 5 must restore counter logging; do not release the
initiative with `increment()` inert.

---

## D-005 · 2026-09-09 · accepted — Reuse Momentum's DST conversion as-is

**Context:** Task 1 extracted `localDateToUtcStart` (the DST-critical primitive)
from Momentum. On the two DST-transition days per year, its resulting local
midnight resolves to a deterministic instant that is fully contiguous with
adjacent periods but is not a pedantic 23/25-hour local day (the lost/gained
hour attaches to a neighboring bucket).

**Decision:** Keep this behavior unchanged. The plan mandates not duplicating or
rewriting the DST algorithm, Momentum already ships it, and period-bucketing only
needs determinism + contiguity + total coverage — all verified in
`tracker-cadence.test.ts`. Tests assert the verified actual instants, not an
idealized transition-day span.

**Consequence:** Downstream tasks/tests must not assume perfect 23/25-hour
transition days. If a product requirement ever needs exact transition-day spans,
that is a separate change to the shared `zoned-calendar` module affecting
Momentum too.

---

## D-004 · 2026-09-09 · accepted — Test-reachable modules use relative imports

**Context:** The repo's unit tests run under `node --experimental-strip-types
--test` with **no `@/` import map** in `package.json`. A module using `@/…`
imports passes `tsc` (tsconfig `paths`) but fails at node runtime. Confirmed by
`test:momentum` failing 4 suites when `features/momentum/time.ts` briefly used
`@/lib/...`.

**Decision:** Any `lib/`/`features/` module that is imported (directly or
transitively) by a node test must use **relative imports** (e.g.
`../../lib/time/zoned-calendar.ts`), not `@/` aliases. `@/` remains fine in
Expo/Metro-only code (app routes, components) that never enters a node test.

**Consequence:** `lib/time/zoned-calendar.ts`, `lib/goals/tracker-cadence.ts`,
and `features/momentum/time.ts` all use relative imports. Future tracker-metrics
modules with tests must follow suit.

---

## D-006 · 2026-09-09 · accepted — 046 built transactionally, not CONCURRENTLY

**Context:** Task 2 (session 003) applied migration `046`. `PLAN.md` Task 2 says
to use the repo's non-transactional `CONCURRENTLY` process only if the live table
is large enough that a normal build creates unacceptable lock risk. Re-checked
`tracker_logs` row count immediately before applying: **37 rows / 21 trackers**,
unchanged from audit 001 (no material growth).

**Decision:** Build the compound covering index with a **normal transactional**
`create index if not exists` and drop the redundant single-column index in the
**same migration**. `CONCURRENTLY` is unnecessary and would preclude the same-file
create+drop; at 37 rows the exclusive lock is negligible.

**Consequence:** `046_tracker_logs_period_index.sql` is a single ordinary
transactional migration. If `tracker_logs` ever grows to where an index build's
lock matters, a *future* index change on this table should reassess and use the
concurrent process — this decision is scoped to the current volume.

**Execution note (D-001, D-003):** Session 003 confirmed on disk that `045` was
the highest file → created `046` (executes D-001). Applied both DDL statements
via the mgmt API (curl UA) and inserted the
`supabase_migrations.schema_migrations` row for `046`, then re-queried to confirm
(executes D-003). Live `schema_migrations` now tops at `046`; the `045` gap
remains the Entries owner's info-only item.

---

## D-003 · 2026-09-09 · accepted — Task 2 must insert the schema_migrations row

**Context:** Audit 001 found the live `supabase_migrations.schema_migrations`
table tops at `044`, but file `045_entries_brt_idempotent_create.sql` exists on
disk. With no Supabase CLI, applying DDL via the management API does NOT record
the migration; the tracker row must be inserted manually and was missed for 045.

**Decision:** When Task 2 applies `046_tracker_logs_period_index.sql` via the
management API, it must also
`insert into supabase_migrations.schema_migrations (version, name, statements)
values ('046', 'tracker_logs_period_index', …)` and then re-query to confirm.
The 045 gap itself is idempotent + Entries-domain and is left to the Entries
owner (out of tracker-metrics scope), tracked as an info-only item.

**Consequence:** "Apply the migration" in Task 2 explicitly includes the tracker
insert + verification, not just the DDL POST.

---

## D-002 · 2026-09-09 · accepted — Documentation lives in `tracker-metrics/`

**Context:** User wants each session to have a changelog for compounding agent
context, plus memory/decisions/audits/outstanding docs.

**Decision:** Create a self-contained top-level `tracker-metrics/` folder holding
`PLAN.md` (moved from repo root), `README.md`, `MEMORY.md`, `DECISIONS.md`,
`OUTSTANDING.md`, `changelog/`, and `audits/`. Sessions still also append to
root `CHANGELOGCODEX.md` because `PLAN.md` requires it repo-wide.

**Consequence:** The original root path
`TRACKER_METRICS_IMPLEMENTATION_PLAN.md` no longer exists; references to it
should point to `tracker-metrics/PLAN.md`.

---

## D-001 · 2026-09-09 · accepted — Migration number is 046, not 044

**Context:** `PLAN.md` Task 2 hard-codes
`044_tracker_logs_period_index.sql`. Since the plan was written (2026-08-26),
migrations `044_echo_v1_project_links.sql` and
`045_entries_brt_idempotent_create.sql` landed.

**Decision:** Task 2 will create `046_tracker_logs_period_index.sql`. The next
number must be re-verified against `supabase/migrations/` immediately before the
file is written (Task 0 / Task 2 both instruct this).

**Consequence:** The `044` filename in `PLAN.md` is stale but the plan
anticipated the check. Do not edit `PLAN.md` prose; this entry is the record of
record. Update any test/verification text that references the number to `046`.
