# Session 002 — Task 1: shared timezone-aware cadence utilities

- **Date:** 2026-09-09
- **Task(s):** Task 1
- **Agent/model:** Opus 4.8, high effort
- **tsc baseline (before):** clean (exit 0)

## Goal of this session

Extract the reusable timezone primitives from `features/momentum/time.ts` into a
neutral shared module and build the pure tracker-cadence functions
(`getPeriodBounds`, `getRecentPeriodBounds`, `isWithinPeriod`) with full DST /
rollover / validation test coverage, without duplicating the DST algorithm or
regressing Momentum.

## Changes

- **`lib/time/zoned-calendar.ts`** (new) — extracted neutral primitives:
  `normalizeTimezone`, `zonedDateParts`, `toYmd`, `addLocalDays`,
  `startOfIsoWeekYmd` (new helper for Monday-start weeks), `localDateToUtcStart`,
  `localDateForInstant`. Added **cached `Intl.DateTimeFormat`** instances (date-
  part + time-part formatters) keyed by normalized timezone, per the plan.
- **`features/momentum/time.ts`** — now imports the primitives from
  `../../lib/time/zoned-calendar.ts` and **re-exports** the ones Momentum callers
  used (`normalizeTimezone`, `zonedDateParts`, `addLocalDays`,
  `localDateToUtcStart`, `localDateForInstant`). `getMomentumWeek` /
  `getPreviousMomentumWeek` stay here (unchanged behavior). Zero churn for
  `momentum-service.ts`, `engine.ts`, and the momentum tests.
- **`lib/goals/tracker-cadence.ts`** (new) — pure `getPeriodBounds`,
  `getRecentPeriodBounds`, `isWithinPeriod` + `TrackerCadence`/`PeriodBounds`
  types. Half-open bounds; daily / weekly (Monday) / monthly; invalid tz → UTC;
  rejects non-positive/non-integer history counts; unsupported cadence throws.
  `getRecentPeriodBounds` steps 1ms before each period start to walk backwards,
  guaranteeing contiguity across DST and month-length changes.
- **`lib/goals/tracker-cadence.test.ts`** (new) — 13 tests (see below).

## Tests

- `node --experimental-strip-types --test lib/goals/tracker-cadence.test.ts` →
  **13/13 pass**. Covers: NY spring-forward + fall-back daily bounds; same
  instant → different local daily period in NY vs Tokyo; Sunday 23:59 vs Monday
  00:01 in different Monday weeks; exact `endExclusive` excluded / `startInclusive`
  included; Dec→Jan rollover; leap-Feb 2028 + 30/31-day months; 7-bucket daily
  contiguity across spring-forward + oldest→newest ordering + current-period last;
  weekly & monthly recent contiguity (7 months back Jan 2027 → Jul 2026);
  invalid tz → UTC; determinism; count validation; unsupported-cadence throw.
- `npx tsc --noEmit` → **pass (exit 0)**.
- `npm run test:momentum` → **64/64 pass** (no regression).
- Verified all bound instants with a throwaway script before hard-coding expected
  values in the test (script deleted).

## Decisions made

- **D-004** — test-reachable shared modules must use **relative imports**, not
  `@/` aliases (node test runner has no import map).
- **D-005** — reuse Momentum's DST conversion as-is, including its deterministic
  transition-day boundary behavior.

## Follow-ups / handoff

- **Next action:** **Task 2** — create `046_tracker_logs_period_index.sql` (NOT
  044). Re-verify the highest migration number, apply via mgmt API with a curl
  UA, **insert the `schema_migrations` row** (D-003), and verify with
  `pg_indexes` + EXPLAIN.
- `test:tracker-metrics` package script is intentionally deferred to Task 10 (per
  plan). Until then, run the cadence test directly with the command above.
- No commit made this session (user has not asked to commit).
