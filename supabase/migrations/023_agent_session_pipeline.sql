-- ============================================================================
-- 023_agent_session_pipeline.sql
-- Adds the durable, idempotent session ledger used by coding agents and moves
-- Echo entry + confirmed-container creation behind one database transaction.
-- ============================================================================

-- Structured project periods ------------------------------------------------
alter table public.projects
  add column start_date date,
  add column end_date date,
  add column period_key text;

alter table public.projects
  add constraint projects_period_dates_check
  check (start_date is null or end_date is null or start_date <= end_date),
  add constraint projects_period_key_check
  check (period_key is null or char_length(btrim(period_key)) between 1 and 100);

create unique index projects_user_period_key_idx
  on public.projects (user_id, period_key)
  where period_key is not null;

-- Promote echo_sessions into the agent session ledger -----------------------
alter table public.echo_sessions
  add column project_id uuid references public.projects(id) on delete set null,
  add column external_session_id text,
  add column status text not null default 'active',
  add column final_entry_id uuid references public.echo_entries(id) on delete set null,
  add column started_at timestamptz,
  add column completed_at timestamptz,
  add column updated_at timestamptz not null default now();

update public.echo_sessions
set started_at = created_at
where started_at is null;

alter table public.echo_sessions
  alter column summary set default '{}'::jsonb,
  alter column started_at set default now(),
  alter column started_at set not null,
  add constraint echo_sessions_external_id_check
    check (
      external_session_id is null
      or char_length(btrim(external_session_id)) between 1 and 200
    ),
  add constraint echo_sessions_status_check
    check (status in ('active', 'draft', 'published', 'failed'));

create unique index echo_sessions_user_external_id_idx
  on public.echo_sessions (user_id, external_session_id)
  where external_session_id is not null;

create index echo_sessions_project_id_idx on public.echo_sessions (project_id);
create index echo_sessions_status_idx on public.echo_sessions (user_id, status);

create trigger echo_sessions_updated_at
  before update on public.echo_sessions
  for each row execute function public.handle_updated_at();

-- Idempotent change/event records for each agent session --------------------
create table public.echo_session_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.echo_sessions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_key   text not null,
  event_type  text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  constraint echo_session_events_event_key_check
    check (char_length(btrim(event_key)) between 1 and 200),
  constraint echo_session_events_event_type_check
    check (event_type in ('change', 'database_record', 'verification', 'failure', 'note', 'finish', 'publish')),
  constraint echo_session_events_payload_check
    check (jsonb_typeof(payload) = 'object'),
  unique (session_id, event_key)
);

create index echo_session_events_session_created_idx
  on public.echo_session_events (session_id, created_at);

alter table public.echo_session_events enable row level security;

create policy "Users can select own echo session events"
  on public.echo_session_events for select
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.echo_sessions s
      where s.id = echo_session_events.session_id and s.user_id = auth.uid()
    )
  );

create policy "Users can insert own echo session events"
  on public.echo_session_events for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.echo_sessions s
      where s.id = echo_session_events.session_id and s.user_id = auth.uid()
    )
  );

-- Events are immutable. Idempotent replays return the existing row instead of
-- updating or deleting the audit trail.

