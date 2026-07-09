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
-- Constraint-name note: link_source's check constraint was defined inline
-- in 005_echo_goal_links.sql (table named echo_goal_links at the time), so
-- Postgres auto-named it echo_goal_links_link_source_check. 012_echo_entry_
-- links.sql renamed the table to echo_entry_links but only explicitly
-- renamed the primary key, two indexes, and the (echo_entry_id, goal_id)
-- unique constraint — it did not mention this check constraint, and table
-- RENAME does not auto-rename constraint names in Postgres. The constraint
-- is therefore presumed still named echo_goal_links_link_source_check, but
-- this was not confirmed against a live schema (no Supabase credentials in
-- this environment) — both possible names are dropped defensively below via
-- IF EXISTS so this migration applies correctly regardless of which one is
-- actually live. Flagging this as the one thing worth a live
-- \d echo_entry_links check before/after applying.
-- ============================================================================

alter table public.echo_entry_links drop constraint if exists echo_goal_links_link_source_check;
alter table public.echo_entry_links drop constraint if exists echo_entry_links_link_source_check;

alter table public.echo_entry_links
  add constraint echo_entry_links_link_source_check
  check (link_source in ('manual', 'ai_suggested', 'ai_auto', 'system_default'));
