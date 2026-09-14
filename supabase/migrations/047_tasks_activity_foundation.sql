-- Migration 047: Goals V2.0 Phase 2B Tasks & Activity Foundation
-- Canonical Task definitions, versioned schedules, durable occurrences, and
-- trusted/idempotent mutation paths. Legacy source tables remain intact.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  title text not null check (length(btrim(title)) between 1 and 500),
  description text,
  completion_mode text not null check (completion_mode in ('binary', 'quantity')),
  target_quantity numeric,
  quantity_unit text,
  status text not null default 'active' check (status in ('active', 'complete', 'archived')),
  due_date date,
  source text not null default 'user'
    check (source in ('user', 'legacy_tracker', 'legacy_action')),
  legacy_tracker_id uuid unique,
  legacy_action_log_id uuid unique,
  legacy_current_value numeric,
  legacy_target_value numeric,
  legacy_target_unit text,
  legacy_frequency text,
  legacy_tracker_type text,
  legacy_is_ai_suggested boolean,
  legacy_status text,
  create_idempotency_key text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  archived_at timestamptz,
  check (target_quantity is null or target_quantity > 0),
  check (legacy_frequency is null or legacy_frequency in ('daily', 'weekly', 'monthly')),
  check (legacy_tracker_type is null or legacy_tracker_type in ('counter', 'habit', 'checklist')),
  check (
    source <> 'user'
    or (completion_mode = 'binary' and target_quantity is null and quantity_unit is null)
    or (
      completion_mode = 'quantity'
      and target_quantity is not null
      and quantity_unit is not null
      and length(btrim(quantity_unit)) > 0
    )
  ),
  check (
    (status = 'complete' and (completed_at is not null or source = 'legacy_action'))
    or (status <> 'complete' and completed_at is null)
  ),
  check (
    (status = 'archived' and (archived_at is not null or source = 'legacy_action'))
    or (status <> 'archived' and archived_at is null)
  )
);

create unique index tasks_user_create_idempotency_idx
  on public.tasks (user_id, create_idempotency_key)
  where create_idempotency_key is not null;
create index tasks_goal_status_sort_idx
  on public.tasks (goal_id, status, sort_order, created_at);
create index tasks_user_status_due_idx
  on public.tasks (user_id, status, due_date);
create index tasks_milestone_idx
  on public.tasks (milestone_id) where milestone_id is not null;

create table public.task_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  version integer not null check (version > 0),
  recurrence_kind text not null check (recurrence_kind in ('daily', 'weekly')),
  interval_count integer not null default 1 check (interval_count between 1 and 52),
  weekdays smallint[] not null default '{}'::smallint[],
  start_date date not null,
  end_date date,
  local_time time,
  timezone text not null,
  is_active boolean not null default true,
  source text not null default 'user' check (source in ('user', 'legacy_tracker')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check (weekdays <@ array[1,2,3,4,5,6,7]::smallint[]),
  check (
    (recurrence_kind = 'daily' and cardinality(weekdays) = 0)
    or (recurrence_kind = 'weekly' and cardinality(weekdays) between 1 and 7)
  ),
  unique (task_id, version)
);

create unique index task_schedules_one_active_idx
  on public.task_schedules (task_id) where is_active;
create index task_schedules_user_active_idx
  on public.task_schedules (user_id, is_active, start_date);

create table public.task_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  schedule_id uuid references public.task_schedules(id) on delete restrict,
  occurrence_key text not null check (length(btrim(occurrence_key)) between 1 and 300),
  scheduled_local_date date,
  scheduled_local_time time,
  schedule_timezone text,
  scheduled_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'skipped', 'missed', 'cancelled')),
  actual_quantity numeric,
  note text,
  completed_at timestamptz,
  skipped_at timestamptz,
  source text not null default 'user'
    check (source in ('user', 'schedule', 'retroactive', 'legacy_tracker', 'legacy_action')),
  legacy_tracker_log_id uuid unique,
  legacy_action_log_id uuid unique,
  legacy_raw_value numeric,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (actual_quantity is null or actual_quantity >= 0),
  check (
    (status = 'completed' and (completed_at is not null or source = 'legacy_action'))
    or (status <> 'completed' and completed_at is null)
  ),
  check (
    (status = 'skipped' and (skipped_at is not null or source = 'legacy_action'))
    or (status <> 'skipped' and skipped_at is null)
  ),
  unique (task_id, occurrence_key)
);

