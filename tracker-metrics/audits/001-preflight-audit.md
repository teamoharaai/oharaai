# Audit 001 — Preflight (Task 0)

- **Date:** 2026-09-09
- **Auditor:** Opus 4.8, high effort (read-only; no source edits, no DB writes)
- **tsc baseline:** `npx tsc --noEmit` → **clean (exit 0)**
- **Live DB:** management API reachable (`ref rrgiqemscnyaqkculnmb`, PG 17.6),
  token present, `jq`+`python3` present. All queries below are read-only.
- **Verdict:** **GO** for Task 1. No blockers. Findings below refine Tasks 2/3+4/5.

---

## 1. Schema vs. plan — mostly CONFIRMED, with data notes

### `trackers` (live)
| column | type | null | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| goal_id | uuid | NO | — |
| title | text | NO | — |
| type | text | NO | — |
| target_value | numeric | YES | — |
| target_unit | text | YES | — |
| frequency | text | YES | — |
| current_value | numeric | **NO** | **0** |
| is_ai_suggested | bool | NO | false |
| sort_order | int | NO | 0 |
| created_at/updated_at | timestamptz | NO | now() |

- `frequency` is nullable text → CONFIRMS the plan's null-cadence handling.
- `current_value` is **NOT NULL default 0** → the plan is right to keep it (can't
  drop without a schema change) and to stop *reading/writing* it for period UI.
  Inserts must keep succeeding without it; default 0 covers that.

### `tracker_logs` (live)
| column | type | null | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tracker_id | uuid | NO | — |
| value | numeric | **NO** | **1** |
| note | text | YES | — |
| logged_at | timestamptz | NO | now() |

- CONFIRMS canonical-evidence model. `value` default 1 aligns with "checklist log
  value = 1". No period/idempotency column exists (matches deferred scope).

### `profiles.timezone` — CONFIRMED, better than assumed
- `text`, **NOT NULL, default `'UTC'`**. So the DB already guarantees a non-null
  IANA string; `normalizeTimezone()` still needed for *invalid* strings, but the
  null path is defended at the column level.

### Data inventory (live, read-only)
- **Trackers by frequency:** `null = 36`, `weekly = 29`, `daily = 4`,
  **`monthly = 0`**. → 36 trackers (over half of 69) have **no cadence** and will
  be logging-rejected by the plan until a user sets one. This is a real UX
  surface for Tasks 5/7 — the "cadence not set" affordance will be common, and
  there is currently **no monthly tracker in production** to exercise Task 8's
  monthly bucket path (must be covered by tests/fixtures, not prod data).
- **Trackers by type:** `counter = 29`, `habit = 23`, `checklist = 17` (69 total,
  consistent with frequency total).
- **`tracker_logs`:** **37 rows across 21 trackers.** Tiny. See §5.

---

## 2. Indexes & Task 2 — CONFIRMED (index is genuinely new)

Live indexes:
- `tracker_logs`: `tracker_logs_pkey` (id), `idx_tracker_logs_tracker_id`
  (btree on `tracker_id`) ← **this is the exact redundant index** the plan may
  drop in Task 2. Name confirmed; definition is a plain single-column btree.
- `trackers`: `trackers_pkey`, `idx_trackers_goal_id`.

