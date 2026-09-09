# Tracker Metrics — Tasks 3+4: tracker contract + period derivation (ATOMIC)

You are implementing **Tasks 3 and 4** of the tracker-metrics initiative. They
are **one atomic change — land together, do not split.** Work on the existing
branch `tracker-metrics/task-1-cadence-utilities` (or branch from it); do NOT
commit to `main`. Commit only when I ask.

## Read first (in this order)
1. `tracker-metrics/MEMORY.md` and `tracker-metrics/OUTSTANDING.md` — status;
   Tasks 0–2 are done, Tasks 3+4 are next.
2. `tracker-metrics/PLAN.md` → the **"Tasks 3 + 4"** section, plus **"Client
   domain contract"**, **"Read-path design"**, and **"Final product and data
   decisions"** (completion/cadence/history semantics are settled there).
3. `tracker-metrics/DECISIONS.md` — especially **D-004 (relative imports in any
   test-reachable module)** and D-005 (DST behavior is reused as-is; don't assume
   pedantic 23/25h transition days in tests).
4. `tracker-metrics/audits/001-preflight-audit.md` §1 (schema), §4 (consumer
   trace / which `current_value` sites belong to which task), §5 (the EXISTING
   pagination template in `lib/db/friends.ts` + `lib/db/constellation.ts` — mirror
   it, don't invent one), §6 (goal-detail currently fetches trackers via
   `GOAL_SELECT` with NO `tracker_logs` join → hydration is net-new).
5. Root `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`.

## Known facts from prior sessions (verify, don't re-derive blindly)
- **Task 1 shipped the cadence utilities** you build on:
  `lib/goals/tracker-cadence.ts` exports pure `getPeriodBounds`,
  `getRecentPeriodBounds(frequency, reference, timezone, count)` (returns exactly
  `count` bounds oldest→newest, current period last), and `isWithinPeriod`.
  Timezone primitives live in `lib/time/zoned-calendar.ts`. Use these — do not
  re-implement bounds math.
- **Task 2 shipped the covering index** `tracker_logs_tracker_id_logged_at_idx`
  on `(tracker_id, logged_at desc) include (id, value)` — your paginated read
  ordering (`logged_at`, then `id`) is aligned with it.
- **Test runner gotcha (D-004):** unit tests run under `node
  --experimental-strip-types --test` with **no `@/` import map**. Any `lib/` or
  `features/` module reachable from a test MUST use **relative imports**
  (e.g. `../../lib/goals/tracker-cadence.ts`), not `@/…`. `@/` only in
  Expo/Metro-only code (app routes/components) never entered by a node test.
- **Live data is tiny** (37 logs / 21 trackers, 0 monthly trackers, 36 null-
  frequency). The >1000-log pagination ceiling and monthly buckets have NO prod
  coverage → prove them with **fixture tests**, not the live DB.
- `profiles.timezone` is `text NOT NULL default 'UTC'`; still run it through
  `normalizeTimezone` for invalid strings.

## Contract (from PLAN.md — implement exactly)
```ts
export interface TrackerPeriodBucket {
  startInclusive: Date;
  endExclusive: Date;
  value: number;
  hasLog: boolean;
}
export interface TrackerPeriodState {
  asOf: Date;
  timezone: string;
  startInclusive: Date;
  endExclusive: Date;
  currentValue: number;
  isCompleted: boolean;
  recentPeriods: TrackerPeriodBucket[]; // exactly 7, oldest -> newest
}
// Tracker gains: periodState: TrackerPeriodState | null
```

## Work

### A. Shared contract (`features/goals/types.ts`)
- Add `TrackerPeriodBucket`, `TrackerPeriodState`, and `Tracker.periodState`.
- Keep legacy `Tracker.currentValue` for compat, but stop treating it as
  current-period value.
- **Remove `currentValue` from `TrackerUpdates`** (progress is no longer
  client-writable once logs are canonical).
- `mapTracker` initializes `periodState: null` on raw/list tracker objects.
- Do NOT edit generated `types/supabase.ts` (table shape didn't change).
- Network/API responses use ISO strings; convert to `Date` at the existing client
  mapping boundary — don't pass `Date` through JSON.

### B. Pure derivation function
- Accepts tracker metadata (type, frequency, targetValue), its bounded log rows,
  timezone, and one `asOf` instant. Deterministic; no `trackers.current_value`;
  no server-process-local date logic.
- Bucket via `getRecentPeriodBounds(frequency, asOf, tz, 7)`; sum log values per
  bucket and for the current period; `hasLog` = any log in half-open bounds.
- Completion semantics (settled): checklist/habit = ≥1 log in current period;
  counter = sum of current-period values ≥ positive `targetValue`.
- Returns 7 buckets for configured cadence; returns **`null` for null frequency**.
- Put it in a test-reachable module with **relative imports** (D-004).

### C. Hydrated goal-detail read path
- Fetch the selected goal's trackers + the authed user's `profiles.timezone`.
  Capture ONE `asOf` and reuse it for every tracker in the operation.
- Partition tracker IDs by daily/weekly/monthly frequency. Issue **at most three**
  period-log queries in parallel (one per non-empty frequency group), each using
  that group's exact 7-period lower bound. **Never one query per tracker.** A
  monthly tracker must NOT force 7 months of daily logs to load.
- Select only `id, tracker_id, value, logged_at`; order by `logged_at` then `id`.
- Add a small **paginated read helper** mirroring `lib/db/friends.ts` /
  `lib/db/constellation.ts` (`PAGE_SIZE = 500`, loop `.range()` until a short
  page). A goal can exceed 1000 logs; sums must stay correct.
- Change `useGoalDetail` so a *listed* goal is not treated as already-hydrated:
  opening detail always calls the hydrated path and hydrates the selected goal.
  Do NOT hydrate every goal in the global list.
- If any log read fails, surface a tracker-state load error — never map missing
  evidence to zero/incomplete.

### Tests (add task-specific coverage)
- Pure derivation: 3 tracker types × 3 frequencies.
- Counter below / exactly at / above target.
- Habit & checklist presence completion.
- Multiple logs in one period; logs exactly on both bounds (start included, end
  excluded).
- Mixed-frequency goal with distinct query windows.
- **Pagination fixture with >1000 logs → correct final sum.**
- Null-frequency tracker → `periodState: null`.
- One captured `asOf` used across all trackers.

## Ground rules
- Run `npx tsc --noEmit` before editing (record the baseline) and after — it MUST
  pass. This is a real code change, so tsc will be exercised.
- Run the new tests + `npm run test:momentum` (shared contract touch) and confirm
  green. Use `node --experimental-strip-types --test <path>` for new suites.
- Make ONLY Tasks 3+4 changes. Task 5 owns removing the `current_value` *write*
  bypasses and the mutation refactor — do not do Task 5 work here. (See audit 001
  §4 for the per-site task split.)
- Do not land Task 3 without Task 4.

## Deliverables
1. The code + tests (types, derivation, hydrated read path, pagination helper).
2. `tracker-metrics/changelog/004-tasks3-4-period-derivation.md` (copy
   `changelog/TEMPLATE.md`).
3. Update `tracker-metrics/OUTSTANDING.md` (Tasks 3+4 ☑, next action → Task 5)
   and `tracker-metrics/MEMORY.md`, and add a root `CHANGELOGCODEX.md` entry.
4. Record any new decision in `tracker-metrics/DECISIONS.md` (next id D-007).
5. End with a GO/NO-GO for **Task 5** (auth logging/uncomplete + legacy fixes),
   which depends on Tasks 1 and 3+4.
