-- ============================================================================
-- 024_agent_session_idempotency_guard.sql
-- Rejects accidental idempotency-key reuse with a different operation or
-- payload instead of silently returning an unrelated prior session event.
-- ============================================================================

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
  v_existing_type text;
  v_existing_payload jsonb;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;

  select status into v_status
  from public.echo_sessions
  where id = p_session_id and user_id = v_user_id
  for update;

  if v_status is null then raise exception 'Session not found'; end if;
  if v_status in ('published', 'failed') then raise exception 'Session is closed'; end if;

  select id, event_type, payload
  into v_event_id, v_existing_type, v_existing_payload
  from public.echo_session_events
  where session_id = p_session_id and event_key = btrim(p_event_key);

  if v_event_id is not null then
    if v_existing_type is distinct from p_event_type or v_existing_payload is distinct from v_payload then
      raise exception 'Idempotency key was already used with a different event payload';
    end if;
    return v_event_id;
  end if;

  insert into public.echo_session_events (session_id, user_id, event_key, event_type, payload)
  values (p_session_id, v_user_id, btrim(p_event_key), p_event_type, v_payload)
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
  v_existing_event_type text;
  v_existing_summary jsonb;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if jsonb_typeof(p_summary) <> 'object' then raise exception 'summary must be an object'; end if;

  select status, echo_sessions.final_entry_id, summary
  into v_status, v_final_entry_id, v_existing_summary
  from public.echo_sessions
  where id = p_session_id and user_id = v_user_id
  for update;

  if v_status is null then raise exception 'Session not found'; end if;

  select event_type into v_existing_event_type
  from public.echo_session_events
  where session_id = p_session_id and event_key = btrim(p_idempotency_key);

  if v_existing_event_type is not null then
    if v_existing_event_type <> 'finish' then
      raise exception 'Idempotency key was already used for another operation';
    end if;
    if v_existing_summary is distinct from p_summary then
      raise exception 'Idempotency key was already used with a different summary';
    end if;
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
  v_existing_event_type text;
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

  select event_type into v_existing_event_type
  from public.echo_session_events
  where session_id = p_session_id and event_key = btrim(p_idempotency_key);

  if v_existing_event_type is not null then
    raise exception 'Idempotency key was already used for another operation';
  end if;

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
