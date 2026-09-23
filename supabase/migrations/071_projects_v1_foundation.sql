-- Projects V1.0: owner-safe Goal associations, canonical Project Vaults,
-- and durable Project/Goal association history.

-- A Vault has exactly one supported parent. Existing Goal Vault IDs and
-- contents are preserved; Project Vaults are additive and never copy content.
alter table public.vaults
  alter column goal_id drop not null,
  add column project_id uuid references public.projects(id) on delete cascade;

alter table public.vaults
  add constraint vaults_exactly_one_parent_check
  check ((goal_id is not null)::integer + (project_id is not null)::integer = 1);

create unique index vaults_project_id_unique_idx
  on public.vaults (project_id)
  where project_id is not null;

create index vaults_project_id_idx
  on public.vaults (project_id)
  where project_id is not null;

create or replace function public.validate_vault_parent_owner_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_parent_owner uuid;
begin
  if (new.goal_id is not null) = (new.project_id is not null) then
    raise exception 'Vault must belong to exactly one Goal or Project';
  end if;

  if new.goal_id is not null then
    select g.user_id into v_parent_owner from public.goals g where g.id = new.goal_id;
  else
    select p.user_id into v_parent_owner from public.projects p where p.id = new.project_id;
  end if;

  if v_parent_owner is null or v_parent_owner <> new.user_id then
    raise exception 'Vault owner must match its parent owner';
  end if;
  return new;
end;
$$;

create trigger vaults_validate_parent_owner_v1
  before insert or update of user_id, goal_id, project_id on public.vaults
  for each row execute function public.validate_vault_parent_owner_v1();

insert into public.vaults (project_id, user_id, vault_type)
select p.id, p.user_id, 'personal'
from public.projects p
where not exists (
  select 1 from public.vaults v where v.project_id = p.id
)
on conflict (project_id) where project_id is not null do nothing;

create or replace function public.ensure_project_vault_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.vaults (project_id, user_id, vault_type)
  values (new.id, new.user_id, 'personal')
  on conflict (project_id) where project_id is not null do nothing;
  return new;
end;
$$;

create trigger projects_create_vault_v1
  after insert on public.projects
  for each row execute function public.ensure_project_vault_v1();

-- The database, not the UI, owns the same-owner Project/Goal invariant.
create or replace function public.validate_goal_project_owner_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_project_owner uuid;
  v_project_status text;
begin
  if new.project_id is null then return new; end if;
  select p.user_id, p.status into v_project_owner, v_project_status
  from public.projects p where p.id = new.project_id;
  if v_project_owner is null or v_project_owner <> new.user_id then
    raise exception 'Goal and Project must have the same owner';
  end if;
  if v_project_status = 'archived'
     and (tg_op = 'INSERT' or old.project_id is distinct from new.project_id) then
    raise exception 'Archived Projects cannot accept Goals';
  end if;
  return new;
end;
$$;

create trigger goals_validate_project_owner_v1
  before insert or update of user_id, project_id on public.goals
  for each row execute function public.validate_goal_project_owner_v1();

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects" on public.projects
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Append-only evidence for Project/Goal association activity. Existing
-- associations are intentionally not backfilled because their event time is
-- not historically knowable.
create table public.project_goal_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  prior_project_id uuid references public.projects(id) on delete set null,
  goal_id uuid not null references public.goals(id) on delete cascade,
  event_type text not null check (event_type in ('added','detached','reassigned')),
  occurred_at timestamptz not null default now()
);

create index project_goal_events_owner_project_time_idx
  on public.project_goal_events (owner_id, project_id, occurred_at desc);

alter table public.project_goal_events enable row level security;
create policy "Owners can read Project Goal events" on public.project_goal_events
  for select using (owner_id = auth.uid());
revoke insert, update, delete on public.project_goal_events from anon, authenticated;
grant select on public.project_goal_events to authenticated;
grant select, insert, update, delete on public.project_goal_events to service_role;