create unique index task_occurrences_user_idempotency_idx
  on public.task_occurrences (user_id, idempotency_key)
  where idempotency_key is not null;
create index task_occurrences_task_date_idx
  on public.task_occurrences (task_id, scheduled_local_date, created_at);
create index task_occurrences_user_status_date_idx
  on public.task_occurrences (user_id, status, scheduled_local_date);
create index task_occurrences_schedule_idx
  on public.task_occurrences (schedule_id, scheduled_local_date)
  where schedule_id is not null;

-- This is an internal idempotency ledger, not the future product Activity Event
-- model. It stores no user content and exists only to make retries/deltas safe.
create table public.task_mutation_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  idempotency_key text not null,
  operation text not null,
  entity_id uuid not null,
  result_entity_id uuid,
  result_payload jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index task_mutation_receipts_created_idx
  on public.task_mutation_receipts (user_id, created_at desc);

create or replace function public.touch_task_row_v1()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_task_row_v1();
create trigger task_schedules_touch_updated_at
  before update on public.task_schedules
  for each row execute function public.touch_task_row_v1();
create trigger task_occurrences_touch_updated_at
  before update on public.task_occurrences
  for each row execute function public.touch_task_row_v1();

create or replace function public.validate_task_relationships_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.goals goal
    where goal.id = new.goal_id and goal.user_id = new.user_id
  ) then
    raise exception 'Task owner must own the Goal';
  end if;

  if new.milestone_id is not null and not exists (
    select 1 from public.milestones milestone
    where milestone.id = new.milestone_id
      and milestone.goal_id = new.goal_id
      and milestone.user_id = new.user_id
  ) then
    raise exception 'Task Milestone must belong to the same Goal and owner';
  end if;

  return new;
end;
$$;

create trigger tasks_validate_relationships
  before insert or update of user_id, goal_id, milestone_id on public.tasks
  for each row execute function public.validate_task_relationships_v1();

create or replace function public.validate_task_schedule_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.tasks task
    where task.id = new.task_id and task.user_id = new.user_id
  ) then
    raise exception 'Schedule owner must own the Task';
  end if;
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'Schedule timezone must be a valid IANA timezone';
  end if;
  return new;
end;
$$;

create trigger task_schedules_validate_relationships
  before insert or update of user_id, task_id, timezone on public.task_schedules
  for each row execute function public.validate_task_schedule_v1();

create or replace function public.validate_task_occurrence_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.tasks task
    where task.id = new.task_id and task.user_id = new.user_id
  ) then
    raise exception 'Occurrence owner must own the Task';
  end if;
  if new.schedule_id is not null and not exists (
    select 1 from public.task_schedules schedule
    where schedule.id = new.schedule_id
      and schedule.task_id = new.task_id
      and schedule.user_id = new.user_id
  ) then
    raise exception 'Occurrence Schedule must belong to the same Task and owner';
  end if;
  if new.schedule_timezone is not null
    and not exists (select 1 from pg_timezone_names where name = new.schedule_timezone) then
    raise exception 'Occurrence timezone must be a valid IANA timezone';
  end if;
  return new;
end;
$$;

create trigger task_occurrences_validate_relationships
  before insert or update of user_id, task_id, schedule_id, schedule_timezone
  on public.task_occurrences
  for each row execute function public.validate_task_occurrence_v1();

alter table public.tasks enable row level security;
alter table public.task_schedules enable row level security;
alter table public.task_occurrences enable row level security;
alter table public.task_mutation_receipts enable row level security;

create policy "Users can read own Tasks" on public.tasks
  for select to authenticated using (user_id = auth.uid());
create policy "Users can read own Task schedules" on public.task_schedules
  for select to authenticated using (user_id = auth.uid());
create policy "Users can read own Task occurrences" on public.task_occurrences
  for select to authenticated using (user_id = auth.uid());
create policy "Users can read own Task mutation receipts" on public.task_mutation_receipts
  for select to authenticated using (user_id = auth.uid());

