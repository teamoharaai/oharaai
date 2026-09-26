-- Migration 075: one scheduled occurrence per Task per calendar day, across schedule versions.
--
-- Problem: replace_task_schedule_v1 (048) cancelled every pending/missed occurrence from today on and
-- let the new version materialize its own rows, but it left completed/skipped rows on the old version.
-- Replacing a schedule on a day that was already done therefore produced a second, pending occurrence
-- for the same day under the new version (and a lost quantity when today was partly logged).
--
-- Fix (desktop and native share this RPC, so both get it):
--   1. Re-key instead of recreate. Every non-cancelled old-version occurrence dated on/after the new
--      start date that the new version also schedules is moved onto the new version (schedule_id,
--      canonical occurrence_key, time/timezone), keeping its status and quantity. Pending/missed rows
--      the new version does not schedule are cancelled as before; completed/skipped rows it does not
--      schedule stay on the old version as history.
--   2. Enforce the invariant: at most one non-cancelled scheduler-created occurrence per Task per day
--      (unique partial index). Legacy tracker/action backfill rows (other sources) are out of scope.
--   3. Reconcilers use a target-less ON CONFLICT so a day that is already occupied is skipped rather
--      than raising.
-- Existing duplicates are repaired first: redundant pending/missed rows are cancelled when a sibling
-- on the same day exists. If two terminal rows share a day the migration stops with a count so an
-- operator can review them (history is never silently rewritten).
begin;

-- 1) Repair: cancel redundant pending/missed scheduler rows that share a day with another live row.
with ranked as (
  select id, row_number() over (
    partition by task_id, scheduled_local_date
    order by (status in ('completed','skipped')) desc, (actual_quantity is not null and actual_quantity > 0) desc,
             created_at desc, id
  ) as rank
  from public.task_occurrences
  where source = 'schedule' and schedule_id is not null and status <> 'cancelled'
)
update public.task_occurrences o set status = 'cancelled', completed_at = null, skipped_at = null
from ranked r
where o.id = r.id and r.rank > 1 and o.status in ('pending','missed');

do $$
declare conflicts integer;
begin
  select count(*) into conflicts from (
    select task_id, scheduled_local_date from public.task_occurrences
    where source = 'schedule' and schedule_id is not null and status <> 'cancelled'
    group by 1, 2 having count(*) > 1) d;
  if conflicts > 0 then
    raise exception 'TASK_OCCURRENCE_DAY_CONFLICTS: % Task-days hold more than one completed/skipped scheduled occurrence; review before applying 075', conflicts;
  end if;
end $$;

create unique index task_occurrences_one_scheduled_per_day
  on public.task_occurrences (task_id, scheduled_local_date)
  where source = 'schedule' and schedule_id is not null and status <> 'cancelled';