create or replace function public.record_project_goal_event_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    if new.project_id is not null then
      insert into public.project_goal_events (owner_id, project_id, goal_id, event_type)
      values (new.user_id, new.project_id, new.id, 'added');
    end if;
    return new;
  end if;

  if old.project_id is not distinct from new.project_id then return new; end if;
  if old.project_id is null then
    insert into public.project_goal_events (owner_id, project_id, goal_id, event_type)
    values (new.user_id, new.project_id, new.id, 'added');
  elsif new.project_id is null then
    insert into public.project_goal_events (owner_id, prior_project_id, goal_id, event_type)
    values (new.user_id, old.project_id, new.id, 'detached');
  else
    insert into public.project_goal_events (owner_id, project_id, prior_project_id, goal_id, event_type)
    values (new.user_id, new.project_id, old.project_id, new.id, 'reassigned');
  end if;
  return new;
end;
$$;

create trigger goals_record_project_event_v1
  after insert or update of project_id on public.goals
  for each row execute function public.record_project_goal_event_v1();

create or replace function public.assign_goals_to_project_v1(
  p_project_id uuid,
  p_goal_ids uuid[],
  p_allow_reassignment boolean default false
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if not exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.user_id = auth.uid() and p.status <> 'archived'
  ) then raise exception 'Project not found or archived'; end if;
  if exists (
    select 1 from unnest(coalesce(p_goal_ids, '{}'::uuid[])) requested(id)
    left join public.goals g on g.id = requested.id and g.user_id = auth.uid()
    where g.id is null
  ) then raise exception 'Invalid Goal selection'; end if;
  if not p_allow_reassignment and exists (
    select 1 from public.goals g
    where g.id = any(coalesce(p_goal_ids, '{}'::uuid[]))
      and g.user_id = auth.uid()
      and g.project_id is not null
      and g.project_id <> p_project_id
  ) then raise exception 'A selected Goal already belongs to another Project'; end if;

  update public.goals
  set project_id = p_project_id
  where id = any(coalesce(p_goal_ids, '{}'::uuid[]))
    and user_id = auth.uid()
    and project_id is distinct from p_project_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.detach_goal_from_project_v1(
  p_project_id uuid,
  p_goal_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  update public.goals
  set project_id = null
  where id = p_goal_id and project_id = p_project_id and user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.create_project_v1(
  p_title text,
  p_description text default null,
  p_goal_ids uuid[] default '{}'::uuid[],
  p_allow_reassignment boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_project_id uuid;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 200 then
    raise exception 'Project name must contain 1 to 200 characters';
  end if;
  if p_description is not null and char_length(p_description) > 4000 then
    raise exception 'Project description is too long';
  end if;

  insert into public.projects (user_id, title, description)
  values (auth.uid(), btrim(p_title), nullif(btrim(p_description), ''))
  returning id into v_project_id;

  perform public.assign_goals_to_project_v1(
    v_project_id,
    coalesce(p_goal_ids, '{}'::uuid[]),
    p_allow_reassignment
  );
  return v_project_id;
end;
$$;

revoke all on function public.assign_goals_to_project_v1(uuid, uuid[], boolean) from public, anon;
grant execute on function public.assign_goals_to_project_v1(uuid, uuid[], boolean) to authenticated;
revoke all on function public.detach_goal_from_project_v1(uuid, uuid) from public, anon;
grant execute on function public.detach_goal_from_project_v1(uuid, uuid) to authenticated;
revoke all on function public.create_project_v1(text, text, uuid[], boolean) from public, anon;
grant execute on function public.create_project_v1(text, text, uuid[], boolean) to authenticated;

comment on column public.vaults.project_id is
  'Projects V1.0 canonical Project parent. Exactly one of goal_id/project_id is set.';
comment on table public.project_goal_events is
  'Append-only evidence for Project Goal association activity; no historical backfill.';
