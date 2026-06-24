-- Echo-Goal links: many-to-many bridge for Option C
-- Replaces single goal_id FK for linking echo entries to goals
-- Supports manual tagging, AI suggestions, and auto-linking

create table public.echo_goal_links (
  id uuid primary key default gen_random_uuid(),
  echo_entry_id uuid not null references public.echo_entries(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  link_source text not null default 'manual' check (
    link_source in ('manual','ai_suggested','ai_auto')
  ),
  confidence double precision check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  ),
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(echo_entry_id, goal_id)
);

create index echo_goal_links_echo_entry_id_idx on public.echo_goal_links(echo_entry_id);
create index echo_goal_links_goal_id_idx on public.echo_goal_links(goal_id);

alter table public.echo_goal_links enable row level security;

create policy "Users can read their own echo links"
  on public.echo_goal_links for select using (
    exists (
      select 1
      from public.echo_entries ee
      where ee.id = public.echo_goal_links.echo_entry_id
        and ee.user_id = auth.uid()
    )
  );

create policy "Users can create echo links"
  on public.echo_goal_links for insert with check (
    exists (
      select 1
      from public.echo_entries ee
      where ee.id = public.echo_goal_links.echo_entry_id
        and ee.user_id = auth.uid()
    )
  );

create policy "Users can update their echo links"
  on public.echo_goal_links for update using (
    exists (
      select 1
      from public.echo_entries ee
      where ee.id = public.echo_goal_links.echo_entry_id
        and ee.user_id = auth.uid()
    )
  );

create policy "Users can delete their echo links"
  on public.echo_goal_links for delete using (
    exists (
      select 1
      from public.echo_entries ee
      where ee.id = public.echo_goal_links.echo_entry_id
        and ee.user_id = auth.uid()
    )
  );

-- Backfill existing echo_entries that have a goal_id
insert into public.echo_goal_links (echo_entry_id, goal_id, link_source, confirmed)
select id, goal_id, 'manual', true
from public.echo_entries
where goal_id is not null
on conflict (echo_entry_id, goal_id) do nothing;