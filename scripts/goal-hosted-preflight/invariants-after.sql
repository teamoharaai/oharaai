-- --apply only: recompute the fingerprints from invariants-before.sql after the pending migrations (and the
-- rolled-back probes) and abort the apply transaction if any existing row changed.
do $$
declare changed text;
begin
  select string_agg(format('%s (rows %s -> %s)', i.tbl, i.row_count, f.row_count), ', ' order by i.tbl::text) into changed
  from apply_invariants i, pg_temp.table_fingerprint(i.tbl, i.keys) f
  where (f.row_count, f.digest) is distinct from (i.row_count, i.digest);
  if changed is not null then
    raise exception 'APPLY_INVARIANT_CHANGED: existing rows changed in %; nothing is committed', changed;
  end if;
end $$;
\echo 'invariants: existing domain rows and archived media unchanged'
