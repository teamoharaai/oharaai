-- Migration 056: quantity Tasks become a true count-up counter (Goal Detail
-- Redesign Phase 2). A regular Task now defaults to the quantity/counter mode,
-- and per the redesign its target lives in "More options" as an OPTIONAL goal —
-- a counter with no target simply counts up (e.g. "12"), mirroring the optional
-- `target_count` on milestone achievements.
--
-- Before: the `source='user'` CHECK required a quantity Task to carry BOTH a
-- non-null target_quantity AND a non-empty quantity_unit. That made an optional
-- target impossible. This migration relaxes the constraint so a user quantity
-- Task may have a null target and/or null unit, and relaxes the matching guards
-- in create_task_v1 / update_task_v1 / log_completed_task_v1 to agree.
--
-- Still enforced:
--   * binary Tasks carry no quantity config (target + unit both null),
--   * a present target is positive (separate `tasks_target_quantity_check`),
--   * retroactive quantity completions still require a valid actual amount.
-- Loosening a CHECK never invalidates existing rows, so no data backfill.

alter table public.tasks drop constraint tasks_check;
alter table public.tasks add constraint tasks_check check (
  source <> 'user'
  or (completion_mode = 'binary' and target_quantity is null and quantity_unit is null)
  or completion_mode = 'quantity'
);


