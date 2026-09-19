-- Migration 059: flexible "N times a week" Task frequency (To-Do × Metric
-- Unification, Phase 3 / TM-6). Adds a third recurrence flavor, `weekly_count`,
-- that expresses "do this N times a week, any days" — distinct from `weekly`
-- ("on these specific weekdays"). It reuses the one occurrence engine: a
-- weekly_count schedule materializes ONE period-anchored occurrence per ISO week
-- that is a quantity counter targeting N, so logging a run is the existing
-- adjust-quantity mechanic (1/3 → 2/3 → done) — no parallel scheduling machinery.
--
-- Model:
--   * task_schedules gains `target_count` (the N); recurrence_kind gains
--     'weekly_count' (weekdays empty, target_count 1..7).
--   * create_task_v1 forces a weekly_count Task to completion_mode='quantity' and
--     mirrors target_count → tasks.target_quantity, so the existing quantity
--     stepper / auto-complete-at-target / progress (done/target) all work unchanged.
--   * reconcile_task_occurrences_v1 gains a weekly_count arm: one occurrence per
--     ISO week anchored at greatest(week-Monday, start_date); a period is only
--     'missed' once the WHOLE week has elapsed (period-end < today), never mid-week.
--
-- Scope (Phase 3): create + display + log + rollover. Editing a weekly_count
-- Task's frequency is deferred, so update_task_v1 and replace_task_schedule_v1 are
-- intentionally NOT changed — they remain daily/weekly-only and reject weekly_count.
-- Additive throughout: widening a domain CHECK and adding a nullable column never
-- invalidate existing rows, so there is no backfill. Weekly-count only (no
-- monthly), per the standing "daily | weekly, no monthly" rule + TM decision.

-- 1. Schema -----------------------------------------------------------------

