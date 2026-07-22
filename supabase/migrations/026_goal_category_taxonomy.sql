-- Migration 026: expand the goal category taxonomy
--
-- Legacy category values remain valid for existing goals. New goal creation can
-- use the seven-category taxonomy introduced by the redesigned creation flow.

alter table public.goals
  drop constraint if exists goals_category_check;

alter table public.goals
  add constraint goals_category_check
  check (
    category in (
      'body',
      'mind',
      'money',
      'create',
      'connect',
      'contribute',
      'health',
      'finance',
      'career',
      'creative',
      'education',
      'relationships',
      'growth'
    )
  );

-- start_agent_session has its own category guard in addition to the goals
-- table constraint, so keep that RPC aligned with the expanded taxonomy.
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
  if p_goal_category is null or p_goal_category not in (
    'body',
    'mind',
    'money',
    'create',
    'connect',
    'contribute',
    'health',
    'finance',
    'career',
    'creative',
    'education',
    'relationships',
    'growth'
  ) then
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