-- 2) Reconcile: identical to 063 except the conflict clause is target-less.
create or replace function public.reconcile_task_occurrences_v1(
  p_task_id uuid,
  p_through_date date default null
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_schedule public.task_schedules;
  v_goal_status text;
  v_today date;
  v_through date;
  v_frontier date;
  v_lower date;
  v_inserted integer := 0;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;

  select schedule.*
  into v_schedule
  from public.task_schedules schedule
  join public.tasks task on task.id = schedule.task_id
  where schedule.task_id = p_task_id
    and schedule.user_id = v_user_id
    and schedule.is_active
    and task.status = 'active';

  if v_schedule.id is null then return 0; end if;
  select goal.status into v_goal_status
  from public.tasks task
  join public.goals goal on goal.id = task.goal_id
  where task.id = p_task_id and task.user_id = v_user_id;
  if v_goal_status <> 'active' then raise exception 'Tasks on inactive Goals are read-only'; end if;

  v_today := (now() at time zone v_schedule.timezone)::date;
  v_through := least(coalesce(p_through_date, v_today + 28), v_today + 180);
  if v_through < v_schedule.start_date then return 0; end if;
  if v_through - v_schedule.start_date > 3660 then
    raise exception 'Task schedule reconciliation window is too large';
  end if;

  select max(occurrence.scheduled_local_date) into v_frontier
  from public.task_occurrences occurrence
  where occurrence.task_id = p_task_id
    and occurrence.schedule_id = v_schedule.id;
  v_lower := greatest(v_schedule.start_date, coalesce(v_frontier + 1, v_schedule.start_date));

  insert into public.task_occurrences (
    user_id, task_id, schedule_id, occurrence_key,
    scheduled_local_date, scheduled_local_time, schedule_timezone, scheduled_at,
    status, actual_quantity, source
  )
  select
    v_user_id,
    p_task_id,
    v_schedule.id,
    'schedule:' || v_schedule.id::text || ':v' || v_schedule.version::text || ':'
      || candidate.day::text || ':' || coalesce(v_schedule.local_time::text, 'anytime'),
    candidate.day,
    v_schedule.local_time,
    v_schedule.timezone,
    public.task_local_instant_v1(candidate.day, v_schedule.local_time, v_schedule.timezone),
    case
      when v_schedule.recurrence_kind = 'weekly_count'
        then case when (date_trunc('week', candidate.day)::date + 6) < v_today then 'missed' else 'pending' end
      else case when candidate.day < v_today then 'missed' else 'pending' end
    end,
    case when task.completion_mode = 'quantity' then 0 else null end,
    'schedule'
  from generate_series(
    v_lower,
    least(coalesce(v_schedule.end_date, v_through), v_through),
    interval '1 day'
  ) generated(day_value)
  cross join lateral (select generated.day_value::date as day) candidate
  join public.tasks task on task.id = p_task_id
  where (
    v_schedule.recurrence_kind = 'daily'
    and mod(candidate.day - v_schedule.start_date, v_schedule.interval_count) = 0
  ) or (
    v_schedule.recurrence_kind = 'weekly'
    and mod(((candidate.day - v_schedule.start_date) / 7), v_schedule.interval_count) = 0
    and extract(isodow from candidate.day)::smallint = any(v_schedule.weekdays)
  ) or (
    v_schedule.recurrence_kind = 'weekly_count'
    and candidate.day = greatest(date_trunc('week', candidate.day)::date, v_schedule.start_date)
  )
  on conflict do nothing;

  get diagnostics v_inserted = row_count;

  update public.task_occurrences occurrence
  set status = 'missed'
  from public.task_schedules sch
  where occurrence.task_id = p_task_id
    and occurrence.user_id = v_user_id
    and occurrence.schedule_id = sch.id
    and occurrence.status = 'pending'
    and case
      when sch.recurrence_kind = 'weekly_count'
        then (date_trunc('week', occurrence.scheduled_local_date)::date + 6) < v_today
      else occurrence.scheduled_local_date < v_today
    end;

  return v_inserted;
end;
$$;

-- 3) Schedule replacement: same signature, receipts and validation as 048; re-keys continuing days.
create or replace function public.replace_task_schedule_v1(
  p_task_id uuid,
  p_recurrence_kind text,
  p_interval_count integer default 1,
  p_weekdays smallint[] default '{}'::smallint[],
  p_start_date date default null,
  p_end_date date default null,
  p_local_time time default null,
  p_timezone text default null,
  p_due_date date default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks;
  v_timezone text;
  v_today date;
  v_start date;
  v_version integer;
  v_schedule public.task_schedules;
  v_receipt public.task_mutation_receipts;
  v_inserted integer;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if nullif(btrim(p_idempotency_key),'') is null then raise exception 'Idempotency key is required'; end if;
  insert into public.task_mutation_receipts
    (user_id,idempotency_key,operation,entity_id)
  values (v_user_id,p_idempotency_key,'task.schedule.replace',p_task_id)
  on conflict (user_id,idempotency_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then
    select * into v_receipt from public.task_mutation_receipts
      where user_id=v_user_id and idempotency_key=p_idempotency_key;
    if v_receipt.operation <> 'task.schedule.replace' or v_receipt.entity_id <> p_task_id then
      raise exception 'Idempotency key conflict';
    end if;
    return v_receipt.result_entity_id;
  end if;
  select task.* into v_task from public.tasks task
  join public.goals goal on goal.id=task.goal_id
  where task.id=p_task_id and task.user_id=v_user_id
    and task.status='active' and goal.status='active'
  for update of task;
  if v_task.id is null then raise exception 'Active Task not found'; end if;
  select timezone into v_timezone from public.profiles where id=v_user_id;
  v_timezone := coalesce(nullif(p_timezone,''),nullif(v_timezone,''),'UTC');
  if not exists(select 1 from pg_timezone_names where name=v_timezone) then
    raise exception 'Schedule timezone must be a valid IANA timezone';
  end if;
  v_today := (now() at time zone v_timezone)::date;

  update public.task_schedules set is_active=false where task_id=p_task_id and is_active;

  if p_recurrence_kind is null then
    update public.task_occurrences set status='cancelled', completed_at=null, skipped_at=null
    where task_id=p_task_id and status in ('pending','missed')
      and (schedule_id is null or scheduled_local_date >= v_today);
    update public.tasks set due_date=p_due_date where id=p_task_id;
    insert into public.task_occurrences (
      user_id,task_id,occurrence_key,scheduled_local_date,schedule_timezone,
      status,actual_quantity,source
    ) values (
      v_user_id,p_task_id,'one-time:'||p_task_id::text||':revision:'||gen_random_uuid()::text,
      p_due_date,v_timezone,'pending',
      case when v_task.completion_mode='quantity' then 0 else null end,'user'
    );
  else
    if p_recurrence_kind not in ('daily','weekly') then raise exception 'Invalid recurrence kind'; end if;
    if p_recurrence_kind='weekly' and cardinality(coalesce(p_weekdays,'{}'::smallint[]))=0 then
      raise exception 'Weekly schedules require weekdays';
    end if;
    v_start := coalesce(p_start_date, v_today);
    update public.tasks set due_date=null where id=p_task_id;
    -- A pending one-time occurrence never continues into a recurring schedule.
    update public.task_occurrences set status='cancelled', completed_at=null, skipped_at=null
    where task_id=p_task_id and schedule_id is null and status in ('pending','missed');
    select coalesce(max(version),0)+1 into v_version from public.task_schedules where task_id=p_task_id;
    insert into public.task_schedules (
      user_id,task_id,version,recurrence_kind,interval_count,weekdays,
      start_date,end_date,local_time,timezone,source
    ) values (
      v_user_id,p_task_id,v_version,p_recurrence_kind,p_interval_count,
      coalesce(p_weekdays,'{}'::smallint[]),v_start,p_end_date,
      p_local_time,v_timezone,'user'
    ) returning * into v_schedule;

    -- Continuing days keep their occurrence (status, quantity, completion time) on the new version.
    update public.task_occurrences o set
      schedule_id = v_schedule.id,
      occurrence_key = 'schedule:' || v_schedule.id::text || ':v' || v_schedule.version::text || ':'
        || o.scheduled_local_date::text || ':' || coalesce(v_schedule.local_time::text, 'anytime'),
      scheduled_local_time = v_schedule.local_time,
      schedule_timezone = v_schedule.timezone,
      scheduled_at = public.task_local_instant_v1(o.scheduled_local_date, v_schedule.local_time, v_schedule.timezone)
    where o.task_id = p_task_id and o.user_id = v_user_id and o.source = 'schedule'
      and o.schedule_id is not null and o.schedule_id <> v_schedule.id and o.status <> 'cancelled'
      and o.scheduled_local_date >= v_start
      and (v_schedule.end_date is null or o.scheduled_local_date <= v_schedule.end_date)
      and ((v_schedule.recurrence_kind = 'daily'
            and mod(o.scheduled_local_date - v_schedule.start_date, v_schedule.interval_count) = 0)
        or (v_schedule.recurrence_kind = 'weekly'
            and mod((o.scheduled_local_date - v_schedule.start_date) / 7, v_schedule.interval_count) = 0
            and extract(isodow from o.scheduled_local_date)::smallint = any(v_schedule.weekdays)));

    -- Days the new version does not schedule: open ones end; completed/skipped history stays put.
    update public.task_occurrences set status='cancelled', completed_at=null, skipped_at=null
    where task_id=p_task_id and status in ('pending','missed')
      and schedule_id is not null and schedule_id <> v_schedule.id and scheduled_local_date >= v_today;

    perform public.reconcile_task_occurrences_v1(p_task_id, v_start + 28);
  end if;
  update public.task_mutation_receipts
  set result_entity_id=v_schedule.id
  where user_id=v_user_id and idempotency_key=p_idempotency_key;
  return v_schedule.id;
end;
$$;

commit;
