# Tracker Metrics — Decision Log

ADR-style. One entry per judgment call or deviation from `PLAN.md`. Newest at
top. Never rewrite history — supersede with a new entry.

Format: `D-NNN` · date · status (accepted | superseded | proposed) · context →
decision → consequence.

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
