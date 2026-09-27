-- --apply only: fingerprint existing Goal and Task data before any pending migration runs, inside the apply
-- transaction. invariants-after.sql recomputes it after the migrations and aborts on any difference, so an
-- apply can add schema but never change, add or remove an existing row. The fingerprint of a table is its row
-- count plus an md5 over every row as JSON, restricted to the columns the table had before, so a migration
-- that adds a column is not reported as a change. Temporary objects only; they end with the session.
create function pg_temp.table_fingerprint(tbl regclass, keys text[], out row_count bigint, out digest text)
language plpgsql as $$
begin
  execute format($q$
    select count(*), md5(coalesce(string_agg(r::text, E'\n' order by r::text), ''))
    from (select (select jsonb_object_agg(k, v) from jsonb_each(to_jsonb(t)) e(k, v) where k = any($1)) as r from %s t) s
  $q$, tbl) using keys into row_count, digest;
end $$;

create temp table apply_invariants on commit drop as
select c.oid::regclass as tbl,
       array(select attname::text from pg_attribute where attrelid = c.oid and attnum > 0 and not attisdropped) as keys
from pg_class c
where c.oid in ('public.goals'::regclass, 'public.milestones'::regclass, 'public.tasks'::regclass,
                'public.task_schedules'::regclass, 'public.task_occurrences'::regclass, 'public.task_mutation_receipts'::regclass);
alter table apply_invariants add column row_count bigint, add column digest text;
update apply_invariants i set (row_count, digest) = (select f.row_count, f.digest from pg_temp.table_fingerprint(i.tbl, i.keys) f);

\echo '-- Invariants before apply (existing rows; must be unchanged after)'
select tbl, row_count, digest from apply_invariants order by tbl::text;