-- Atomic Echo entry + confirmed-container creation --------------------------
create or replace function public.create_echo_entry_with_container(
  p_content text,
  p_title text,
  p_goal_id uuid,
  p_ai_insight_requested boolean,
  p_brt jsonb,
  p_emotion jsonb,
  p_embedding_text text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry_id uuid;
  v_folder_id uuid;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_content is null or char_length(btrim(p_content)) = 0 or char_length(p_content) > 20000 then
    raise exception 'content must contain 1 to 20000 characters';
  end if;

  if p_title is not null and char_length(p_title) > 200 then
    raise exception 'title must contain at most 200 characters';
  end if;

  if p_goal_id is not null and not exists (
    select 1 from public.goals g where g.id = p_goal_id and g.user_id = v_user_id
  ) then
    raise exception 'Goal not found';
  end if;

  insert into public.echo_entries (
    user_id,
    content,
    title,
    ai_insight_requested,
    brt,
    emotion,
    embedding_text,
    ai_status
  )
  values (
    v_user_id,
    btrim(p_content),
    nullif(btrim(p_title), ''),
    coalesce(p_ai_insight_requested, false),
    p_brt,
    p_emotion,
    p_embedding_text,
    case when coalesce(p_ai_insight_requested, false) then 'pending' else 'not_requested' end
  )
  returning id into v_entry_id;

  if p_goal_id is not null then
    insert into public.echo_entry_links (
      echo_entry_id, goal_id, container_type, link_source, confirmed
    )
    values (v_entry_id, p_goal_id, 'goal', 'manual', true);
  else
    insert into public.echo_folders (user_id, name, is_general)
    values (v_user_id, 'General', true)
    on conflict (user_id) where (is_general = true) do nothing;

    select id into v_folder_id
    from public.echo_folders
    where user_id = v_user_id and is_general = true;

    if v_folder_id is null then
      raise exception 'General folder could not be resolved';
    end if;

    insert into public.echo_entry_links (
      echo_entry_id, folder_id, container_type, link_source, confirmed
    )
    values (v_entry_id, v_folder_id, 'folder', 'system_default', true);
  end if;

  return v_entry_id;
end;
$$;

-- Idempotent session lifecycle ----------------------------------------------
create or replace function public.start_agent_session(
  p_external_session_id text,
  p_project_id uuid,
  p_project_title text,
  p_project_description text,
  p_period_key text,
  p_start_date date,
  p_end_date date,
  p_goal_title text,
  p_goal_description text,
  p_goal_category text,
  p_goal_color_theme text
)
returns table(session_id uuid, project_id uuid, goal_id uuid, was_created boolean)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_project_id uuid;
  v_goal_id uuid;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if p_external_session_id is null or char_length(btrim(p_external_session_id)) not between 1 and 200 then
    raise exception 'external_session_id must contain 1 to 200 characters';
  end if;
  if p_period_key is null or char_length(btrim(p_period_key)) not between 1 and 100 then
    raise exception 'period_key must contain 1 to 100 characters';
  end if;
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception 'A valid project date range is required';
  end if;
  if p_goal_title is null or char_length(btrim(p_goal_title)) not between 1 and 200 then
    raise exception 'goal title must contain 1 to 200 characters';
  end if;
  if p_goal_category not in ('body', 'mind', 'money', 'create', 'connect', 'contribute') then
    raise exception 'Invalid goal category';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':' || btrim(p_external_session_id), 0)
  );

  select s.id, s.project_id, s.goal_id
  into v_session_id, v_project_id, v_goal_id
  from public.echo_sessions s
  where s.user_id = v_user_id
    and s.external_session_id = btrim(p_external_session_id);

  if v_session_id is not null then
    return query select v_session_id, v_project_id, v_goal_id, false;
    return;
  end if;

  if p_project_id is not null then
    select p.id into v_project_id
    from public.projects p
    where p.id = p_project_id and p.user_id = v_user_id;

    if v_project_id is null then raise exception 'Project not found'; end if;

    update public.projects
    set start_date = coalesce(start_date, p_start_date),
        end_date = coalesce(end_date, p_end_date),
        period_key = coalesce(period_key, btrim(p_period_key))
    where id = v_project_id;
  else
    insert into public.projects (
      user_id, title, description, start_date, end_date, period_key
    )
    values (
      v_user_id,
      btrim(p_project_title),
      nullif(btrim(p_project_description), ''),
      p_start_date,
      p_end_date,
      btrim(p_period_key)
    )
    on conflict (user_id, period_key) where (period_key is not null)
    do update set
      start_date = coalesce(public.projects.start_date, excluded.start_date),
      end_date = coalesce(public.projects.end_date, excluded.end_date)
    returning id into v_project_id;
  end if;

  insert into public.goals (
    user_id,
    title,
    description,
    category,
    color_theme,
    deadline,
    project_id,
    smart_data,
    ai_generated
  )
  values (
    v_user_id,
    btrim(p_goal_title),
    nullif(btrim(p_goal_description), ''),
    p_goal_category,
    p_goal_color_theme,
    p_end_date::timestamptz,
    v_project_id,
    '{}'::jsonb,
    false
  )
  returning id into v_goal_id;

  insert into public.echo_sessions (
    goal_id,
    project_id,
    user_id,
    external_session_id,
    status,
    summary
  )
  values (
    v_goal_id,
    v_project_id,
    v_user_id,
    btrim(p_external_session_id),
    'active',
    jsonb_build_object('version', 1, 'state', 'active')
  )
  returning id into v_session_id;

  return query select v_session_id, v_project_id, v_goal_id, true;
end;
$$;

