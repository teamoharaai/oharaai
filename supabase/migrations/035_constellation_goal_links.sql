-- ============================================================================
-- 035_constellation_goal_links.sql
-- Owner-authored, private, undirected goal-to-goal links for Constellation.
-- System-managed constellation_edges remain unchanged and read-only.
-- ============================================================================

create table public.constellation_goal_links (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  source_goal_id  uuid not null,
  target_goal_id  uuid not null,
  note            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint constellation_goal_links_distinct_goals_check
    check (source_goal_id <> target_goal_id),
  constraint constellation_goal_links_canonical_pair_check
    check (source_goal_id::text < target_goal_id::text),
  constraint constellation_goal_links_note_check
    check (
      note = btrim(note)
      and char_length(note) between 1 and 280
    ),
  constraint constellation_goal_links_source_owner_fkey
    foreign key (source_goal_id, owner_id)
    references public.goals(id, user_id)
    on delete cascade,
  constraint constellation_goal_links_target_owner_fkey
    foreign key (target_goal_id, owner_id)
    references public.goals(id, user_id)
    on delete cascade
);

create unique index constellation_goal_links_unique_pair_idx
  on public.constellation_goal_links (
    owner_id,
    least(source_goal_id, target_goal_id),
    greatest(source_goal_id, target_goal_id)
  );

create index constellation_goal_links_source_lookup_idx
  on public.constellation_goal_links (owner_id, source_goal_id, updated_at desc);

create index constellation_goal_links_target_lookup_idx
  on public.constellation_goal_links (owner_id, target_goal_id, updated_at desc);

create or replace function public.validate_constellation_goal_link_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  source_count integer;
  target_count integer;
  first_goal uuid;
  second_goal uuid;
begin
  if new.source_goal_id::text < new.target_goal_id::text then
    first_goal := new.source_goal_id;
    second_goal := new.target_goal_id;
  else
    first_goal := new.target_goal_id;
    second_goal := new.source_goal_id;
  end if;

  -- Serialize link creation per endpoint so concurrent inserts cannot bypass
  -- the six-user-links-per-goal product limit.
  perform pg_advisory_xact_lock(
    hashtextextended(
      'constellation_goal_link:' || new.owner_id::text || ':' || first_goal::text,
      0
    )
  );
  perform pg_advisory_xact_lock(
    hashtextextended(
      'constellation_goal_link:' || new.owner_id::text || ':' || second_goal::text,
      0
    )
  );

  select count(*)
  into source_count
  from public.constellation_goal_links link
  where link.owner_id = new.owner_id
    and (
      link.source_goal_id = new.source_goal_id
      or link.target_goal_id = new.source_goal_id
    );

  select count(*)
  into target_count
  from public.constellation_goal_links link
  where link.owner_id = new.owner_id
    and (
      link.source_goal_id = new.target_goal_id
      or link.target_goal_id = new.target_goal_id
    );

  if source_count >= 6 or target_count >= 6 then
    raise exception using
      errcode = '23514',
      message = 'a Constellation goal may have at most six user-authored links';
  end if;

  return new;
end;
$$;

create trigger constellation_goal_links_limit
  before insert on public.constellation_goal_links
  for each row execute function public.validate_constellation_goal_link_limit();

create or replace function public.protect_constellation_goal_link_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id <> old.owner_id
    or new.source_goal_id <> old.source_goal_id
    or new.target_goal_id <> old.target_goal_id
  then
    raise exception using
      errcode = '23514',
      message = 'constellation goal link identity is immutable';
  end if;

  return new;
end;
$$;

create trigger constellation_goal_links_protect_identity
  before update of owner_id, source_goal_id, target_goal_id
  on public.constellation_goal_links
  for each row execute function public.protect_constellation_goal_link_identity();

create trigger constellation_goal_links_updated_at
  before update on public.constellation_goal_links
  for each row execute function public.handle_updated_at();

alter table public.constellation_goal_links enable row level security;

create policy "Users can read own constellation goal links"
  on public.constellation_goal_links
  for select
  using (owner_id = auth.uid());

create policy "Users can create own constellation goal links"
  on public.constellation_goal_links
  for insert
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.goals goal
      where goal.id = source_goal_id
        and goal.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.goals goal
      where goal.id = target_goal_id
        and goal.user_id = auth.uid()
    )
  );

create policy "Users can update own constellation goal link notes"
  on public.constellation_goal_links
  for update
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.goals goal
      where goal.id = source_goal_id
        and goal.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.goals goal
      where goal.id = target_goal_id
        and goal.user_id = auth.uid()
    )
  );

create policy "Users can delete own constellation goal links"
  on public.constellation_goal_links
  for delete
  using (owner_id = auth.uid());
