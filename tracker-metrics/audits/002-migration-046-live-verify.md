# Audit 002 — Migration 046 live verification (Task 2)

- **Date:** 2026-09-09
- **Auditor:** Opus 4.8, low effort (SQL-only migration; applied + verified live)
- **tsc baseline (before):** clean (exit 0)
- **tsc (after):** clean (exit 0) — SQL-only change, unaffected as expected
- **Live DB:** management API query endpoint, `ref rrgiqemscnyaqkculnmb`, curl UA.
- **Verdict:** **PASS.** New covering index live with the exact expected
  definition, redundant single-column index dropped, `schema_migrations` row for
  `046` inserted. **GO** for Tasks 3+4.

---

## 1. Pre-apply re-confirmation (this session)

- **Next migration number:** files on disk top at `045_entries_brt_idempotent_create.sql`
  → next is **`046`** (matches D-001). Live `schema_migrations` topped at `044`
  (045 gap is the known Entries-domain, idempotent, out-of-scope item).
- **Redundant index confirmed by exact name + definition:**
  ```
  idx_tracker_logs_tracker_id | CREATE INDEX idx_tracker_logs_tracker_id ON public.tracker_logs USING btree (tracker_id)
  ```
  Plain single-column btree on `tracker_id` — a strict leading-column prefix of
  the new compound index, therefore genuinely redundant.
- **Row count re-check:** `tracker_logs` = **37 rows / 21 trackers** — unchanged
  from audit 001, no material growth. A normal transactional index build carries
  no meaningful lock risk; `CONCURRENTLY` is unnecessary (judgment call held).

## 2. DDL applied

Applied via the management API query endpoint (curl UA), two statements, both
returning `[]` (success):

```sql
create index if not exists tracker_logs_tracker_id_logged_at_idx
  on public.tracker_logs (tracker_id, logged_at desc)
  include (id, value);

drop index if exists public.idx_tracker_logs_tracker_id;
```

## 3. schema_migrations tracker row (D-003)

```sql
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('046', 'tracker_logs_period_index', array[
  'create index if not exists tracker_logs_tracker_id_logged_at_idx on public.tracker_logs (tracker_id, logged_at desc) include (id, value);',
  'drop index if exists public.idx_tracker_logs_tracker_id;'
]) on conflict (version) do nothing returning version, name;
```

Returned:
```json
[{"version":"046","name":"tracker_logs_period_index"}]
```

## 4. Live verification (raw output)

### 4a. `pg_indexes` on `public.tracker_logs` (post-apply)
```json
[
  {"indexname":"tracker_logs_pkey","indexdef":"CREATE UNIQUE INDEX tracker_logs_pkey ON public.tracker_logs USING btree (id)"},
  {"indexname":"tracker_logs_tracker_id_logged_at_idx","indexdef":"CREATE INDEX tracker_logs_tracker_id_logged_at_idx ON public.tracker_logs USING btree (tracker_id, logged_at DESC) INCLUDE (id, value)"}
]
```
- ✅ New index present with the **exact expected definition**
  (`(tracker_id, logged_at DESC) INCLUDE (id, value)`).
- ✅ Redundant `idx_tracker_logs_tracker_id` is **gone**.
- ✅ `tracker_logs_pkey` untouched.

### 4b. `schema_migrations` (top 3, post-insert)
```json
[
  {"version":"046","name":"tracker_logs_period_index"},
  {"version":"044","name":"echo_v1_project_links"},
  {"version":"043","name":"momentum_v1_1_cross_version_baseline"}
]
```
- ✅ `046` now recorded. (The `045` gap remains — Entries-domain, out of scope,
  info-only follow-up per D-003.)

### 4c. `EXPLAIN` — representative period query
Query filtering `tracker_id` equality + a `logged_at` lower bound, ordered by
`logged_at desc`:
```
Sort  (cost=1.79..1.79 rows=1 width=29)
  Sort Key: tracker_logs.logged_at DESC
  InitPlan 1
    ->  Limit  (cost=0.00..0.04 rows=1 width=16)
          ->  Seq Scan on tracker_logs tracker_logs_1  (cost=0.00..1.37 rows=37 width=16)
  ->  Seq Scan on tracker_logs  (cost=0.00..1.74 rows=1 width=29)
        Filter: ((tracker_id = (InitPlan 1).col1) AND (logged_at >= (now() - '7 days'::interval)))
```
- ⚠ Planner chooses a **seq scan**, not the new index. **This is expected and
  not a failure**: at 37 rows a seq scan (est. cost ~1.74) is cheaper than an
  index scan. The index is future-proofing per the plan; it becomes eligible/used
  at realistic volume. (Audit 001 §2 recorded the same baseline behavior.)

## 5. No side effects

- No column, RLS, constraint, or data changes. Only two index objects touched
  (one created, one dropped) plus one `schema_migrations` bookkeeping row.
- `npx tsc --noEmit` clean before and after (SQL-only change).

## 6. Notes / transient issues

- One verification query hit a transient Cloudflare **502 Bad Gateway** and was
  re-run successfully — a gateway blip, not a DDL/data problem (the DDL and
  tracker-row insert had already returned success before it).

## GO / NO-GO

**GO for Tasks 3+4.** Both dependencies (Task 1 cadence utilities, Task 2 index)
are complete and verified. The covering index is live; the derivation/read-path
work in Tasks 3+4 can proceed.