create or replace function public.record_agent_session_change(
  p_session_id uuid,
  p_event_key text,
  p_event_type text,
  p_payload jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_event_id uuid;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;

  select status into v_status
  from public.echo_sessions
  where id = p_session_id and user_id = v_user_id
  for update;

  if v_status is null then raise exception 'Session not found'; end if;
  if v_status in ('published', 'failed') then raise exception 'Session is closed'; end if;

  select id into v_event_id
  from public.echo_session_events
  where session_id = p_session_id and event_key = btrim(p_event_key);

  if v_event_id is not null then return v_event_id; end if;

  insert into public.echo_session_events (session_id, user_id, event_key, event_type, payload)
  values (p_session_id, v_user_id, btrim(p_event_key), p_event_type, coalesce(p_payload, '{}'::jsonb))
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.finish_agent_session(
  p_session_id uuid,
  p_idempotency_key text,
  p_summary jsonb
)
returns table(session_status text, final_entry_id uuid, requires_approval boolean)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_final_entry_id uuid;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if jsonb_typeof(p_summary) <> 'object' then raise exception 'summary must be an object'; end if;

  select status, echo_sessions.final_entry_id
  into v_status, v_final_entry_id
  from public.echo_sessions
  where id = p_session_id and user_id = v_user_id
  for update;

  if v_status is null then raise exception 'Session not found'; end if;

  if exists (
    select 1 from public.echo_session_events
    where session_id = p_session_id and event_key = btrim(p_idempotency_key)
  ) then
    return query select v_status, v_final_entry_id, v_status = 'draft';
    return;
  end if;

  if v_status <> 'active' then raise exception 'Only an active session can be finished'; end if;

  update public.echo_sessions
  set summary = p_summary,
      status = 'draft',
      completed_at = now()
  where id = p_session_id;

  insert into public.echo_session_events (session_id, user_id, event_key, event_type, payload)
  values (
    p_session_id,
    v_user_id,
    btrim(p_idempotency_key),
    'finish',
    jsonb_build_object('status', 'draft', 'requires_approval', true)
  );

  return query select 'draft'::text, null::uuid, true;
end;
$$;

create or replace function public.publish_agent_session(
  p_session_id uuid,
  p_idempotency_key text,
  p_user_approved boolean,
  p_title text,
  p_content text,
  p_embedding_text text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_goal_id uuid;
  v_entry_id uuid;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if p_user_approved is distinct from true then
    raise exception 'Explicit user approval is required before publishing';
  end if;

  select status, goal_id, final_entry_id
  into v_status, v_goal_id, v_entry_id
  from public.echo_sessions
  where id = p_session_id and user_id = v_user_id
  for update;

  if v_status is null then raise exception 'Session not found'; end if;
  if v_entry_id is not null then return v_entry_id; end if;
  if v_status <> 'draft' then raise exception 'Session must be reviewed as a draft before publishing'; end if;

  v_entry_id := public.create_echo_entry_with_container(
    p_content,
    p_title,
    v_goal_id,
    false,
    null,
    null,
    p_embedding_text
  );

  update public.echo_sessions
  set status = 'published', final_entry_id = v_entry_id
  where id = p_session_id;

  insert into public.echo_session_events (session_id, user_id, event_key, event_type, payload)
  values (
    p_session_id,
    v_user_id,
    btrim(p_idempotency_key),
    'publish',
    jsonb_build_object('entry_id', v_entry_id, 'user_approved', true)
  );

  return v_entry_id;
end;
$$;

revoke all on function public.create_echo_entry_with_container(text, text, uuid, boolean, jsonb, jsonb, text) from public;
revoke all on function public.start_agent_session(text, uuid, text, text, text, date, date, text, text, text, text) from public;
revoke all on function public.record_agent_session_change(uuid, text, text, jsonb) from public;
revoke all on function public.finish_agent_session(uuid, text, jsonb) from public;
revoke all on function public.publish_agent_session(uuid, text, boolean, text, text, text) from public;

grant execute on function public.create_echo_entry_with_container(text, text, uuid, boolean, jsonb, jsonb, text) to authenticated;
grant execute on function public.start_agent_session(text, uuid, text, text, text, date, date, text, text, text, text) to authenticated;
grant execute on function public.record_agent_session_change(uuid, text, text, jsonb) to authenticated;
grant execute on function public.finish_agent_session(uuid, text, jsonb) to authenticated;
grant execute on function public.publish_agent_session(uuid, text, boolean, text, text, text) to authenticated;