revoke all on public.tasks, public.task_schedules, public.task_occurrences,
  public.task_mutation_receipts from anon, authenticated;
grant select on public.tasks, public.task_schedules, public.task_occurrences,
  public.task_mutation_receipts to authenticated;
grant select, insert, update, delete on public.tasks, public.task_schedules,
  public.task_occurrences, public.task_mutation_receipts to service_role;

create or replace function public.task_local_instant_v1(
  p_date date,
  p_time time,
  p_timezone text
)
returns timestamptz
language sql
stable
set search_path = pg_catalog
as $$
  select case
    when p_time is null then null
    else (p_date + p_time) at time zone p_timezone
  end;
$$;

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
    case when candidate.day < v_today then 'missed' else 'pending' end,
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
  )
  on conflict (task_id, occurrence_key) do nothing;

  get diagnostics v_inserted = row_count;

  update public.task_occurrences occurrence
  set status = 'missed'
  where occurrence.task_id = p_task_id
    and occurrence.user_id = v_user_id
    and occurrence.schedule_id is not null
    and occurrence.status = 'pending'
    and occurrence.scheduled_local_date < v_today;

  return v_inserted;
end;
$$;

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
  p_schedule_timezone text default null
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
  if p_completion_mode = 'quantity' and (
    p_target_quantity is null or p_target_quantity <= 0
    or nullif(btrim(p_quantity_unit), '') is null
  ) then raise exception 'Quantity Tasks require a positive target and unit'; end if;
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
$$;

