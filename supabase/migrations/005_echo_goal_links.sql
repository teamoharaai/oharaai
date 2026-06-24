-- ============================================================================
-- 005_echo_goal_links.sql
-- Narrative baseline migration 5 of 7, replacing original migrations 001-026.
-- DRAFT — not yet applied.
--
-- Scope: echo_goal_links bridge table (many-to-many, confidence numeric).
-- Original migrations: 018 created confidence as double precision; 019
-- altered it to numeric. This baseline declares numeric directly (final
-- live state), no intermediate double precision step.
-- ============================================================================

create table public.echo_goal_links (
  id             uuid primary key default gen_random_uuid(),
  echo_entry_id  uuid not null references public.echo_entries(id) on delete cascade,
  goal_id        uuid not null references public.goals(id) on delete cascade,
  link_source    text not null default 'manual' check (link_source in ('manual','ai_suggested','ai_auto')),
  confidence     numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  confirmed      boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (echo_entry_id, goal_id)
);

create index echo_goal_links_echo_entry_id_idx on public.echo_goal_links (echo_entry_id);
create index echo_goal_links_goal_id_idx on public.echo_goal_links (goal_id);

alter table public.echo_goal_links enable row level security;

create policy "Users can read their own echo links" on public.echo_goal_links
  for select using (
    exists (select 1 from public.echo_entries ee where ee.id = echo_goal_links.echo_entry_id and ee.user_id = auth.uid())
  );
create policy "Users can create echo links" on public.echo_goal_links
  for insert with check (
    exists (select 1 from public.echo_entries ee where ee.id = echo_goal_links.echo_entry_id and ee.user_id = auth.uid())
  );
create policy "Users can update their echo links" on public.echo_goal_links
  for update using (
    exists (select 1 from public.echo_entries ee where ee.id = echo_goal_links.echo_entry_id and ee.user_id = auth.uid())
  );
create policy "Users can delete their echo links" on public.echo_goal_links
  for delete using (
    exists (select 1 from public.echo_entries ee where ee.id = echo_goal_links.echo_entry_id and ee.user_id = auth.uid())
  );

-- NOTE: original migration 018 also backfilled echo_goal_links from
-- echo_entries.goal_id for entries that predated the bridge table. Since
-- this is a fresh baseline (no data to backfill against in a pre-pilot,
-- zero-production-data environment), that backfill INSERT is intentionally
-- omitted here. If this baseline is ever applied to an environment that DOES
-- have existing echo_entries.goal_id data, that backfill needs to be added
-- back. Flagged in summary.
