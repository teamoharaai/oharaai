-- --apply only: recompute the fingerprints from invariants-before.sql after the pending migrations (and the
-- rolled-back probes) and abort the apply transaction if any existing row changed.
do $$
declare changed text;
begin
  select string_agg(format('%s (rows %s -> %s)', i.tbl, i.row_count, f.row_count), ', ' order by i.tbl::text) into changed
  from apply_invariants i, pg_temp.table_fingerprint(i.tbl, i.keys, i.filter) f
  where (f.row_count, f.digest) is distinct from (i.row_count, i.digest);
  if changed is not null then
    raise exception 'APPLY_INVARIANT_CHANGED: existing rows changed in %; nothing is committed', changed;
  end if;
  -- goal_events may only gain events for Echo-owned Entries (see invariants-before.sql).
  select format('%s new goal_events rows that are not Echo-owned Entry events', count(*)) into changed
  from apply_invariants i join goal_private.goal_events e on e.id > i.existing_max_id
  where i.existing_max_id is not null
    and not (e.kind = 'entry_created' and exists (select 1 from public.echo_entries ee where ee.id = e.entity_id))
  having count(*) > 0;
  if changed is not null then
    raise exception 'APPLY_INVARIANT_CHANGED: %; nothing is committed', changed;
  end if;
end $$;
\echo '-- goal_events added by this apply (Echo-owned Entry events only)'
select count(*) as added_echo_entry_events from apply_invariants i
join goal_private.goal_events e on e.id > i.existing_max_id
where i.existing_max_id is not null;
\echo 'invariants: existing domain rows and archived media unchanged'