create or replace function public.update_task_v1(
  p_task_id uuid,
  p_title text,
  p_completion_mode text,
  p_description text default null,
  p_target_quantity numeric default null,
  p_quantity_unit text default null,
  p_due_date date default null,
  p_milestone_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
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
  if p_completion_mode = 'quantity' and (
    p_target_quantity is null or p_target_quantity <= 0
    or nullif(btrim(p_quantity_unit), '') is null
  ) then raise exception 'Quantity Tasks require a positive target and unit'; end if;
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
$$;

create or replace function public.archive_task_v1(p_task_id uuid, p_idempotency_key text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted integer;
  v_receipt public.task_mutation_receipts;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if nullif(btrim(p_idempotency_key),'') is null then raise exception 'Idempotency key is required'; end if;
  insert into public.task_mutation_receipts(user_id,idempotency_key,operation,entity_id,result_entity_id)
  values (v_user_id,p_idempotency_key,'task.archive',p_task_id,p_task_id)
  on conflict (user_id,idempotency_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then
    select * into v_receipt from public.task_mutation_receipts
    where user_id=v_user_id and idempotency_key=p_idempotency_key;
    if v_receipt.operation<>'task.archive' or v_receipt.entity_id<>p_task_id then
      raise exception 'Idempotency key conflict';
    end if;
    return p_task_id;
  end if;
  if not exists (
    select 1 from public.tasks task join public.goals goal on goal.id=task.goal_id
    where task.id=p_task_id and task.user_id=v_user_id
      and task.status='active' and goal.status='active'
  ) then raise exception 'Active Task not found'; end if;
  update public.tasks set status='archived', archived_at=now()
  where id=p_task_id and user_id=v_user_id;
  update public.task_occurrences set status='cancelled', completed_at=null, skipped_at=null
  where task_id=p_task_id and status in ('pending','missed');
  update public.task_schedules set is_active=false where task_id=p_task_id and is_active;
  return p_task_id;
end;
$$;

create or replace function public.set_task_occurrence_status_v1(
  p_occurrence_id uuid,
  p_status text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_occurrence public.task_occurrences;
  v_task public.tasks;
  v_receipt public.task_mutation_receipts;
  v_inserted integer;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if p_status not in ('pending','completed','skipped') then raise exception 'Invalid occurrence status'; end if;
  if nullif(btrim(p_idempotency_key),'') is null then raise exception 'Idempotency key is required'; end if;
  insert into public.task_mutation_receipts
    (user_id,idempotency_key,operation,entity_id,result_entity_id)
  values (v_user_id,p_idempotency_key,'occurrence.status',p_occurrence_id,p_occurrence_id)
  on conflict (user_id,idempotency_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then
    select * into v_receipt from public.task_mutation_receipts
      where user_id=v_user_id and idempotency_key=p_idempotency_key;
    if v_receipt.operation <> 'occurrence.status' or v_receipt.entity_id <> p_occurrence_id then
      raise exception 'Idempotency key conflict';
    end if;
    return p_occurrence_id;
  end if;

  select occurrence.* into v_occurrence
  from public.task_occurrences occurrence
  where occurrence.id=p_occurrence_id and occurrence.user_id=v_user_id
    and occurrence.status <> 'cancelled'
    and occurrence.source <> 'legacy_tracker'
  for update;
  if v_occurrence.id is null then raise exception 'Eligible occurrence not found'; end if;
  select task.* into v_task
  from public.tasks task
  join public.goals goal on goal.id=task.goal_id
  where task.id=v_occurrence.task_id
    and task.user_id=v_user_id
    and goal.status='active'
    and (
      task.status='active'
      or (v_occurrence.schedule_id is null and task.status='complete')
    )
  for update of task;
  if v_task.id is null then raise exception 'Eligible occurrence not found'; end if;
  if v_task.completion_mode = 'quantity' then
    raise exception 'Quantity Tasks must use an atomic quantity mutation';
  end if;

  update public.task_occurrences set
    status=p_status,
    completed_at=case when p_status='completed' then coalesce(completed_at,now()) else null end,
    skipped_at=case when p_status='skipped' then coalesce(skipped_at,now()) else null end
  where id=p_occurrence_id;

  if v_occurrence.schedule_id is null then
    update public.tasks set
      status=case when p_status='completed' then 'complete' else 'active' end,
      completed_at=case when p_status='completed' then now() else null end
    where id=v_occurrence.task_id;
  end if;

  return p_occurrence_id;
end;
$$;

create or replace function public.set_task_occurrence_quantity_v1(
  p_occurrence_id uuid,
  p_quantity numeric,
  p_idempotency_key text
)
returns numeric
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_occurrence public.task_occurrences;
  v_task public.tasks;
  v_receipt public.task_mutation_receipts;
  v_status text;
  v_inserted integer;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if p_quantity is null or p_quantity < 0 then raise exception 'Quantity cannot be negative'; end if;
  if nullif(btrim(p_idempotency_key),'') is null then raise exception 'Idempotency key is required'; end if;
  insert into public.task_mutation_receipts
    (user_id,idempotency_key,operation,entity_id,result_entity_id)
  values (v_user_id,p_idempotency_key,'occurrence.quantity.set',p_occurrence_id,p_occurrence_id)
  on conflict (user_id,idempotency_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then
    select * into v_receipt from public.task_mutation_receipts
      where user_id=v_user_id and idempotency_key=p_idempotency_key;
    if v_receipt.operation <> 'occurrence.quantity.set' or v_receipt.entity_id <> p_occurrence_id then
      raise exception 'Idempotency key conflict';
    end if;
    return (v_receipt.result_payload->>'quantity')::numeric;
  end if;

  select occurrence.* into v_occurrence
  from public.task_occurrences occurrence
  where occurrence.id=p_occurrence_id and occurrence.user_id=v_user_id
    and occurrence.status <> 'cancelled'
    and occurrence.source <> 'legacy_tracker'
  for update;
  if v_occurrence.id is null then raise exception 'Eligible quantity occurrence not found'; end if;
  select task.* into v_task
  from public.tasks task
  join public.goals goal on goal.id=task.goal_id
  where task.id=v_occurrence.task_id
    and task.user_id=v_user_id
    and task.completion_mode='quantity'
    and goal.status='active'
    and (
      task.status='active'
      or (v_occurrence.schedule_id is null and task.status='complete')
    )
  for update of task;
  if v_task.id is null then raise exception 'Eligible quantity occurrence not found'; end if;
  v_status := case
    when v_task.target_quantity is not null and p_quantity >= v_task.target_quantity then 'completed'
    when v_occurrence.status = 'completed' then 'pending'
    else v_occurrence.status
  end;
  update public.task_occurrences set
    actual_quantity=p_quantity, status=v_status,
    completed_at=case when v_status='completed' then coalesce(completed_at,now()) else null end,
    skipped_at=case when v_status='skipped' then skipped_at else null end
  where id=p_occurrence_id;
  if v_occurrence.schedule_id is null then
    update public.tasks set
      status=case when v_status='completed' then 'complete' else 'active' end,
      completed_at=case when v_status='completed' then now() else null end
    where id=v_occurrence.task_id;
  end if;
  update public.task_mutation_receipts
  set result_payload=jsonb_build_object('quantity',p_quantity)
  where user_id=v_user_id and idempotency_key=p_idempotency_key;
  return p_quantity;
end;
$$;

create or replace function public.adjust_task_occurrence_quantity_v1(
  p_occurrence_id uuid,
  p_delta numeric,
  p_idempotency_key text
)
returns numeric
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_occurrence public.task_occurrences;
  v_task public.tasks;
  v_receipt public.task_mutation_receipts;
  v_quantity numeric;
  v_status text;
  v_inserted integer;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if p_delta is null or p_delta = 0 then raise exception 'Non-zero quantity delta is required'; end if;
  if nullif(btrim(p_idempotency_key),'') is null then raise exception 'Idempotency key is required'; end if;
  insert into public.task_mutation_receipts
    (user_id,idempotency_key,operation,entity_id,result_entity_id)
  values (v_user_id,p_idempotency_key,'occurrence.quantity.adjust',p_occurrence_id,p_occurrence_id)
  on conflict (user_id,idempotency_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then
    select * into v_receipt from public.task_mutation_receipts
      where user_id=v_user_id and idempotency_key=p_idempotency_key;
    if v_receipt.operation <> 'occurrence.quantity.adjust' or v_receipt.entity_id <> p_occurrence_id then
      raise exception 'Idempotency key conflict';
    end if;
    return (v_receipt.result_payload->>'quantity')::numeric;
  end if;

  select occurrence.* into v_occurrence
  from public.task_occurrences occurrence
  where occurrence.id=p_occurrence_id and occurrence.user_id=v_user_id
    and occurrence.status <> 'cancelled'
    and occurrence.source <> 'legacy_tracker'
  for update;
  if v_occurrence.id is null then raise exception 'Eligible quantity occurrence not found'; end if;
  select task.* into v_task
  from public.tasks task
  join public.goals goal on goal.id=task.goal_id
  where task.id=v_occurrence.task_id
    and task.user_id=v_user_id
    and task.completion_mode='quantity'
    and goal.status='active'
    and (
      task.status='active'
      or (v_occurrence.schedule_id is null and task.status='complete')
    )
  for update of task;
  if v_task.id is null then raise exception 'Eligible quantity occurrence not found'; end if;
  v_quantity := coalesce(v_occurrence.actual_quantity,0) + p_delta;
  if v_quantity < 0 then raise exception 'Quantity cannot be negative'; end if;
  v_status := case
    when v_task.target_quantity is not null and v_quantity >= v_task.target_quantity then 'completed'
    when v_occurrence.status = 'completed' then 'pending'
    else v_occurrence.status
  end;
  update public.task_occurrences set
    actual_quantity=v_quantity, status=v_status,
    completed_at=case when v_status='completed' then coalesce(completed_at,now()) else null end,
    skipped_at=case when v_status='skipped' then skipped_at else null end
  where id=p_occurrence_id;
  if v_occurrence.schedule_id is null then
    update public.tasks set
      status=case when v_status='completed' then 'complete' else 'active' end,
      completed_at=case when v_status='completed' then now() else null end
    where id=v_occurrence.task_id;
  end if;
  update public.task_mutation_receipts
  set result_payload=jsonb_build_object('quantity',v_quantity)
  where user_id=v_user_id and idempotency_key=p_idempotency_key;
  return v_quantity;
end;
$$;

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
  v_version integer;
  v_schedule_id uuid;
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
  update public.task_occurrences set status='cancelled', completed_at=null, skipped_at=null
  where task_id=p_task_id
    and status in ('pending','missed')
    and (
      schedule_id is null
      or scheduled_local_date >= v_today
    );

  if p_recurrence_kind is null then
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
    update public.tasks set due_date=null where id=p_task_id;
    select coalesce(max(version),0)+1 into v_version from public.task_schedules where task_id=p_task_id;
    insert into public.task_schedules (
      user_id,task_id,version,recurrence_kind,interval_count,weekdays,
      start_date,end_date,local_time,timezone,source
    ) values (
      v_user_id,p_task_id,v_version,p_recurrence_kind,p_interval_count,
      coalesce(p_weekdays,'{}'::smallint[]),coalesce(p_start_date,v_today),p_end_date,
      p_local_time,v_timezone,'user'
    ) returning id into v_schedule_id;
    perform public.reconcile_task_occurrences_v1(p_task_id,coalesce(p_start_date,v_today)+28);
  end if;
  update public.task_mutation_receipts
  set result_entity_id=v_schedule_id
  where user_id=v_user_id and idempotency_key=p_idempotency_key;
  return v_schedule_id;
end;
$$;

create or replace function public.log_completed_task_v1(
  p_goal_id uuid,
  p_title text,
  p_completion_mode text,
  p_completed_at timestamptz,
  p_description text default null,
  p_target_quantity numeric default null,
  p_quantity_unit text default null,
  p_actual_quantity numeric default null,
  p_milestone_id uuid default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
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
    p_target_quantity is null or p_target_quantity<=0 or nullif(btrim(p_quantity_unit),'') is null
    or p_actual_quantity is null or p_actual_quantity<0
  ) then raise exception 'Quantity Tasks require valid target, unit, and actual quantity'; end if;
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
$$;

revoke all on function public.touch_task_row_v1() from public, anon, authenticated;
revoke all on function public.validate_task_relationships_v1() from public, anon, authenticated;
revoke all on function public.validate_task_schedule_v1() from public, anon, authenticated;
revoke all on function public.validate_task_occurrence_v1() from public, anon, authenticated;
revoke all on function public.task_local_instant_v1(date,time,text) from public, anon, authenticated;

revoke all on function public.reconcile_task_occurrences_v1(uuid,date) from public, anon;
revoke all on function public.create_task_v1(uuid,text,text,text,numeric,text,date,uuid,integer,text,text,integer,smallint[],date,date,time,text) from public, anon;
revoke all on function public.update_task_v1(uuid,text,text,text,numeric,text,date,uuid) from public, anon;
revoke all on function public.archive_task_v1(uuid,text) from public, anon;
revoke all on function public.set_task_occurrence_status_v1(uuid,text,text) from public, anon;
revoke all on function public.set_task_occurrence_quantity_v1(uuid,numeric,text) from public, anon;
revoke all on function public.adjust_task_occurrence_quantity_v1(uuid,numeric,text) from public, anon;
revoke all on function public.replace_task_schedule_v1(uuid,text,integer,smallint[],date,date,time,text,date,text) from public, anon;
revoke all on function public.log_completed_task_v1(uuid,text,text,timestamptz,text,numeric,text,numeric,uuid,text) from public, anon;

grant execute on function public.reconcile_task_occurrences_v1(uuid,date) to authenticated;
grant execute on function public.create_task_v1(uuid,text,text,text,numeric,text,date,uuid,integer,text,text,integer,smallint[],date,date,time,text) to authenticated;
grant execute on function public.update_task_v1(uuid,text,text,text,numeric,text,date,uuid) to authenticated;
grant execute on function public.archive_task_v1(uuid,text) to authenticated;
grant execute on function public.set_task_occurrence_status_v1(uuid,text,text) to authenticated;
grant execute on function public.set_task_occurrence_quantity_v1(uuid,numeric,text) to authenticated;
grant execute on function public.adjust_task_occurrence_quantity_v1(uuid,numeric,text) to authenticated;
grant execute on function public.replace_task_schedule_v1(uuid,text,integer,smallint[],date,date,time,text,date,text) to authenticated;
grant execute on function public.log_completed_task_v1(uuid,text,text,timestamptz,text,numeric,text,numeric,uuid,text) to authenticated;

comment on table public.tasks is
  'Canonical Goals V2 Task definitions. Parent Goal lifecycle controls actionability.';
comment on table public.task_schedules is
  'Versioned, IANA-timezone Task recurrence definitions; at most one active schedule per Task.';
comment on table public.task_occurrences is
  'Durable Task occurrence history. Occurrences are never client-deleteable.';
comment on table public.task_mutation_receipts is
  'Internal retry/idempotency receipts; not the future cross-product Activity Event model.';
