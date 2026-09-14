# Session 001 — Preflight audit (live DB + code trace)

- **Date:** 2026-09-09
- **Task(s):** Task 0 (deepened to a full live audit)
- **Agent/model:** Opus 4.8, high effort
- **tsc baseline (before):** clean (exit 0)

## Goal of this session

Run the preflight audit prompt: verify the plan against the live schema/RLS/
indexes via the Supabase management API, trace every `current_value`/
`completeTracker`/`completedTrackerIds` consumer, map the timezone extraction,
confirm the auth/pagination/momentum patterns, and issue a GO/NO-GO for Task 1.

## Changes

- No source code touched. Read-only SQL + code reads only.
- **`tracker-metrics/audits/001-preflight-audit.md`** — full findings report.
- **`OUTSTANDING.md`** — Task 0 marked complete; resolved the null-frequency and
  index-name items; added Task 2 schema_migrations-insert item, monthly/pagination
  no-prod-coverage item, null-cadence UX item, DTO-break item, 045 info item.
- **`MEMORY.md`** — added "Live DB facts" and "Code facts" sections.
- **`DECISIONS.md`** — added D-003 (Task 2 must insert the schema_migrations row).

## Findings (headline)

- **GO for Task 1.** No blockers. tsc clean.
- Schema/RLS/columns match the plan. `profiles.timezone` is `NOT NULL DEFAULT
  'UTC'` (better than assumed). `current_value` is `NOT NULL DEFAULT 0` (keep).
- Plan's compound covering index does NOT exist → Task 2 is real work. Redundant
  index confirmed as `idx_tracker_logs_tracker_id`. EXPLAIN = seq scan at 37 rows
  (index is future-proofing; won't show as used until volume grows).
- **New drift:** live `schema_migrations` tops at 044 though file 045 exists →
  D-003, Task 2 must insert its own tracker row.
- Prod data: 69 trackers (36 null-cadence / 29 weekly / 4 daily / **0 monthly**);
  **37 logs total** → monthly + >1000-log paths need fixtures, not prod data.
- Full consumer trace table produced (site → task). `TrackerList` confirmed dead.
- Pagination template already exists (`friends.ts`/`constellation.ts`, PAGE_SIZE
  500) → reuse it. Goal detail currently fetches NO logs → hydration is net-new.
- Auth/mutation contract documented; complete-tracker returns `{success:true}`
  today (Task 5 → periodState DTO, Task 6 client back-to-back).
- Momentum is log-driven + refreshed best-effort (`void`) → legacy-safe.
- time.ts extraction is low blast radius (only script + tests import it).

## Tests

- `npx tsc --noEmit` → pass (baseline only; no code changed).
- Live DB: ~12 read-only queries via mgmt API (curl UA), all succeeded.

## Decisions made

- D-003 — Task 2 must insert the `schema_migrations` row after applying 046.

## Follow-ups / handoff

- **Next action:** begin **Task 1** — extract timezone primitives to
  `lib/time/zoned-calendar.ts` (re-export from `features/momentum/time.ts`,
  add Intl formatter cache), create `lib/goals/tracker-cadence.ts` + tests.
- Carry the open items in `OUTSTANDING.md` into their owning tasks (esp. D-003
  for Task 2; fixtures for monthly/pagination in Tasks 8 and 3+4).
