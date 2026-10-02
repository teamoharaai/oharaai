-- --apply only: fingerprint existing Goal and Task data before any pending migration runs, inside the apply
-- transaction. invariants-after.sql recomputes it after the migrations and aborts on any difference, so an
-- apply can add schema but never change, add or remove an existing row (goal_events alone may gain rows, and
-- only Echo-owned Entry events; see below). The fingerprint of a table is its row
-- count plus an md5 over every row as JSON, restricted to the columns the table had before, so a migration
-- that adds a column is not reported as a change. Temporary objects only; they end with the session.
create function pg_temp.table_fingerprint(tbl regclass, keys text[], filter text, out row_count bigint, out digest text)
language plpgsql as $$
begin
  execute format($q$
    select count(*), md5(coalesce(string_agg(r::text, E'\n' order by r::text), ''))
    from (select (select jsonb_object_agg(k, v) from jsonb_each(to_jsonb(t)) e(k, v) where k = any($1)) as r from %s t where %s) s
  $q$, tbl, filter) using keys into row_count, digest;
end $$;

create temp table apply_invariants on commit drop as
select c.oid::regclass as tbl,
       array(select attname::text from pg_attribute where attrelid = c.oid and attnum > 0 and not attisdropped) as keys
from pg_class c
where c.oid in ('public.goals'::regclass, 'public.milestones'::regclass, 'public.tasks'::regclass,
                'public.task_schedules'::regclass, 'public.task_occurrences'::regclass, 'public.task_mutation_receipts'::regclass,
                -- Goal receipts and provenance: 078 copies them into the operation ledger and must leave them untouched.
                'goal_private.operations'::regclass, 'goal_private.goal_mutations'::regclass,
                'goal_private.work_mutations'::regclass, 'goal_private.provenance'::regclass,
                -- Goal events (080) once the target has them; a later apply must not change history.
                to_regclass('goal_private.goal_events'),
                -- Phase 2 is additive: open/closed Momentum and queued Echo rows must remain byte-identical.
                'public.momentum_profiles'::regclass, 'public.momentum_weekly_snapshots'::regclass,
                'public.goal_momentum_profiles'::regclass, 'public.goal_momentum_weekly_snapshots'::regclass,
                'public.echo_entries'::regclass,
                -- Phase 3 freezes historical Vault cards and media without changing any row or object.
                'public.goal_notes'::regclass, 'public.vault_items'::regclass,
                'public.vault_note_folders'::regclass, 'storage.objects'::regclass);
-- goal_events is append-only during an apply: its existing rows (ids up to the current maximum) must stay
-- byte-identical, and invariants-after.sql allows new rows only for Entries Echo owns (Migration 086's one-time
-- backlog copy, TD-005). Every other table compares all of its rows.
alter table apply_invariants add column existing_max_id bigint, add column filter text not null default 'true',
  add column row_count bigint, add column digest text;
update apply_invariants set existing_max_id = (select coalesce(max(id), 0) from goal_private.goal_events)
where tbl = to_regclass('goal_private.goal_events');
update apply_invariants set filter = format('id <= %s', existing_max_id) where existing_max_id is not null;
update apply_invariants i set (row_count, digest) = (select f.row_count, f.digest from pg_temp.table_fingerprint(i.tbl, i.keys, i.filter) f);

\echo '-- Invariants before apply (existing rows; must be unchanged after)'
select tbl, row_count, digest from apply_invariants order by tbl::text;