CREATE OR REPLACE FUNCTION public.create_task_v1(p_goal_id uuid, p_title text, p_completion_mode text, p_description text DEFAULT NULL::text, p_target_quantity numeric DEFAULT NULL::numeric, p_quantity_unit text DEFAULT NULL::text, p_due_date date DEFAULT NULL::date, p_milestone_id uuid DEFAULT NULL::uuid, p_sort_order integer DEFAULT 0, p_idempotency_key text DEFAULT NULL::text, p_schedule_kind text DEFAULT NULL::text, p_schedule_interval integer DEFAULT 1, p_schedule_weekdays smallint[] DEFAULT '{}'::smallint[], p_schedule_start date DEFAULT NULL::date, p_schedule_end date DEFAULT NULL::date, p_schedule_local_time time without time zone DEFAULT NULL::time without time zone, p_schedule_timezone text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_task_id uuid;
  v_schedule_id uuid;
  v_timezone text;
  v_start date;
  v_created boolean;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if p_idempotency_key is not null then
    select id into v_task_id from public.tasks
    where user_id = v_user_id and create_idempotency_key = p_idempotency_key;
    if v_task_id is not null then return v_task_id; end if;
  end if;
  if not exists (
    select 1 from public.goals
    where id = p_goal_id and user_id = v_user_id and status = 'active'
  ) then raise exception 'Active Goal not found'; end if;
  if p_completion_mode not in ('binary', 'quantity') then raise exception 'Invalid completion mode'; end if;
  if p_completion_mode = 'binary' and (p_target_quantity is not null or p_quantity_unit is not null) then
    raise exception 'Binary Tasks cannot have quantity configuration';
  end if;
  if p_completion_mode = 'quantity' and p_target_quantity is not null and p_target_quantity <= 0 then
    raise exception 'A Task target must be a positive number'; end if;
  if p_schedule_kind is not null and p_due_date is not null then
    raise exception 'Recurring Tasks cannot also use a one-time deadline';
  end if;

  insert into public.tasks (
    user_id, goal_id, milestone_id, title, description, completion_mode,
    target_quantity, quantity_unit, due_date, source, create_idempotency_key, sort_order
  ) values (
    v_user_id, p_goal_id, p_milestone_id, btrim(p_title), nullif(btrim(p_description), ''),
    p_completion_mode, p_target_quantity, nullif(btrim(p_quantity_unit), ''), p_due_date,
    'user', nullif(btrim(p_idempotency_key), ''), p_sort_order
  )
  on conflict (user_id, create_idempotency_key)
    where create_idempotency_key is not null
  do update set updated_at = public.tasks.updated_at
  returning id, (xmax = 0) into v_task_id, v_created;

  if not v_created then return v_task_id; end if;

  if p_schedule_kind is null then
    select timezone into v_timezone from public.profiles where id = v_user_id;
    v_timezone := coalesce(nullif(v_timezone, ''), 'UTC');
    insert into public.task_occurrences (
      user_id, task_id, occurrence_key, scheduled_local_date, schedule_timezone,
      status, actual_quantity, source, idempotency_key
    ) values (
      v_user_id, v_task_id, 'one-time:' || v_task_id::text, p_due_date, v_timezone,
      'pending', case when p_completion_mode = 'quantity' then 0 else null end,
      'user', case when p_idempotency_key is null then null else p_idempotency_key || ':occurrence' end
    );
  else
    select timezone into v_timezone from public.profiles where id = v_user_id;
    v_timezone := coalesce(nullif(p_schedule_timezone, ''), nullif(v_timezone, ''), 'UTC');
    v_start := coalesce(p_schedule_start, (now() at time zone v_timezone)::date);
    insert into public.task_schedules (
      user_id, task_id, version, recurrence_kind, interval_count, weekdays,
      start_date, end_date, local_time, timezone, source
    ) values (
      v_user_id, v_task_id, 1, p_schedule_kind, p_schedule_interval,
      coalesce(p_schedule_weekdays, '{}'::smallint[]), v_start, p_schedule_end,
      p_schedule_local_time, v_timezone, 'user'
    ) returning id into v_schedule_id;
    perform public.reconcile_task_occurrences_v1(v_task_id, v_start + 28);
  end if;

  return v_task_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_task_v1(p_task_id uuid, p_title text, p_completion_mode text, p_description text DEFAULT NULL::text, p_target_quantity numeric DEFAULT NULL::numeric, p_quantity_unit text DEFAULT NULL::text, p_due_date date DEFAULT NULL::date, p_milestone_id uuid DEFAULT NULL::uuid)
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

CREATE OR REPLACE FUNCTION public.log_completed_task_v1(p_goal_id uuid, p_title text, p_completion_mode text, p_completed_at timestamp with time zone, p_description text DEFAULT NULL::text, p_target_quantity numeric DEFAULT NULL::numeric, p_quantity_unit text DEFAULT NULL::text, p_actual_quantity numeric DEFAULT NULL::numeric, p_milestone_id uuid DEFAULT NULL::uuid, p_idempotency_key text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_user_id uuid:=auth.uid();
  v_task_id uuid;
  v_created boolean;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if p_completed_at is null or p_completed_at > now()+interval '5 minutes' then
    raise exception 'Invalid completion timestamp';
  end if;
  if p_idempotency_key is not null then
    select id into v_task_id from public.tasks
      where user_id=v_user_id and create_idempotency_key=p_idempotency_key;
    if v_task_id is not null then return v_task_id; end if;
  end if;
  if not exists(select 1 from public.goals where id=p_goal_id and user_id=v_user_id and status='active') then
    raise exception 'Active Goal not found';
  end if;
  if p_completion_mode='binary' and (p_target_quantity is not null or p_quantity_unit is not null) then
    raise exception 'Binary Tasks cannot have quantity configuration';
  end if;
  if p_completion_mode='quantity' and (
    (p_target_quantity is not null and p_target_quantity<=0)
    or p_actual_quantity is null or p_actual_quantity<0
  ) then raise exception 'Quantity completions need a valid amount (and a positive target if set)'; end if;
  insert into public.tasks (
    user_id,goal_id,milestone_id,title,description,completion_mode,target_quantity,
    quantity_unit,status,source,create_idempotency_key,completed_at
  ) values (
    v_user_id,p_goal_id,p_milestone_id,btrim(p_title),nullif(btrim(p_description),''),
    p_completion_mode,p_target_quantity,nullif(btrim(p_quantity_unit),''),'complete','user',
    nullif(btrim(p_idempotency_key),''),p_completed_at
  )
  on conflict (user_id, create_idempotency_key)
    where create_idempotency_key is not null
  do update set updated_at = public.tasks.updated_at
  returning id, (xmax = 0) into v_task_id, v_created;
  if not v_created then return v_task_id; end if;
  insert into public.task_occurrences (
    user_id,task_id,occurrence_key,status,actual_quantity,completed_at,source,idempotency_key
  ) values (
    v_user_id,v_task_id,'retroactive:'||v_task_id::text,'completed',
    case when p_completion_mode='quantity' then p_actual_quantity else null end,
    p_completed_at,'retroactive',
    case when p_idempotency_key is null then null else p_idempotency_key||':occurrence' end
  );
  return v_task_id;
end;
$function$
;

