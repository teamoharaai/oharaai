-- ============================================================================
-- 003_spaces_and_projects.sql
-- Narrative baseline migration 3 of 7, replacing original migrations 001-026.
-- Applied 2026-06-24 as part of migration squash; reconciled against live schema_migrations.
--
-- Scope: spaces (owner_id), space_members, on_profile_created_create_space
-- trigger, projects, and the space_id FKs on goals/projects.
--
-- Naming correction: spaces.user_id was renamed to owner_id (original
-- migration 022), but the foreign-key constraint kept its pre-rename name
-- live to this day: spaces_user_id_fkey (correctly targets owner_id, just
-- misnamed). This baseline names it spaces_owner_id_fkey for consistency.
-- ============================================================================

-- spaces ----------------------------------------------------------------
create table public.spaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null check (type in ('personal','team','institutional','community')),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  config     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index spaces_one_personal_per_user_idx
  on public.spaces (owner_id) where (type = 'personal');
create index spaces_owner_id_idx on public.spaces (owner_id);

alter table public.spaces enable row level security;

create policy "Authenticated users can create spaces" on public.spaces
  for insert with check (auth.uid() = owner_id);
create policy "Owners can delete their spaces" on public.spaces
  for delete using (owner_id = auth.uid());
create policy "Owners can update their spaces" on public.spaces
  for update using (owner_id = auth.uid());
create policy "Users can read own and member spaces" on public.spaces
  for select using (
    owner_id = auth.uid()
    or exists (select 1 from public.space_members sm where sm.space_id = spaces.id and sm.user_id = auth.uid())
  );
-- NOTE: this SELECT policy references space_members, created below in this
-- same file — fine within one transaction/file, just flagging the
-- forward-reference for reviewers reading top-to-bottom.

create trigger spaces_updated_at
  before update on public.spaces
  for each row execute function public.handle_updated_at();

-- space_members -----------------------------------------------------------
create table public.space_members (
  id        uuid primary key default gen_random_uuid(),
  space_id  uuid not null references public.spaces(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null check (role in ('owner','member','admin','instructor','student','organizer','sponsor','volunteer')),
  status    text not null default 'active' check (status in ('active','archived','invited')),
  joined_at timestamptz not null default now(),
  unique (space_id, user_id)
);

create index space_members_space_id_idx on public.space_members (space_id);
create index space_members_user_id_idx on public.space_members (user_id);

alter table public.space_members enable row level security;

create policy "Members can see their space members" on public.space_members
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.spaces s where s.id = space_members.space_id and s.owner_id = auth.uid())
  );
create policy "Space owners can manage members" on public.space_members
  for insert with check (
    exists (select 1 from public.spaces s where s.id = space_members.space_id and s.owner_id = auth.uid())
  );
create policy "Space owners can update members" on public.space_members
  for update using (
    exists (select 1 from public.spaces s where s.id = space_members.space_id and s.owner_id = auth.uid())
  );
create policy "Space owners can remove members" on public.space_members
  for delete using (
    exists (select 1 from public.spaces s where s.id = space_members.space_id and s.owner_id = auth.uid())
  );

-- on_profile_created_create_space -----------------------------------------
-- Fires AFTER INSERT on profiles, auto-provisions a personal space + owner
-- membership for the new user. Note this trigger fires on profiles, NOT on
-- auth.users — see the KNOWN GAP comment in 001_core_schema_and_rls.sql:
-- nothing currently inserts the profiles row in the first place, so this
-- trigger is correct as written but is presently unreachable in the live
-- signup flow. Reproducing live behavior faithfully, not fixing it here.
create or replace function public.handle_new_user_space()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_space_id uuid;
begin
  begin
    insert into public.spaces (name, type, owner_id, config)
    values ('Personal', 'personal', new.id, '{"llmTier":"haiku"}'::jsonb)
    on conflict (owner_id) where (type = 'personal') do nothing;

    select id into v_space_id
    from public.spaces
    where owner_id = new.id
      and type = 'personal';

    insert into public.space_members (space_id, user_id, role, status)
    values (v_space_id, new.id, 'owner', 'active')
    on conflict (space_id, user_id) do nothing;

  exception when others then
    raise warning '[handle_new_user_space] Failed to provision personal space for user %: %',
      new.id, sqlerrm;
  end;

  return new;
end;
$$;

create trigger on_profile_created_create_space
  after insert on public.profiles
  for each row execute function public.handle_new_user_space();

-- projects ------------------------------------------------------------------
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'active' check (status in ('active','complete','archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  space_id    uuid references public.spaces(id) on delete set null
);

create index idx_projects_user_id on public.projects (user_id);
create index idx_projects_status on public.projects (status);
create index projects_space_id_idx on public.projects (space_id);

alter table public.projects enable row level security;

create policy "Users can view own projects" on public.projects
  for select using (auth.uid() = user_id);
create policy "Users can insert own projects" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on public.projects
  for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on public.projects
  for delete using (auth.uid() = user_id);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();

-- goals.project_id / goals.space_id FKs — goals is created in
-- 001_core_schema_and_rls.sql (as plain uuid columns) before projects/spaces
-- exist. Added here, now that both exist, to fix the cross-file FK ordering
-- problem flagged in the original draft.
alter table public.goals
  add constraint goals_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete set null;
alter table public.goals
  add constraint goals_space_id_fkey
  foreign key (space_id) references public.spaces(id) on delete set null;
