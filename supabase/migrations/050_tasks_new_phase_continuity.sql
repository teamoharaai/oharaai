-- Migration 050: carry canonical active Task definitions into a successor Goal.
-- Historical occurrences and legacy Tracker rows remain on the predecessor.

create or replace function public.start_goal_new_phase_v1(
  p_previous_goal_id uuid,
  p_deadline timestamptz,
  p_title text default null,
  p_reflection text default null,
  p_embedding_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_previous public.goals;
  v_goal_id uuid;
  v_summary jsonb;
  v_milestone_map jsonb := '{}'::jsonb;
  v_milestone record;
  v_new_milestone_id uuid;
  v_task record;
  v_new_task_id uuid;
  v_schedule record;
  v_new_schedule_id uuid;
  v_schedule_start date;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_deadline is null or p_deadline <= now() then
    raise exception 'New phase deadline must be in the future';
  end if;

  select * into v_previous
  from public.goals
  where id = p_previous_goal_id and user_id = auth.uid()
  for update;

  if v_previous.id is null then raise exception 'Goal not found'; end if;
  if v_previous.status not in ('active', 'expired') then
    raise exception 'Only active or expired Goals can begin a new phase';
  end if;
  if exists (select 1 from public.goals where previous_goal_id = v_previous.id) then
    raise exception 'Goal has already been extended' using errcode = '23505';
  end if;

  select coalesce(jsonb_agg(item order by sort_order), '[]'::jsonb)
  into v_summary
  from (
    select
      task.sort_order,
      jsonb_build_object(
        'title', task.title,
        'completed_occurrences', count(occurrence.id) filter (where occurrence.status = 'completed'),
        'recorded_quantity', coalesce(sum(occurrence.actual_quantity) filter (where occurrence.status = 'completed'), 0)
      ) as item
    from public.tasks task
    left join public.task_occurrences occurrence on occurrence.task_id = task.id
    where task.goal_id = v_previous.id
    group by task.id, task.title, task.sort_order
  ) summary;

  insert into public.goals (
    user_id, title, description, category, smart_data, project_id, space_id,
    target_frequency, visibility, color_theme, embedding_text,
    previous_goal_id, deadline, prior_phase_summary, reflection, reflected_at,
    status, ai_generated
  ) values (
    v_previous.user_id,
    coalesce(nullif(btrim(p_title), ''), v_previous.title),
    v_previous.description,
    v_previous.category,
    v_previous.smart_data,
    v_previous.project_id,
    v_previous.space_id,
    v_previous.target_frequency,
    v_previous.visibility,
    v_previous.color_theme,
    p_embedding_text,
    v_previous.id,
    p_deadline,
    v_summary,
    nullif(btrim(p_reflection), ''),
    case when nullif(btrim(p_reflection), '') is null then null else now() end,
    'active',
    false
  ) returning id into v_goal_id;

  for v_milestone in
    select * from public.milestones
    where goal_id = v_previous.id and completed_at is null
    order by sort_order, created_at, id
  loop
    insert into public.milestones (
      goal_id, user_id, title, description, due_date, sort_order, is_ai_suggested
    ) values (
      v_goal_id, v_previous.user_id, v_milestone.title, v_milestone.description,
      v_milestone.due_date, v_milestone.sort_order, false
    ) returning id into v_new_milestone_id;
    v_milestone_map := v_milestone_map
      || jsonb_build_object(v_milestone.id::text, v_new_milestone_id::text);
  end loop;

  for v_task in
    select task.*
    from public.tasks task
    where task.goal_id = v_previous.id
      and task.status = 'active'
      and (
        exists (
          select 1 from public.task_schedules schedule
          where schedule.task_id = task.id
            and schedule.is_active
            and (
              schedule.end_date is null
              or schedule.end_date >= (now() at time zone schedule.timezone)::date
            )
        )
        or exists (
          select 1 from public.task_occurrences occurrence
          where occurrence.task_id = task.id
            and occurrence.schedule_id is null
            and occurrence.status = 'pending'
        )
      )
    order by task.sort_order, task.created_at, task.id
  loop
    insert into public.tasks (
      user_id, goal_id, milestone_id, title, description, completion_mode,
      target_quantity, quantity_unit, status, due_date, source, sort_order
    ) values (
      v_previous.user_id,
      v_goal_id,
      case
        when v_task.milestone_id is null then null
        when v_milestone_map ? v_task.milestone_id::text
          then (v_milestone_map ->> v_task.milestone_id::text)::uuid
        else null
      end,
      v_task.title,
      v_task.description,
      v_task.completion_mode,
      v_task.target_quantity,
      v_task.quantity_unit,
      'active',
      v_task.due_date,
      'user',
      v_task.sort_order
    ) returning id into v_new_task_id;

    select schedule.* into v_schedule
    from public.task_schedules schedule
    where schedule.task_id = v_task.id
      and schedule.is_active
      and (
        schedule.end_date is null
        or schedule.end_date >= (now() at time zone schedule.timezone)::date
      )
    order by schedule.version desc
    limit 1;

    if v_schedule.id is not null then
      v_schedule_start := greatest(
        v_schedule.start_date,
        (now() at time zone v_schedule.timezone)::date
      );
      insert into public.task_schedules (
        user_id, task_id, version, recurrence_kind, interval_count, weekdays,
        start_date, end_date, local_time, timezone, is_active, source
      ) values (
        v_previous.user_id, v_new_task_id, 1, v_schedule.recurrence_kind,
        v_schedule.interval_count, v_schedule.weekdays, v_schedule_start,
        v_schedule.end_date, v_schedule.local_time, v_schedule.timezone, true, 'user'
      ) returning id into v_new_schedule_id;
      perform public.reconcile_task_occurrences_v1(v_new_task_id, v_schedule_start + 28);
    else
      insert into public.task_occurrences (
        user_id, task_id, occurrence_key, scheduled_local_date, status, source
      ) values (
        v_previous.user_id, v_new_task_id, 'one-time:' || v_new_task_id::text,
        v_task.due_date, 'pending', 'user'
      );
    end if;
  end loop;

  update public.goals
  set status = 'archived'
  where id = v_previous.id;

  return v_goal_id;
end;
$$;

revoke all on function public.start_goal_new_phase_v1(uuid, timestamptz, text, text, text)
  from public, anon;
grant execute on function public.start_goal_new_phase_v1(uuid, timestamptz, text, text, text)
  to authenticated;
