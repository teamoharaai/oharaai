-- Calendar export identity is private to the exporting user. The linked OHARA
-- object remains canonical; deleting or changing an Apple event never mutates it.

begin;

create table public.calendar_external_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('task_occurrence','milestone','goal_deadline')),
  entity_id uuid not null,
  provider text not null check (provider in ('apple','google')),
  external_calendar_id text,
  external_event_id text,
  reservation_key text,
  sync_state text not null default 'creating'
    check (sync_state in ('creating','active','missing','failed','unlinked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  unique (user_id, entity_type, entity_id, provider),
  check (external_calendar_id is null or char_length(external_calendar_id) between 1 and 2048),
  check (external_event_id is null or char_length(external_event_id) between 1 and 2048),
  check (reservation_key is null or char_length(reservation_key) between 1 and 200),
  check (sync_state <> 'active' or (external_calendar_id is not null and external_event_id is not null))
);

create index calendar_external_links_user_state_idx
  on public.calendar_external_links(user_id, sync_state, updated_at desc);

alter table public.calendar_external_links enable row level security;

create policy calendar_external_links_select_own on public.calendar_external_links
  for select using (user_id = auth.uid());

revoke all on public.calendar_external_links from public, anon, authenticated;
grant select on public.calendar_external_links to authenticated;

create or replace function public.calendar_entity_exportable_v1(
  p_user_id uuid,
  p_entity_type text,
  p_entity_id uuid
) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select case p_entity_type
    when 'task_occurrence' then exists (
      select 1
      from public.task_occurrences occurrence
      join public.tasks task on task.id = occurrence.task_id
      join public.goals goal on goal.id = task.goal_id
      where occurrence.id = p_entity_id
        and occurrence.status <> 'cancelled'
        and task.status = 'active'
        and goal.status = 'active'
        and (
          (goal.project_id is null and goal.user_id = p_user_id)
          or (goal.project_id is not null and public.is_project_member_v11(goal.project_id, p_user_id))
        )
        and (
          task.assigned_to = p_user_id
          or task.created_by = p_user_id
          or (task.created_by is null and task.user_id = p_user_id)
        )
    )
    when 'milestone' then exists (
      select 1
      from public.milestones milestone
      join public.goals goal on goal.id = milestone.goal_id
      where milestone.id = p_entity_id
        and milestone.due_date is not null
        and goal.status = 'active'
        and (
          (goal.project_id is null and goal.user_id = p_user_id)
          or (goal.project_id is not null and public.is_project_member_v11(goal.project_id, p_user_id))
        )
        and (
          milestone.responsible_user_id = p_user_id
          or milestone.created_by = p_user_id
          or (milestone.created_by is null and milestone.user_id = p_user_id)
        )
    )
    when 'goal_deadline' then exists (
      select 1
      from public.goals goal
      where goal.id = p_entity_id
        and goal.deadline is not null
        and goal.status = 'active'
        and (
          (goal.project_id is null and goal.user_id = p_user_id)
          or (goal.project_id is not null and public.is_project_member_v11(goal.project_id, p_user_id))
        )
        and (goal.user_id = p_user_id or goal.project_lead_id = p_user_id)
    )
    else false
  end
$$;

revoke all on function public.calendar_entity_exportable_v1(uuid,text,uuid) from public, anon, authenticated;

create or replace function public.reserve_calendar_external_link_v1(
  p_entity_type text,
  p_entity_id uuid,
  p_provider text,
  p_external_calendar_id text,
  p_reservation_key text
) returns public.calendar_external_links
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := auth.uid();
  existing public.calendar_external_links;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if p_entity_type not in ('task_occurrence','milestone','goal_deadline') then raise exception 'Invalid calendar entity type'; end if;
  if p_provider <> 'apple' then raise exception 'Calendar provider is not available'; end if;
  if nullif(btrim(p_external_calendar_id),'') is null then raise exception 'Destination calendar is required'; end if;
  if nullif(btrim(p_reservation_key),'') is null then raise exception 'Calendar export operation is required'; end if;
  if not public.calendar_entity_exportable_v1(actor,p_entity_type,p_entity_id) then raise exception 'Calendar item is not exportable'; end if;

  perform pg_advisory_xact_lock(hashtextextended(actor::text || ':' || p_entity_type || ':' || p_entity_id::text || ':' || p_provider, 0));
  select * into existing
  from public.calendar_external_links
  where user_id=actor and entity_type=p_entity_type and entity_id=p_entity_id and provider=p_provider
  for update;

  if found and existing.sync_state = 'active' then return existing; end if;
  if found and existing.sync_state = 'creating'
    and (existing.reservation_key = p_reservation_key or existing.updated_at > now() - interval '5 minutes') then
    return existing;
  end if;

  if found then
    update public.calendar_external_links set
      external_calendar_id=btrim(p_external_calendar_id),
      external_event_id=null,
      reservation_key=btrim(p_reservation_key),
      sync_state='creating',
      updated_at=now(),
      last_synced_at=null
    where id=existing.id returning * into existing;
    return existing;
  end if;

  insert into public.calendar_external_links(user_id,entity_type,entity_id,provider,external_calendar_id,reservation_key,sync_state)
  values(actor,p_entity_type,p_entity_id,p_provider,btrim(p_external_calendar_id),btrim(p_reservation_key),'creating')
  returning * into existing;
  return existing;
end;
$$;

create or replace function public.finalize_calendar_external_link_v1(
  p_link_id uuid,
  p_reservation_key text,
  p_external_calendar_id text,
  p_external_event_id text
) returns public.calendar_external_links
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := auth.uid();
  result public.calendar_external_links;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if nullif(btrim(p_external_calendar_id),'') is null or nullif(btrim(p_external_event_id),'') is null then
    raise exception 'External Calendar identity is required';
  end if;
  update public.calendar_external_links set
    external_calendar_id=btrim(p_external_calendar_id),
    external_event_id=btrim(p_external_event_id),
    sync_state='active',
    updated_at=now(),
    last_synced_at=now()
  where id=p_link_id and user_id=actor and provider='apple'
    and sync_state='creating' and reservation_key=p_reservation_key
    and public.calendar_entity_exportable_v1(actor,entity_type,entity_id)
  returning * into result;
  if result.id is null then raise exception 'Calendar link not found'; end if;
  return result;
end;
$$;

create or replace function public.set_calendar_external_link_state_v1(
  p_link_id uuid,
  p_sync_state text
) returns public.calendar_external_links
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := auth.uid();
  result public.calendar_external_links;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if p_sync_state not in ('missing','failed','unlinked') then raise exception 'Invalid Calendar link state'; end if;
  update public.calendar_external_links set sync_state=p_sync_state,updated_at=now()
  where id=p_link_id and user_id=actor returning * into result;
  if result.id is null then raise exception 'Calendar link not found'; end if;
  return result;
end;
$$;

revoke all on function public.reserve_calendar_external_link_v1(text,uuid,text,text,text) from public, anon;
revoke all on function public.finalize_calendar_external_link_v1(uuid,text,text,text) from public, anon;
revoke all on function public.set_calendar_external_link_state_v1(uuid,text) from public, anon;
grant execute on function public.reserve_calendar_external_link_v1(text,uuid,text,text,text) to authenticated;
grant execute on function public.finalize_calendar_external_link_v1(uuid,text,text,text) to authenticated;
grant execute on function public.set_calendar_external_link_state_v1(uuid,text) to authenticated;

comment on table public.calendar_external_links is
  'Owner-private identity for explicit OHARA-to-external-calendar exports. External events never become canonical OHARA data.';

commit;
