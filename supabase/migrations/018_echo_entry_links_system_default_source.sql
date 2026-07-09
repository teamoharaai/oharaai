-- ============================================================================
-- 018_echo_entry_links_system_default_source.sql
-- Widens echo_entry_links.link_source's allowed values to add
-- 'system_default', needed by createEntry()'s revised container-less save
-- path (features/echo/services/echo-service.ts, landing alongside this
-- migration): when no goalId is provided, the entry is now unconditionally
-- assigned a confirmed link to the caller's General folder. That assignment
-- is neither the user's manual choice ('manual') nor an AI classification
-- ('ai_suggested' / 'ai_auto') — it's deterministic system provisioning, the
-- same category of action as get_or_create_general_folder() itself.
-- Existing values are untouched; this only widens the allowed set.
--
-- Constraint-name resolution: link_source's check constraint was defined
-- inline in 005_echo_goal_links.sql (table named echo_goal_links at the
-- time), so Postgres auto-named it echo_goal_links_link_source_check.
-- 012_echo_entry_links.sql renamed the table to echo_entry_links but only
-- explicitly renamed the primary key, two indexes, and the (echo_entry_id,
-- goal_id) unique constraint — it did not mention this check constraint,
-- and table RENAME does not auto-rename constraint names in Postgres. An
-- earlier version of this migration guessed between the two plausible names
-- via two DROP CONSTRAINT IF EXISTS statements. Replaced with a dynamic
-- lookup instead: query pg_constraint directly for whatever check
-- constraint currently references link_source and drop that, by its actual
-- name, whatever it turns out to be. This makes the migration correct
-- regardless of which name is live, without requiring a live schema check
-- to confirm it first — the discovery happens at apply time, against
-- whatever the real schema is.
-- ============================================================================

do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.echo_entry_links'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%link_source%';

  if v_constraint_name is not null then
    execute format('alter table public.echo_entry_links drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.echo_entry_links
  add constraint echo_entry_links_link_source_check
  check (link_source in ('manual', 'ai_suggested', 'ai_auto', 'system_default'));
