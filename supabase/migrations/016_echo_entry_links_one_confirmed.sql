-- ============================================================================
-- 016_echo_entry_links_one_confirmed.sql
-- Codifies the container-model invariant that an Echo entry lives in exactly
-- one place at a time: at most one confirmed=true row per echo_entry_id in
-- echo_entry_links. This is the "an entry is never linked to both a goal and
-- a folder simultaneously" rule (and never two confirmed goals) — until now it
-- was only assumed, relied on by getEntryContainer() / moveEntryContainer()'s
-- .maybeSingle() (which would throw, not silently pick, on a duplicate) and by
-- the client's canonical-container read added in Session 4.1.
--
-- Partial unique index (mirrors echo_folders_one_general_per_user in 013): the
-- predicate leaves unconfirmed ai_suggested/ai_auto rows entirely unconstrained
-- — an entry may still carry any number of those advisory links — while
-- guaranteeing the single confirmed "home" row the container model depends on.
-- Zero production data at time of writing (pre-pilot), so no dedup ceremony is
-- needed before the index is created.
-- ============================================================================

create unique index echo_entry_links_one_confirmed_per_entry
  on public.echo_entry_links (echo_entry_id)
  where (confirmed = true);