-- Drop the two unnamed inline CHECKs that constrain recurrence_kind (the domain
-- check and the kind↔weekdays shape check) so we can widen both. Both mention
-- recurrence_kind, so match on that.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.task_schedules'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%recurrence_kind%'
  loop
    execute format('alter table public.task_schedules drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.task_schedules
  add column if not exists target_count integer;

alter table public.task_schedules
  add constraint task_schedules_recurrence_kind_check
  check (recurrence_kind in ('daily', 'weekly', 'weekly_count'));

alter table public.task_schedules
  add constraint task_schedules_recurrence_shape_check check (
    (recurrence_kind = 'daily' and cardinality(weekdays) = 0)
    or (recurrence_kind = 'weekly' and cardinality(weekdays) between 1 and 7)
    or (recurrence_kind = 'weekly_count' and cardinality(weekdays) = 0)
  );

-- target_count is present iff the schedule is weekly_count, and is a sane weekly
-- frequency (1..7 times a week). Existing daily/weekly rows have a null
-- target_count, so they satisfy the `<> 'weekly_count'` arm.
alter table public.task_schedules
  add constraint task_schedules_target_count_check check (
    (recurrence_kind = 'weekly_count' and target_count between 1 and 7)
    or (recurrence_kind <> 'weekly_count' and target_count is null)
  );

comment on column public.task_schedules.target_count is
  'weekly_count only: the N in "N times a week". Mirrored to tasks.target_quantity at create so the quantity counter mechanic drives per-week progress.';

-- 2. Reconcile: add the weekly_count materialization arm --------------------
-- Reproduces the migration-048 body and adds a period-anchored branch. The two
-- correctness points: (a) a weekly_count occurrence is anchored at
-- greatest(week-Monday, start_date) so there is exactly one per ISO week; (b) it
-- is only marked 'missed' once its whole week has elapsed, never mid-week.
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
        -- A weekly-count period is missed only once its whole ISO week is past.
        then case when (date_trunc('week', candidate.day)::date + 6) < v_today then 'missed' else 'pending' end
      else case when candidate.day < v_today then 'missed' else 'pending' end
    end,
    case when task.completion_mode = 'quantity' then 0 else null end,
    'schedule'
  from generate_series(
    v_schedule.start_date,
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
    -- weekly_count: exactly one occurrence per ISO week, anchored at the week's
    -- Monday, or at start_date for the (partial) first week.
    v_schedule.recurrence_kind = 'weekly_count'
    and candidate.day = greatest(date_trunc('week', candidate.day)::date, v_schedule.start_date)
  )
  on conflict (task_id, occurrence_key) do nothing;

  get diagnostics v_inserted = row_count;

  -- Mark elapsed pending occurrences missed. weekly_count uses the period end
  -- (the week's Sunday), everything else its own scheduled date.
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

-- 3. create_task_v1: accept weekly_count + target_count ---------------------
-- Adding a parameter changes the signature, so drop the old 17-arg function
-- (and its grants) and recreate at 18 args, then re-grant.
drop function if exists public.create_task_v1(
  uuid, text, text, text, numeric, text, date, uuid, integer, text, text,
  integer, smallint[], date, date, time, text
);

create or replace function public.create_task_v1(
  p_goal_id uuid,
  p_title text,
  p_completion_mode text,
  p_description text default null,
  p_target_quantity numeric default null,
  p_quantity_unit text default null,
  p_due_date date default null,
  p_milestone_id uuid default null,
  p_sort_order integer default 0,
  p_idempotency_key text default null,
  p_schedule_kind text default null,
  p_schedule_interval integer default 1,
  p_schedule_weekdays smallint[] default '{}'::smallint[],
  p_schedule_start date default null,
  p_schedule_end date default null,
  p_schedule_local_time time default null,
  p_schedule_timezone text default null,
  p_schedule_target_count integer default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_task_id uuid;
  v_schedule_id uuid;
  v_timezone text;
  v_start date;
  v_created boolean;
  -- weekly_count forces the Task into quantity mode with target = N, mirrored so
  -- the counter stepper / auto-complete / progress all work unchanged.
  v_completion_mode text := p_completion_mode;
  v_target_quantity numeric := p_target_quantity;
  v_weekdays smallint[] := coalesce(p_schedule_weekdays, '{}'::smallint[]);
  v_interval integer := p_schedule_interval;
  v_target_count integer := null;
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

  if p_schedule_kind = 'weekly_count' then
    if p_schedule_target_count is null or p_schedule_target_count < 1 or p_schedule_target_count > 7 then
      raise exception 'A weekly-count Task needs a target of 1 to 7 times per week';
    end if;
    v_completion_mode := 'quantity';
    v_target_quantity := p_schedule_target_count;
    v_weekdays := '{}'::smallint[];
    v_interval := 1;
    v_target_count := p_schedule_target_count;
  elsif p_schedule_target_count is not null then
    raise exception 'target_count only applies to a weekly-count schedule';
  end if;

  if v_completion_mode not in ('binary', 'quantity') then raise exception 'Invalid completion mode'; end if;
  if v_completion_mode = 'binary' and (v_target_quantity is not null or p_quantity_unit is not null) then
    raise exception 'Binary Tasks cannot have quantity configuration';
  end if;
  if v_completion_mode = 'quantity' and v_target_quantity is not null and v_target_quantity <= 0 then
    raise exception 'A Task target must be a positive number'; end if;
  if p_schedule_kind is not null and p_due_date is not null then
    raise exception 'Recurring Tasks cannot also use a one-time deadline';
  end if;

  insert into public.tasks (
    user_id, goal_id, milestone_id, title, description, completion_mode,
    target_quantity, quantity_unit, due_date, source, create_idempotency_key, sort_order
  ) values (
    v_user_id, p_goal_id, p_milestone_id, btrim(p_title), nullif(btrim(p_description), ''),
    v_completion_mode, v_target_quantity, nullif(btrim(p_quantity_unit), ''), p_due_date,
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
      'pending', case when v_completion_mode = 'quantity' then 0 else null end,
      'user', case when p_idempotency_key is null then null else p_idempotency_key || ':occurrence' end
    );
  else
    select timezone into v_timezone from public.profiles where id = v_user_id;
    v_timezone := coalesce(nullif(p_schedule_timezone, ''), nullif(v_timezone, ''), 'UTC');
    v_start := coalesce(p_schedule_start, (now() at time zone v_timezone)::date);
    insert into public.task_schedules (
      user_id, task_id, version, recurrence_kind, interval_count, weekdays,
      start_date, end_date, local_time, timezone, source, target_count
    ) values (
      v_user_id, v_task_id, 1, p_schedule_kind, v_interval,
      v_weekdays, v_start, p_schedule_end,
      p_schedule_local_time, v_timezone, 'user', v_target_count
    ) returning id into v_schedule_id;
    perform public.reconcile_task_occurrences_v1(v_task_id, v_start + 28);
  end if;

  return v_task_id;
end;
$$;

revoke all on function public.create_task_v1(uuid,text,text,text,numeric,text,date,uuid,integer,text,text,integer,smallint[],date,date,time,text,integer) from public, anon;
grant execute on function public.create_task_v1(uuid,text,text,text,numeric,text,date,uuid,integer,text,text,integer,smallint[],date,date,time,text,integer) to authenticated;
