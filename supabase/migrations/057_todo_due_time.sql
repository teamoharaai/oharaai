-- Migration 057: let a one-time To-Do carry a time-of-day (Goal Detail Redesign).
--
-- A To-Do is a one-time, unscheduled binary Task; its single occurrence already
-- has a `scheduled_local_time` column, but `update_task_v1` never set it, so the
-- "Change time" action could only move the date. This adds an optional
-- `p_due_time` and writes it onto the pending one-time occurrence.
--
-- The parameter is appended, which is a NEW overload — so DROP the old 8-arg
-- function first to avoid an ambiguous 8-vs-9-arg resolution, then recreate with
-- the extra arg and restore its exact privilege matrix (revoke public/anon,
-- grant authenticated). Behaviour for existing callers is unchanged: they simply
-- omit p_due_time (defaults NULL, clearing any stored time).

drop function if exists public.update_task_v1(uuid,text,text,text,numeric,text,date,uuid);

CREATE OR REPLACE FUNCTION public.update_task_v1(p_task_id uuid, p_title text, p_completion_mode text, p_description text DEFAULT NULL::text, p_target_quantity numeric DEFAULT NULL::numeric, p_quantity_unit text DEFAULT NULL::text, p_due_date date DEFAULT NULL::date, p_milestone_id uuid DEFAULT NULL::uuid, p_due_time time without time zone DEFAULT NULL::time without time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_has_schedule boolean;
  v_current_completion_mode text;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  select task.completion_mode into v_current_completion_mode
  from public.tasks task join public.goals goal on goal.id = task.goal_id
    where task.id = p_task_id and task.user_id = v_user_id
      and task.status = 'active' and goal.status = 'active';
  if v_current_completion_mode is null then raise exception 'Active Task not found'; end if;
  if p_completion_mode not in ('binary', 'quantity') then raise exception 'Invalid completion mode'; end if;
  if p_completion_mode = 'binary' and (p_target_quantity is not null or p_quantity_unit is not null) then
    raise exception 'Binary Tasks cannot have quantity configuration';
  end if;
  if p_completion_mode = 'quantity' and p_target_quantity is not null and p_target_quantity <= 0 then
    raise exception 'A Task target must be a positive number'; end if;
  select exists(select 1 from public.task_schedules where task_id=p_task_id and is_active)
    into v_has_schedule;
  if v_has_schedule and p_due_date is not null then
    raise exception 'Recurring Tasks cannot also use a one-time deadline';
  end if;
  if p_completion_mode <> v_current_completion_mode and exists (
    select 1 from public.task_occurrences
    where task_id = p_task_id and status in ('completed', 'skipped', 'missed')
  ) then
    raise exception 'Completion mode cannot change after Task history exists';
  end if;

  update public.tasks set
    title = btrim(p_title), description = nullif(btrim(p_description), ''),
    completion_mode = p_completion_mode, target_quantity = p_target_quantity,
    quantity_unit = nullif(btrim(p_quantity_unit), ''), due_date = p_due_date,
    milestone_id = p_milestone_id
  where id = p_task_id and user_id = v_user_id;

  if not v_has_schedule then
    update public.task_occurrences set
      scheduled_local_date = p_due_date,
      scheduled_local_time = p_due_time,
      actual_quantity = case when p_completion_mode = 'binary' then null else coalesce(actual_quantity, 0) end
    where task_id = p_task_id and schedule_id is null and status = 'pending';
  elsif p_completion_mode <> v_current_completion_mode then
    update public.task_occurrences set
      actual_quantity = case when p_completion_mode = 'binary' then null else coalesce(actual_quantity, 0) end
    where task_id = p_task_id and status = 'pending';
  end if;
  return p_task_id;
end;
$function$

;

revoke all on function public.update_task_v1(uuid,text,text,text,numeric,text,date,uuid,time without time zone) from public, anon;
grant execute on function public.update_task_v1(uuid,text,text,text,numeric,text,date,uuid,time without time zone) to authenticated;