The plan's compound covering index `(tracker_id, logged_at desc) include (id,
value)` does **not** exist → Task 2 is real work, not a no-op.

**EXPLAIN baseline** (real tracker, 7-day window):
```
Sort → Seq Scan on tracker_logs (Rows Removed by Filter: 37)  Execution 0.12ms
```
At 37 rows the planner uses a seq scan; the new index will **not** be exercised
until the table grows. This is expected — the index is future-proofing per the
plan, not a fix for a measured slow query. Do not treat "index unused in EXPLAIN"
as a Task 2 failure; re-check at realistic volume later.

### ⚠ Migration-tracking drift (new finding)
- Files on disk go through `045_entries_brt_idempotent_create.sql`, but live
  `supabase_migrations.schema_migrations` tops out at **044**
  (`echo_v1_project_links`). Query for versions `045`/`046` returns nothing.
- `045` is **idempotent** (`add column if not exists`, guarded constraint adds)
  and is **Entries-domain, out of tracker-metrics scope** → does not block us.
- **Lesson for Task 2:** next file number is **046** (confirmed). When applying
  `046` via the mgmt API, you **must** insert the `schema_migrations` row
  yourself (`insert into supabase_migrations.schema_migrations (version, name,
  statements) …`) — the CLI is absent and the 045 gap shows that step gets
  missed. Consider flagging the 045 gap to the Entries owner separately.

---

## 3. RLS — CONFIRMED sufficient for logging + uncomplete

`tracker_logs` has full CRUD policies, all scoped
`tracker_id IN (SELECT m.id FROM trackers m JOIN goals g ON m.goal_id=g.id WHERE
g.user_id = auth.uid())`:
- INSERT (with_check) → Task 5 counter/habit/checklist logging allowed.
- DELETE (qual) → Task 5 uncomplete (delete current-period logs) allowed.
- SELECT (qual) → Task 3+4 hydration read allowed.

`trackers` policies scope through `goals.user_id = auth.uid()`. An authed RLS
client (`createAuthedClient(accessToken)`) is sufficient; no service-role needed.

---

## 4. Consumer trace — `current_value` / `currentValue` / `completeTracker`

Legend: **WRITE-current_value** sites must be removed/changed (Tasks 5/6);
read-only display sites move to `periodState` (Tasks 8/9); Momentum is legacy-safe.

| Site | What it does | Task |
|---|---|---|
| `lib/db/goals.ts:1003` `completeTracker` `update({current_value:1})` for checklist | **WRITE** — the DB-side scalar write | **5** (remove) |
| `lib/db/goals.ts:990` `tracker_logs.insert` | existing log insert in completeTracker | 5 (refactor into shared mutation) |
| `lib/db/goals.ts:530,792` `.from('tracker_logs')` reads | phase-summary / clone reads | 5 (paginate, derive from logs) |
| `lib/db/goals.ts:554,562` `achieved/completions` from `current_value` | **stale-scalar phase summary** | 5 (derive from logs) |
| `lib/db/goals.ts:511,641` select/insert `current_value` | clone select + insert default | 5 (insert default OK; stop trusting select) |
| `features/goals/services/goal-service.ts:559` `updateTracker` patches `current_value` | **WRITE bypass** | 5 (remove) |
| `goal-service.ts:200,372,44` maps/selects `current_value` → `currentValue` | list mapping | 3+4 (`mapTracker` keeps legacy field, adds `periodState:null`) |
| `features/goals/store.ts:50` `upsert… currentValue: value` | store patch of scalar | 6 (replace w/ `patchTracker` + periodState) |
| `features/goals/hooks/useGoalDetail.ts:199` optimistic `currentValue:1` on checklist | **local scalar write** | 6 (remove; use periodState) |
| `useGoalDetail.ts` `completedTrackerIds` (44,80,182,216,372) + `GoalsWorkspace.tsx:1054,1114` `completedIds` | **local completion set** | 6 (delete entirely) |
| `features/goals/components/TrackerCard.tsx:57–137` `displayValue/draftCurrent`, `onSave({currentValue})` counter +1 & manual edit | **WRITE bypass + local display state** | 5 (remove manual edit / counter bypass), 8 (drive from periodState) |
| `features/goals/components/ExtendGoalModal.tsx:57,115` reads `currentValue` as truth | stale display | 5 |
| `features/goals/components/GoalsWorkspace.tsx:968,974` progress from `currentValue` | display | 8 |
| `app/api/trackers/due-today+api.ts:12,28,54,100` selects/returns `current_value`/`currentValue` | dashboard API | 9 |
| `app/(app)/dashboard.tsx:368,369,449,611` reads `currentValue` | dashboard UI + browser-tz compare | 9 |
| `lib/db/tracker-inserts.ts:24` `current_value:0` on insert | insert default | legacy-safe (keep) |
| `features/momentum/services/momentum-service.ts` (many) | Momentum is **log-driven**; `current_value` selected at :255 then **stripped at :509** before compute; other hits are the momentum *snapshot* table's own `current_value` column (unrelated) | **legacy-safe** — do not touch (plan §scope) |

Dead code: **`GoalsWorkspace.tsx:955 function TrackerList`** — CONFIRMED no JSX
usage (`<TrackerList` returns nothing). Safe to remove in Task 8.

---

## 5. Read-path & pagination — template EXISTS, reuse it

- Goal detail loads trackers via `GOAL_SELECT` (goal-service.ts) as a **nested
  `trackers(...)` select that includes `current_value` but fetches NO
  `tracker_logs`**. So goal detail currently has zero log-derived period state —
  Tasks 3+4 build the entire hydration path from scratch (as the plan expects).
- **A proven pagination pattern already exists** in `lib/db/friends.ts` and
  `lib/db/constellation.ts`:
  ```ts
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client.from(t).select(cols)
      .order('created_at',{ascending:false}).order('id',{ascending:true})
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? []; rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  ```
  → Task 3+4's paginated log read should mirror this (order by `logged_at` then
  `id`), not invent a new helper. `PAGE_SIZE = 500` is the repo convention.
- Current volume (37 logs) means the >1000-row correctness ceiling is purely
  theoretical today — it must be covered by a **fixture test**, not prod data.

---

## 6. API + auth contract (Task 5/6 must preserve)

`app/api/goals/complete-tracker+api.ts`:
- Guard `isDatabaseConfigured` → 503; wrap in `withAuth(handlePost)` giving
  `AuthContext { userId, accessToken }`.
- `createAuthedClient(auth.accessToken)` → RLS-scoped client.
- Body carries **only** `{ trackerId, goalId }` (trimmed); `userId` is
  server-side. Missing → 400. Bad JSON → 400.
- Errors: `GoalExtensionError('GOAL_HAS_SUCCESSOR')` → **409**; else → 500.
- **Currently returns `{ success: true }`** → Task 5 must change this to the
  canonical `periodState` DTO and the client (useGoalDetail) must stop asserting
  `payload.success === true`.

`lib/db/goals.ts completeTracker(trackerId, goalId, userId, db=supabase)`:
- successor check → ownership (`goals.user_id=userId`) → tracker∈goal → insert
  `tracker_logs {value: normalizeTrackerTarget(target_value), logged_at}` →
  **checklist also `update trackers.current_value=1`**.
- `normalizeTrackerTarget`: null→1, >0→target, else→1. Matches plan's habit/
  checklist value rule.
- **Gaps Task 5 fills:** not idempotent (inserts a dup log every call), no
  null-frequency rejection, no uncomplete, no counter path, returns `void`.

Client convention: `authedFetch(url,{method,headers,body})`; optimistic
`upsert…` → server call → on failure roll back to prior snapshot; throws
`UnauthorizedError` for signed-out. `refreshMomentumAfterMeaningfulMutation()` is
called **`void` (best-effort, not awaited)** — Tasks 5/6 must preserve that
non-coupling.

---

## 7. Timezone primitives (Task 1 input) — clean extraction, low blast radius

`features/momentum/time.ts` exports: `normalizeTimezone`, `zonedDateParts`,
`addLocalDays`, `localDateToUtcStart`, `getMomentumWeek`,
`getPreviousMomentumWeek`, `localDateForInstant` (+ private `formatter`,
`toYmd`). Conventions match the plan: Monday-start weeks, half-open bounds, DST
correction via iterative offset + final local-minute adjustment.

- **Extract to `lib/time/zoned-calendar.ts`:** `normalizeTimezone`,
  `zonedDateParts`, `toYmd`, `addLocalDays`, `localDateToUtcStart` (the
  DST-critical primitive). Keep `getMomentumWeek`/`getPreviousMomentumWeek` in
  Momentum (or generalize the Monday-week math and have Momentum call the shared
  one). **Re-export from `features/momentum/time.ts`** to avoid touching
  Momentum internals.
- **Importer blast radius is tiny:** outside the module, `momentum/time` is
  imported only by `scripts/momentum-local.integration.mjs` and the
  `test:momentum` script list (`features/momentum/time.test.ts`). Keep those
  green via re-export.
- **Add the Intl formatter cache** the plan asks for: `formatter()` currently
  builds a new `Intl.DateTimeFormat` every call — cache by normalized tz.

---

## 8. Momentum coupling — CONFIRMED log-driven, best-effort refresh

`refreshMomentumAfterMeaningfulMutation()` (from
`@/features/momentum/hooks/useMomentumHomeSummary`) is invoked `void`-style at 5
sites in `useGoalDetail.ts` (tracker complete, milestone save/add/complete, goal
update). Tasks 5/6 must keep calling it best-effort after successful tracker
mutations and never couple write success to recalculation.

---

## Ranked risks / follow-ups

1. **Migration tracker-row insert (Task 2).** The live 045 gap proves the
   `schema_migrations` insert is easy to forget with no CLI. Task 2 must insert
   the 046 row after DDL. *(Also: raise the 045 gap to the Entries owner —
   informational, out of scope.)*
2. **36 null-frequency trackers in prod.** Over half of trackers can't be logged
   until cadence is set. Confirm Task 7's "cadence not set" affordance and Task
   5's rejection copy are user-friendly, not dead-ends.
3. **No monthly trackers + tiny log volume in prod.** Monthly buckets (Task 8)
   and >1000-log pagination (Task 3+4) have **no production coverage** — they
   must be proven by fixtures/tests only.
4. **DTO change is a client contract break.** Switching complete-tracker from
   `{success:true}` to a `periodState` DTO (Task 5) requires the Task 6 client
   change to land back-to-back, exactly as the plan sequences.
5. **Extra `tracker_logs` readers** at `lib/db/goals.ts:530,792` (clone/phase
   summary) were on the plan's radar; confirmed present and must be paginated +
   log-derived in Task 5.

## GO / NO-GO

**GO — start Task 1.** No blocker. Task 1 (timezone extraction) is isolated, has
a tiny importer footprint, and does not depend on any of the open items above.
