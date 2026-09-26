-- Goal work v1: Task and Milestone workflows inside one owner-checked Goal (IOSB-002/003).
-- Depends on 072 (goal_private schema, goal_manual_executor, fail/sign/verify/request_owner) and the
-- canonical Task engine (048/056/057/059/063/064). Task writes delegate to those RPCs so desktop and
-- native share one rule set; this layer adds Goal scoping, strict input, lifecycle gates, digest-bound
-- operation receipts and a confirmed DTO. Milestone writes are new here (desktop still writes rows
-- directly under RLS) and keep one visible child level. Reads are bounded pages; scheduled Tasks on a
-- page are reconciled in one set-based pass instead of one RPC per Task.
-- Source preparation only, like 072/073: not deployed, no raw-grant or desktop writer changes.
begin;
-- Hosted migrations run as a non-superuser; ownership transfer needs temporary membership (see 072).
grant goal_manual_executor to current_user;
grant create on schema public, goal_private to goal_manual_executor;

-- One terminal row per operation identity. Replays return the recorded outcome with a fresh
-- projection; a different payload under the same identity is refused.
create table goal_private.work_mutations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  operation_type text not null check (operation_type in ('task.create','task.update','task.schedule','task.progress',
    'task.archive','milestone.create','milestone.update','milestone.complete')),
  goal_id uuid not null, -- Historical link deliberately has no cascading Goal FK.
  entity_id uuid,
  digest text not null check (digest ~ '^[0-9a-f]{64}$'),
  state text not null check (state in ('committed','not_committed')),
  reason text,
  recorded_at timestamptz not null,
  primary key (owner_id, operation_id),
  check ((state = 'committed' and reason is null and entity_id is not null) or (state = 'not_committed' and reason is not null))
);
create index tasks_goal_open_page on public.tasks(goal_id, sort_order, created_at, id) where status <> 'archived';
create index milestones_goal_top_page on public.milestones(goal_id, sort_order, created_at, id) where parent_id is null;

create function goal_private.work_revision(ts timestamptz) returns text language sql immutable set search_path=pg_catalog as $$
  select (extract(epoch from ts) * 1000000)::bigint::text
$$;

-- Same normalization as Goal fields (072): NFC, Unicode-space trim, character limits.
create function goal_private.work_text(value jsonb, max_len integer, optional boolean) returns text
language plpgsql immutable set search_path=pg_catalog as $$
declare result text; trimset text := E'\t\n\f\r ' || chr(11)||chr(133)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288);
begin
  if value is null or jsonb_typeof(value) = 'null' then
    if optional then return null; end if;
    raise exception 'INVALID_FIELD';
  end if;
  if jsonb_typeof(value) <> 'string' then raise exception 'INVALID_FIELD'; end if;
  result := btrim(normalize(value #>> '{}', NFC), trimset);
  if result = '' then
    if optional then return null; end if;
    raise exception 'INVALID_FIELD';
  end if;
  if char_length(result) > max_len then raise exception 'INVALID_FIELD'; end if;
  return result;
end $$;

create function goal_private.work_date(value jsonb) returns text language plpgsql immutable set search_path=pg_catalog as $$
declare day text;
begin
  if value is null or jsonb_typeof(value) = 'null' then return null; end if;
  if jsonb_typeof(value) <> 'string' then raise exception 'INVALID_FIELD'; end if;
  day := value #>> '{}';
  if day !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or left(day, 4) = '0000' or to_char(day::date, 'YYYY-MM-DD') <> day then
    raise exception 'INVALID_FIELD';
  end if;
  return day;
end $$;

create function goal_private.work_quantity(value jsonb, allow_zero boolean) returns numeric language plpgsql immutable set search_path=pg_catalog as $$
declare q numeric;
begin
  if jsonb_typeof(value) is distinct from 'number' then raise exception 'INVALID_FIELD'; end if;
  q := (value #>> '{}')::numeric;
  if q < 0 or (q = 0 and not allow_zero) or q > 1000000 or scale(q) > 2 then raise exception 'INVALID_FIELD'; end if;
  return q;
end $$;

-- Task fields. Create requires title + completionMode; an edit supplies a non-empty subset.
create function goal_private.work_task_fields(input jsonb, partial boolean) returns jsonb
language plpgsql immutable set search_path=pg_catalog,goal_private as $$
declare result jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(input) is distinct from 'object' or (partial and input = '{}'::jsonb)
    or (input - array['title','description','completionMode','targetQuantity','quantityUnit']) <> '{}'::jsonb
    or (not partial and not (input ? 'title' and input ? 'completionMode')) then raise exception 'INVALID_FIELD'; end if;
  if input ? 'title' then result := result || jsonb_build_object('title', work_text(input->'title', 200, false)); end if;
  if input ? 'description' then result := result || jsonb_build_object('description', work_text(input->'description', 2000, true)); end if;
  if input ? 'completionMode' then
    if jsonb_typeof(input->'completionMode') <> 'string' or input->>'completionMode' not in ('binary','quantity') then raise exception 'INVALID_FIELD'; end if;
    result := result || jsonb_build_object('completionMode', input->>'completionMode');
  end if;
  if input ? 'targetQuantity' then
    result := result || jsonb_build_object('targetQuantity',
      case when jsonb_typeof(input->'targetQuantity') = 'null' then null else work_quantity(input->'targetQuantity', false) end);
  end if;
  if input ? 'quantityUnit' then result := result || jsonb_build_object('quantityUnit', work_text(input->'quantityUnit', 40, true)); end if;
  if not partial and result->>'completionMode' = 'binary' and (result->'targetQuantity' <> 'null'::jsonb or result->'quantityUnit' <> 'null'::jsonb) then
    raise exception 'INVALID_FIELD';
  end if;
  return result;
end $$;

-- Schedule choices exposed natively: one-time (optional due date), every day, chosen weekdays,
-- or N times a week. Interval, end date and time of day stay desktop-only for now.
create function goal_private.work_schedule(input jsonb) returns jsonb language plpgsql immutable set search_path=pg_catalog,goal_private as $$
declare days smallint[];
begin
  if jsonb_typeof(input) is distinct from 'object' or jsonb_typeof(input->'kind') is distinct from 'string' then raise exception 'INVALID_FIELD'; end if;
  case input->>'kind'
    when 'once' then
      if input - array['kind','dueDate'] <> '{}'::jsonb then raise exception 'INVALID_FIELD'; end if;
      return jsonb_build_object('kind','once','dueDate', work_date(input->'dueDate'));
    when 'daily' then
      if input - 'kind' <> '{}'::jsonb then raise exception 'INVALID_FIELD'; end if;
      return jsonb_build_object('kind','daily');
    when 'weekly' then
      if input - array['kind','weekdays'] <> '{}'::jsonb or jsonb_typeof(input->'weekdays') is distinct from 'array'
        or jsonb_array_length(input->'weekdays') not between 1 and 7
        or exists(select 1 from jsonb_array_elements(input->'weekdays') d where jsonb_typeof(d) <> 'number' or d::text !~ '^[1-7]$') then
        raise exception 'INVALID_FIELD';
      end if;
      select array_agg(distinct d::text::smallint order by d::text::smallint) into days from jsonb_array_elements(input->'weekdays') d;
      if cardinality(days) <> jsonb_array_length(input->'weekdays') then raise exception 'INVALID_FIELD'; end if;
      return jsonb_build_object('kind','weekly','weekdays', to_jsonb(days));
    when 'weekly_count' then
      if input - array['kind','targetCount'] <> '{}'::jsonb or jsonb_typeof(input->'targetCount') is distinct from 'number'
        or input->>'targetCount' !~ '^[1-7]$' then raise exception 'INVALID_FIELD'; end if;
      return jsonb_build_object('kind','weekly_count','targetCount', (input->>'targetCount')::integer);
    else raise exception 'INVALID_FIELD';
  end case;
end $$;

create function goal_private.work_progress(input jsonb) returns jsonb language plpgsql immutable set search_path=pg_catalog,goal_private as $$
declare delta numeric;
begin
  if jsonb_typeof(input) is distinct from 'object' or jsonb_typeof(input->'action') is distinct from 'string' then raise exception 'INVALID_FIELD'; end if;
  case input->>'action'
    when 'complete', 'reopen' then
      if input - 'action' <> '{}'::jsonb then raise exception 'INVALID_FIELD'; end if;
      return jsonb_build_object('action', input->>'action');
    when 'adjust' then
      if input - array['action','delta'] <> '{}'::jsonb or jsonb_typeof(input->'delta') is distinct from 'number' then raise exception 'INVALID_FIELD'; end if;
      delta := (input->>'delta')::numeric;
      if delta = 0 or abs(delta) > 1000000 or scale(delta) > 2 then raise exception 'INVALID_FIELD'; end if;
      return jsonb_build_object('action','adjust','delta', delta);
    when 'set' then
      if input - array['action','quantity'] <> '{}'::jsonb then raise exception 'INVALID_FIELD'; end if;
      return jsonb_build_object('action','set','quantity', work_quantity(input->'quantity', true));
    else raise exception 'INVALID_FIELD';
  end case;
end $$;

-- Milestone fields. Children (one visible level) carry a title only; see the delivery note.
create function goal_private.work_milestone_fields(input jsonb, partial boolean, child boolean) returns jsonb
language plpgsql immutable set search_path=pg_catalog,goal_private as $$
declare result jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(input) is distinct from 'object' or (partial and input = '{}'::jsonb)
    or (input - case when child then array['title'] else array['title','description','dueDate','targetCount'] end) <> '{}'::jsonb
    or (not partial and not input ? 'title') then raise exception 'INVALID_FIELD'; end if;
  if input ? 'title' then result := result || jsonb_build_object('title', work_text(input->'title', 200, false)); end if;
  if input ? 'description' then result := result || jsonb_build_object('description', work_text(input->'description', 2000, true)); end if;
  if input ? 'dueDate' then result := result || jsonb_build_object('dueDate', work_date(input->'dueDate')); end if;
  if input ? 'targetCount' then
    if jsonb_typeof(input->'targetCount') = 'null' then result := result || '{"targetCount":null}'::jsonb;
    elsif jsonb_typeof(input->'targetCount') = 'number' and input->>'targetCount' ~ '^[1-9][0-9]?$' then
      result := result || jsonb_build_object('targetCount', (input->>'targetCount')::integer);
    else raise exception 'INVALID_FIELD'; end if;
  end if;
  return result;
end $$;

-- Set-based reconciliation for a bounded set of Tasks: materializes each active schedule from its
-- frontier (latest existing occurrence) through the current period with the exact occurrence keys and
-- missed rules of reconcile_task_occurrences_v1 (059/063), then marks elapsed pending periods missed.
-- It never materializes ahead of today, so desktop's own forward reconcile continues from here.
create function goal_private.work_reconcile(owner uuid, task_ids uuid[]) returns void language plpgsql
set search_path=pg_catalog,public as $$
begin
  insert into public.task_occurrences (user_id, task_id, schedule_id, occurrence_key, scheduled_local_date,
    scheduled_local_time, schedule_timezone, scheduled_at, status, actual_quantity, source)
  select owner, t.id, s.id,
    'schedule:' || s.id::text || ':v' || s.version::text || ':' || d.day::text || ':' || coalesce(s.local_time::text, 'anytime'),
    d.day, s.local_time, s.timezone, public.task_local_instant_v1(d.day, s.local_time, s.timezone),
    case when s.recurrence_kind = 'weekly_count'
      then case when (date_trunc('week', d.day)::date + 6) < w.today then 'missed' else 'pending' end
      else case when d.day < w.today then 'missed' else 'pending' end end,
    case when t.completion_mode = 'quantity' then 0 else null end, 'schedule'
  from public.tasks t
  join public.goals g on g.id = t.goal_id and g.user_id = owner and g.status = 'active'
  join public.task_schedules s on s.task_id = t.id and s.user_id = owner and s.is_active
  cross join lateral (select (clock_timestamp() at time zone s.timezone)::date as today) w
  cross join lateral (select max(o.scheduled_local_date) as frontier from public.task_occurrences o
    where o.task_id = t.id and o.schedule_id = s.id) f
  cross join lateral generate_series(greatest(s.start_date, coalesce(f.frontier + 1, s.start_date), w.today - 3660),
    least(coalesce(s.end_date, w.today), w.today), interval '1 day') gs(day_value)
  cross join lateral (select gs.day_value::date as day) d
  where t.id = any(task_ids) and t.user_id = owner and t.status = 'active'
    and ((s.recurrence_kind = 'daily' and mod(d.day - s.start_date, s.interval_count) = 0)
      or (s.recurrence_kind = 'weekly' and mod((d.day - s.start_date) / 7, s.interval_count) = 0
        and extract(isodow from d.day)::smallint = any(s.weekdays))
      or (s.recurrence_kind = 'weekly_count' and d.day = greatest(date_trunc('week', d.day)::date, s.start_date)))
  -- Target-less: an occupied day (075's one-per-day index) or an existing key is simply skipped.
  on conflict do nothing;

  update public.task_occurrences o set status = 'missed'
  from public.task_schedules s, public.tasks t, public.goals g
  where o.task_id = any(task_ids) and o.user_id = owner and o.schedule_id = s.id and o.status = 'pending'
    and t.id = o.task_id and t.status = 'active' and g.id = t.goal_id and g.status = 'active'
    and case when s.recurrence_kind = 'weekly_count'
      then (date_trunc('week', o.scheduled_local_date)::date + 6) < (clock_timestamp() at time zone s.timezone)::date
      else o.scheduled_local_date < (clock_timestamp() at time zone s.timezone)::date end;
end $$;

-- Confirmed Task DTO. `current` is the one actionable occurrence: the single one-time occurrence, or
-- the current day/week period of the active schedule. Callers reconcile active Tasks first.
create function goal_private.work_task(t public.tasks) returns jsonb language plpgsql stable set search_path=pg_catalog,public,goal_private as $$
declare s public.task_schedules; o public.task_occurrences; today date; anchor date; period text; state text;
begin
  select * into s from public.task_schedules where task_id = t.id and user_id = t.user_id and is_active limit 1;
  if s.id is null then
    select * into o from public.task_occurrences where task_id = t.id and user_id = t.user_id and schedule_id is null and status <> 'cancelled'
      order by created_at desc, id desc limit 1;
    period := 'once'; state := coalesce(o.status, 'unavailable');
  elsif t.status = 'active' then
    today := (clock_timestamp() at time zone s.timezone)::date;
    anchor := case when s.recurrence_kind = 'weekly_count' then greatest(date_trunc('week', today)::date, s.start_date) else today end;
    period := case when s.recurrence_kind = 'weekly_count' then 'week' else 'day' end;
    select * into o from public.task_occurrences where task_id = t.id and schedule_id = s.id and scheduled_local_date = anchor
      and status <> 'cancelled' order by scheduled_local_time nulls first, id limit 1;
    state := coalesce(o.status, 'not_scheduled');
  end if;
  return jsonb_build_object('id', t.id, 'title', t.title, 'description', t.description, 'status', t.status,
    'completionMode', t.completion_mode, 'targetQuantity', t.target_quantity, 'quantityUnit', t.quantity_unit,
    'origin', case when t.source = 'user' then 'user' else 'legacy' end, 'revision', work_revision(t.updated_at),
    'schedule', case when s.id is null then jsonb_build_object('kind', 'once', 'dueDate', to_char(t.due_date, 'YYYY-MM-DD'))
      else jsonb_build_object('kind', s.recurrence_kind, 'intervalCount', s.interval_count, 'weekdays', to_jsonb(s.weekdays),
        'targetCount', s.target_count, 'startDate', to_char(s.start_date, 'YYYY-MM-DD'), 'endDate', to_char(s.end_date, 'YYYY-MM-DD'),
        'timezone', s.timezone) end,
    'current', case when period is null then null else jsonb_build_object('occurrenceId', o.id, 'period', period,
      'date', to_char(coalesce(o.scheduled_local_date, anchor), 'YYYY-MM-DD'), 'state', state, 'actualQuantity', o.actual_quantity) end);
end $$;

create function goal_private.work_milestone_row(m public.milestones) returns jsonb language sql stable set search_path=pg_catalog,public,goal_private as $$
  select jsonb_build_object('id', m.id, 'parentId', m.parent_id, 'title', m.title, 'description', m.description, 'kind', m.kind,
    'dueDate', to_char(m.due_date, 'YYYY-MM-DD'), 'completedAt', m.completed_at, 'targetCount', m.target_count,
    'revision', work_revision(m.updated_at))
$$;

-- Top-level Milestone with its first 20 children embedded (one visible level) and exact counts.
create function goal_private.work_milestone(m public.milestones) returns jsonb language sql stable set search_path=pg_catalog,public,goal_private as $$
  select work_milestone_row(m) || jsonb_build_object(
    'childCount', (select count(*) from public.milestones c where c.parent_id = m.id and c.user_id = m.user_id),
    'completedChildCount', (select count(*) from public.milestones c where c.parent_id = m.id and c.user_id = m.user_id and c.completed_at is not null),
    'children', coalesce((select jsonb_agg(work_milestone_row(k) order by k.sort_order, k.created_at, k.id)
      from (select * from public.milestones c where c.parent_id = m.id and c.user_id = m.user_id
        order by c.sort_order, c.created_at, c.id limit 20) k), '[]'::jsonb))
$$;

-- Maps the canonical Task RPC exceptions onto stable reasons. Unknown failures re-raise (no receipt).
create function goal_private.work_reason(message text) returns text language sql immutable as $$
  select case message
    when 'Active Goal not found' then 'GOAL_NOT_ACTIVE'
    when 'Tasks on inactive Goals are read-only' then 'GOAL_NOT_ACTIVE'
    when 'Active Task not found' then 'TASK_NOT_ACTIVE'
    when 'Completion mode cannot change after Task history exists' then 'MODE_LOCKED'
    when 'Eligible occurrence not found' then 'PROGRESS_UNAVAILABLE'
    when 'Eligible quantity occurrence not found' then 'PROGRESS_UNAVAILABLE'
    when 'Quantity Tasks must use an atomic quantity mutation' then 'PROGRESS_UNAVAILABLE'
    when 'Quantity cannot be negative' then 'PROGRESS_INVALID'
    when 'Recurring Tasks cannot also use a one-time deadline' then 'FIELD_CONFLICT'
    when 'Binary Tasks cannot have quantity configuration' then 'FIELD_CONFLICT'
    else null end
$$;

-- Receipt plus a fresh projection of the affected Task, or of the affected top-level Milestone
-- (children embedded) so the client replaces one item. Nothing foreign is ever projected.
create function goal_private.work_result(m goal_private.work_mutations) returns jsonb language plpgsql set search_path=pg_catalog,public,goal_private as $$
declare t public.tasks; ms public.milestones; entity jsonb; owned boolean;
begin
  owned := exists(select 1 from public.goals where id = m.goal_id and user_id = m.owner_id);
  if owned and m.entity_id is not null then
    if m.operation_type like 'task.%' then
      select * into t from public.tasks where id = m.entity_id and user_id = m.owner_id and goal_id = m.goal_id;
      if found then
        if t.status = 'active' then perform work_reconcile(m.owner_id, array[t.id]); end if;
        entity := work_task(t);
      end if;
    else
      select * into ms from public.milestones where id = m.entity_id and user_id = m.owner_id and goal_id = m.goal_id;
      if found and ms.parent_id is not null then
        select * into ms from public.milestones where id = ms.parent_id and user_id = m.owner_id and goal_id = m.goal_id;
      end if;
      if found then entity := work_milestone(ms); end if;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'data', jsonb_build_object('ownerId', m.owner_id, 'operationId', m.operation_id,
    'operationType', m.operation_type, 'contractVersion', 1, 'state', m.state, 'reason', m.reason,
    'goalId', case when owned then m.goal_id end, 'recordedAt', m.recorded_at,
    'task', case when m.operation_type like 'task.%' then entity end,
    'milestone', case when m.operation_type like 'milestone.%' then entity end));
end $$;

create function public.goal_work_v1(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,goal_private,extensions
set lock_timeout='5s' set statement_timeout='15s' as $$
declare owner uuid := goal_private.request_owner(); gid uuid; g public.goals; allowed text[]; limit_n integer;
  cursor_data jsonb; rows jsonb; more boolean; next_cursor text; purpose text; expiry timestamptz; ids uuid[];
  oid uuid; op text; m goal_private.work_mutations; body jsonb; hash text; reason text; entity uuid; target uuid;
  t public.tasks; s public.task_schedules; o public.task_occurrences; ms public.milestones; parent public.milestones;
  fields jsonb; changes jsonb; sched jsonb; progress jsonb; mode text; qty numeric; unit text; due_time time;
  today date; current_kind text; key text;
begin
  if owner is null then return goal_private.fail('UNAUTHORIZED'); end if;
  allowed := case action
    when 'tasks' then array['goalId','cursor','limit'] when 'milestones' then array['goalId','cursor','limit']
    when 'mutate' then array['operationId','operationType','contractVersion','goalId','taskId','milestoneId','parentId',
      'occurrenceId','expectedRevision','fields','changes','schedule','progress'] else null end;
  if allowed is null or jsonb_typeof(payload) is distinct from 'object' or payload - allowed <> '{}'::jsonb then return goal_private.fail('INVALID_FIELD'); end if;
  gid := (payload->>'goalId')::uuid;
  if gid is null then return goal_private.fail('INVALID_FIELD'); end if;

  if action in ('tasks','milestones') then
    -- Ownership first: a missing or foreign Goal is never an empty collection.
    select * into g from public.goals where id = gid and user_id = owner;
    if not found then return goal_private.fail('GOAL_UNAVAILABLE'); end if;
    limit_n := coalesce((payload->>'limit')::integer, 20);
    if limit_n < 1 or limit_n > 50 then return goal_private.fail('INVALID_FIELD'); end if;
    purpose := 'work:' || action; expiry := clock_timestamp() + interval '15 minutes';
    if payload->>'cursor' is not null then
      cursor_data := goal_private.verify(payload->>'cursor', owner, purpose);
      if cursor_data is null or cursor_data->>'goal' <> gid::text then return goal_private.fail('CURSOR_EXPIRED'); end if;
      expiry := (cursor_data->>'expires')::timestamptz;
    end if;
    if action = 'tasks' then
      select array_agg(p.id order by p.sort_order, p.created_at, p.id) into ids from (
        select x.id, x.sort_order, x.created_at from public.tasks x where x.user_id = owner and x.goal_id = gid and x.status <> 'archived'
          and (cursor_data is null or (x.sort_order, x.created_at, x.id) > ((cursor_data->>'sort')::integer, (cursor_data->>'time')::timestamptz, (cursor_data->>'id')::uuid))
          order by x.sort_order, x.created_at, x.id limit limit_n + 1) p;
      -- One bounded pass for the whole page; inactive Goals stay read-only and unreconciled.
      if g.status = 'active' and ids is not null then perform goal_private.work_reconcile(owner, ids); end if;
      select coalesce(jsonb_agg(goal_private.work_task(x) || jsonb_build_object('_k', jsonb_build_object('sort', x.sort_order, 'time', x.created_at))
        order by x.sort_order, x.created_at, x.id), '[]') into rows from public.tasks x where x.id = any(coalesce(ids, '{}'));
    else
      with page as (select x.* from public.milestones x where x.user_id = owner and x.goal_id = gid and x.parent_id is null
          and (cursor_data is null or (x.sort_order, x.created_at, x.id) > ((cursor_data->>'sort')::integer, (cursor_data->>'time')::timestamptz, (cursor_data->>'id')::uuid))
          order by x.sort_order, x.created_at, x.id limit limit_n + 1)
      select coalesce(jsonb_agg(goal_private.work_milestone(p::public.milestones) || jsonb_build_object('_k', jsonb_build_object('sort', p.sort_order, 'time', p.created_at))
        order by p.sort_order, p.created_at, p.id), '[]') into rows from page p;
    end if;
    more := jsonb_array_length(rows) > limit_n;
    if more then
      rows := rows - limit_n;
      next_cursor := goal_private.sign(jsonb_build_object('owner', owner, 'purpose', purpose, 'goal', gid, 'expires', expiry,
        'id', rows->-1->>'id') || (rows->-1->'_k'));
    end if;
    select coalesce(jsonb_agg(value - '_k'), '[]') into rows from jsonb_array_elements(rows);
    return jsonb_build_object('ok', true, 'data', jsonb_build_object('ownerId', owner, 'contractVersion', 1, 'goalId', gid,
      'items', rows, 'hasMore', more, 'nextCursor', next_cursor));
  end if;

  -- action = 'mutate': strict per-operation shape, normalized before identity/digest.
  oid := (payload->>'operationId')::uuid; op := payload->>'operationType';
  if oid is null then return goal_private.fail('INVALID_FIELD'); end if;
  if op is null or op not in ('task.create','task.update','task.schedule','task.progress','task.archive',
      'milestone.create','milestone.update','milestone.complete') or payload->'contractVersion' is distinct from '1'::jsonb then
    return goal_private.fail('UNSUPPORTED_CONTRACT');
  end if;
  allowed := case op
    when 'task.create' then array['fields','schedule'] when 'task.update' then array['taskId','expectedRevision','changes']
    when 'task.schedule' then array['taskId','expectedRevision','schedule'] when 'task.progress' then array['taskId','occurrenceId','progress']
    when 'task.archive' then array['taskId'] when 'milestone.create' then array['parentId','fields']
    when 'milestone.update' then array['milestoneId','expectedRevision','changes'] else array['milestoneId'] end;
  if payload - array['operationId','operationType','contractVersion','goalId'] - allowed <> '{}'::jsonb
    or exists(select 1 from unnest(allowed) k where k <> 'parentId' and not payload ? k)
    or (payload ? 'expectedRevision' and (jsonb_typeof(payload->'expectedRevision') <> 'string' or payload->>'expectedRevision' !~ '^-?[0-9]{1,20}$')) then
    return goal_private.fail('INVALID_FIELD');
  end if;
  body := jsonb_build_object('goalId', gid);
  case op
    when 'task.create' then
      fields := goal_private.work_task_fields(payload->'fields', false); sched := goal_private.work_schedule(payload->'schedule');
      -- A weekly-count Task is a quantity counter whose target is the weekly N (059); the server mirrors it.
      if sched->>'kind' = 'weekly_count' and (fields->>'completionMode' <> 'quantity' or fields->'targetQuantity' <> 'null'::jsonb) then
        return goal_private.fail('INVALID_FIELD');
      end if;
      body := body || jsonb_build_object('fields', fields, 'schedule', sched);
    when 'task.update' then
      body := body || jsonb_build_object('taskId', (payload->>'taskId')::uuid, 'expectedRevision', payload->>'expectedRevision',
        'changes', goal_private.work_task_fields(payload->'changes', true));
    when 'task.schedule' then
      body := body || jsonb_build_object('taskId', (payload->>'taskId')::uuid, 'expectedRevision', payload->>'expectedRevision',
        'schedule', goal_private.work_schedule(payload->'schedule'));
    when 'task.progress' then
      body := body || jsonb_build_object('taskId', (payload->>'taskId')::uuid, 'occurrenceId', (payload->>'occurrenceId')::uuid,
        'progress', goal_private.work_progress(payload->'progress'));
    when 'task.archive' then
      body := body || jsonb_build_object('taskId', (payload->>'taskId')::uuid);
    when 'milestone.create' then
      if payload ? 'parentId' and jsonb_typeof(payload->'parentId') not in ('string','null') then return goal_private.fail('INVALID_FIELD'); end if;
      body := body || jsonb_build_object('parentId', (payload->>'parentId')::uuid,
        'fields', goal_private.work_milestone_fields(payload->'fields', false, payload->>'parentId' is not null));
    when 'milestone.update' then
      body := body || jsonb_build_object('milestoneId', (payload->>'milestoneId')::uuid, 'expectedRevision', payload->>'expectedRevision',
        'changes', goal_private.work_milestone_fields(payload->'changes', true, false));
    else
      body := body || jsonb_build_object('milestoneId', (payload->>'milestoneId')::uuid);
  end case;
  if exists(select 1 from jsonb_each(body) e where e.key in ('taskId','milestoneId','occurrenceId') and e.value = 'null'::jsonb) then
    return goal_private.fail('INVALID_FIELD');
  end if;
  hash := encode(extensions.digest(convert_to(jsonb_build_array(1, op, body)::text, 'UTF8'), 'sha256'), 'hex');

  -- Serializes every attempt for one identity; a repeat returns the recorded outcome.
  perform pg_advisory_xact_lock(hashtextextended('goal_work_v1:' || owner::text || ':' || oid::text, 0));
  select * into m from goal_private.work_mutations where owner_id = owner and operation_id = oid;
  if found then
    if m.digest <> hash then return goal_private.fail('OPERATION_PAYLOAD_MISMATCH'); end if;
    return goal_private.work_result(m);
  end if;

  -- Lifecycle gate. The Goal row lock serializes child writes (and limits) per Goal while still
  -- admitting FK key-share checks; a concurrent Goal complete/archive waits for this transaction.
  select * into g from public.goals where id = gid and user_id = owner for no key update;
  if not found then reason := 'GOAL_UNAVAILABLE';
  elsif g.status <> 'active' or exists(select 1 from public.goals n where n.previous_goal_id = gid) then reason := 'GOAL_NOT_ACTIVE';
  end if;
  key := 'goal-work:' || oid::text;

  if reason is null and op like 'task.%' and op <> 'task.create' then
    target := (body->>'taskId')::uuid;
    select * into t from public.tasks where id = target and user_id = owner and goal_id = gid for update;
    if not found or t.status = 'archived' then reason := 'TASK_UNAVAILABLE'; target := null;
    else
      entity := t.id;
      select * into s from public.task_schedules where task_id = t.id and user_id = owner and is_active;
      if op <> 'task.progress' and t.status <> 'active' then reason := 'TASK_NOT_ACTIVE';
      elsif op in ('task.update','task.schedule') and goal_private.work_revision(t.updated_at) <> body->>'expectedRevision' then reason := 'VERSION_CONFLICT';
      end if;
    end if;
  elsif reason is null and op in ('milestone.update','milestone.complete') then
    select * into ms from public.milestones where id = (body->>'milestoneId')::uuid and user_id = owner and goal_id = gid for update;
    if found and ms.parent_id is not null then
      select * into parent from public.milestones where id = ms.parent_id and user_id = owner and goal_id = gid;
    end if;
    -- Only the visible levels are writable: top-level Milestones and their direct children.
    if ms.id is null or (ms.parent_id is not null and (parent.id is null or parent.parent_id is not null)) then reason := 'MILESTONE_UNAVAILABLE';
    else
      entity := ms.id;
      if ms.completed_at is not null then reason := 'MILESTONE_COMPLETE';
      elsif op = 'milestone.update' and goal_private.work_revision(ms.updated_at) <> body->>'expectedRevision' then reason := 'VERSION_CONFLICT';
      end if;
    end if;
  end if;

  if reason is null then
    today := (clock_timestamp() at time zone coalesce((select nullif(timezone, '') from public.profiles where id = owner), 'UTC'))::date;
    begin
      case op
        when 'task.create' then
          fields := body->'fields'; sched := body->'schedule';
          if (select count(*) from public.tasks where goal_id = gid and user_id = owner and status <> 'archived') >= 100 then reason := 'LIMIT_REACHED';
          elsif sched->>'dueDate' < to_char(today, 'YYYY-MM-DD') then reason := 'DATE_IN_PAST';
          else
            entity := public.create_task_v1(p_goal_id => gid, p_title => fields->>'title', p_completion_mode => fields->>'completionMode',
              p_description => fields->>'description', p_target_quantity => (fields->>'targetQuantity')::numeric,
              p_quantity_unit => fields->>'quantityUnit', p_due_date => (sched->>'dueDate')::date, p_milestone_id => null,
              p_sort_order => 0, p_idempotency_key => key, p_schedule_kind => nullif(sched->>'kind', 'once'), p_schedule_interval => 1,
              p_schedule_weekdays => array(select jsonb_array_elements_text(coalesce(sched->'weekdays', '[]'))::smallint),
              p_schedule_target_count => (sched->>'targetCount')::integer);
          end if;
        when 'task.update' then
          changes := body->'changes';
          mode := coalesce(changes->>'completionMode', t.completion_mode);
          qty := case when changes ? 'targetQuantity' then (changes->>'targetQuantity')::numeric else t.target_quantity end;
          unit := case when changes ? 'quantityUnit' then changes->>'quantityUnit' else t.quantity_unit end;
          if mode = 'binary' and (qty is not null or unit is not null) then reason := 'FIELD_CONFLICT';
          elsif s.recurrence_kind = 'weekly_count' and (mode <> 'quantity' or qty is distinct from s.target_count::numeric) then reason := 'FIELD_CONFLICT';
          elsif coalesce(changes->>'title', t.title) = t.title
            and (not changes ? 'description' or changes->>'description' is not distinct from t.description)
            and mode = t.completion_mode and qty is not distinct from t.target_quantity and unit is not distinct from t.quantity_unit then reason := 'NO_CHANGES';
          else
            -- update_task_v1 replaces every column it owns; carry the untouched ones (including a To-Do time) forward.
            select scheduled_local_time into due_time from public.task_occurrences
              where task_id = t.id and schedule_id is null and status = 'pending' order by created_at desc limit 1;
            perform public.update_task_v1(t.id, coalesce(changes->>'title', t.title), mode,
              case when changes ? 'description' then changes->>'description' else t.description end,
              qty, unit, t.due_date, t.milestone_id, due_time);
          end if;
        when 'task.schedule' then
          sched := body->'schedule'; current_kind := coalesce(s.recurrence_kind, 'once');
          if sched->>'kind' = 'weekly_count' or current_kind = 'weekly_count' then reason := 'SCHEDULE_UNSUPPORTED';
          elsif sched->>'kind' = current_kind and (current_kind = 'once' and (sched->>'dueDate') is not distinct from to_char(t.due_date, 'YYYY-MM-DD')
              or current_kind <> 'once' and s.interval_count = 1 and s.end_date is null and s.local_time is null
                and to_jsonb(s.weekdays) = coalesce(sched->'weekdays', '[]'::jsonb)) then reason := 'NO_CHANGES';
          elsif sched->>'dueDate' < to_char(today, 'YYYY-MM-DD') then reason := 'DATE_IN_PAST';
          elsif current_kind = 'once' and sched->>'kind' = 'once' then
            -- Moving a one-time date keeps its occurrence (and any quantity already logged) in place.
            select scheduled_local_time into due_time from public.task_occurrences
              where task_id = t.id and schedule_id is null and status = 'pending' order by created_at desc limit 1;
            perform public.update_task_v1(t.id, t.title, t.completion_mode, t.description, t.target_quantity, t.quantity_unit,
              (sched->>'dueDate')::date, t.milestone_id, due_time);
          else
            perform public.replace_task_schedule_v1(t.id, nullif(sched->>'kind', 'once'), 1,
              array(select jsonb_array_elements_text(coalesce(sched->'weekdays', '[]'))::smallint), null, null, null, null,
              (sched->>'dueDate')::date, key);
          end if;
        when 'task.progress' then
          progress := body->'progress';
          if t.status = 'active' then perform goal_private.work_reconcile(owner, array[t.id]); end if;
          select * into o from public.task_occurrences where id = (body->>'occurrenceId')::uuid and task_id = t.id and user_id = owner for update;
          -- Only the current actionable occurrence is writable here; history edits stay desktop-only.
          if o.id is null or (goal_private.work_task(t)->'current'->>'occurrenceId') is distinct from o.id::text then reason := 'OCCURRENCE_STALE';
          elsif (progress->>'action' in ('complete','reopen')) <> (t.completion_mode = 'binary') then reason := 'PROGRESS_INVALID';
          elsif progress->>'action' = 'complete' and o.status = 'completed'
            or progress->>'action' = 'reopen' and o.status = 'pending'
            or progress->>'action' = 'set' and o.actual_quantity is not distinct from (progress->>'quantity')::numeric then reason := 'NO_CHANGES';
          elsif progress->>'action' = 'adjust' and coalesce(o.actual_quantity, 0) + (progress->>'delta')::numeric < 0 then reason := 'PROGRESS_INVALID';
          elsif progress->>'action' = 'complete' then perform public.set_task_occurrence_status_v1(o.id, 'completed', key);
          elsif progress->>'action' = 'reopen' then perform public.set_task_occurrence_status_v1(o.id, 'pending', key);
          elsif progress->>'action' = 'adjust' then perform public.adjust_task_occurrence_quantity_v1(o.id, (progress->>'delta')::numeric, key);
          else perform public.set_task_occurrence_quantity_v1(o.id, (progress->>'quantity')::numeric, key);
          end if;
        when 'task.archive' then
          perform public.archive_task_v1(t.id, key);
        when 'milestone.create' then
          fields := body->'fields'; target := (body->>'parentId')::uuid;
          if target is not null then
            select * into parent from public.milestones where id = target and user_id = owner and goal_id = gid for update;
            if not found or parent.parent_id is not null then reason := 'PARENT_INVALID';
            elsif parent.completed_at is not null then reason := 'MILESTONE_COMPLETE';
            elsif (select count(*) from public.milestones where parent_id = target and user_id = owner) >= 20 then reason := 'LIMIT_REACHED';
            end if;
          elsif (select count(*) from public.milestones where goal_id = gid and user_id = owner and parent_id is null) >= 100 then reason := 'LIMIT_REACHED';
          end if;
          if reason is null then
            insert into public.milestones(goal_id, user_id, title, description, due_date, target_count, parent_id, kind, sort_order)
            values (gid, owner, fields->>'title', fields->>'description', (fields->>'dueDate')::date, (fields->>'targetCount')::integer, target,
              'achievement', coalesce((select max(sort_order) + 1 from public.milestones where goal_id = gid and user_id = owner
                and parent_id is not distinct from target), 0))
            returning id into entity;
          end if;
        when 'milestone.update' then
          changes := body->'changes';
          if ms.parent_id is not null and changes - 'title' <> '{}'::jsonb then reason := 'FIELD_CONFLICT';
          elsif coalesce(changes->>'title', ms.title) = ms.title
            and (not changes ? 'description' or changes->>'description' is not distinct from ms.description)
            and (not changes ? 'dueDate' or changes->>'dueDate' is not distinct from to_char(ms.due_date, 'YYYY-MM-DD'))
            and (not changes ? 'targetCount' or (changes->>'targetCount')::integer is not distinct from ms.target_count) then reason := 'NO_CHANGES';
          else
            update public.milestones set
              title = coalesce(changes->>'title', title),
              description = case when changes ? 'description' then changes->>'description' else description end,
              due_date = case when changes ? 'dueDate' then (changes->>'dueDate')::date else due_date end,
              target_count = case when changes ? 'targetCount' then (changes->>'targetCount')::integer else target_count end
            where id = ms.id;
          end if;
        else
          -- One-way, explicit completion (desktop parity): a counter Milestone may be sealed early and
          -- completing a parent never completes its children.
          update public.milestones set completed_at = clock_timestamp() where id = ms.id;
      end case;
    exception when raise_exception then
      reason := goal_private.work_reason(sqlerrm);
      if reason is null then raise; end if;
    end;
  end if;

  insert into goal_private.work_mutations(owner_id, operation_id, operation_type, goal_id, entity_id, digest, state, reason, recorded_at)
  values (owner, oid, op, gid, case when reason is null or op not in ('task.create','milestone.create') then entity end, hash,
    case when reason is null then 'committed' else 'not_committed' end, reason, clock_timestamp())
  returning * into m;
  return goal_private.work_result(m);
exception
  when invalid_text_representation or datetime_field_overflow or invalid_datetime_format or numeric_value_out_of_range then
    return goal_private.fail('INVALID_FIELD');
  when raise_exception then
    if sqlerrm = 'INVALID_FIELD' then return goal_private.fail('INVALID_FIELD'); end if;
    raise;
end $$;

grant select, insert on goal_private.work_mutations to goal_manual_executor;
grant select on public.tasks, public.task_schedules, public.task_occurrences, public.milestones to goal_manual_executor;
grant insert, update(status) on public.task_occurrences to goal_manual_executor;
-- Row locks (SELECT … FOR UPDATE) require UPDATE on some column. Task rows themselves are only
-- written by the canonical RPCs; the Goal lock relies on 073's column grant.
grant update(updated_at) on public.tasks to goal_manual_executor;
grant insert, update(title, description, due_date, target_count, completed_at, updated_at) on public.milestones to goal_manual_executor;
grant execute on function public.task_local_instant_v1(date,time,text),
  public.create_task_v1(uuid,text,text,text,numeric,text,date,uuid,integer,text,text,integer,smallint[],date,date,time,text,integer),
  public.update_task_v1(uuid,text,text,text,numeric,text,date,uuid,time),
  public.replace_task_schedule_v1(uuid,text,integer,smallint[],date,date,time,text,date,text),
  public.archive_task_v1(uuid,text), public.set_task_occurrence_status_v1(uuid,text,text),
  public.set_task_occurrence_quantity_v1(uuid,numeric,text), public.adjust_task_occurrence_quantity_v1(uuid,numeric,text)
  to goal_manual_executor;
grant execute on function goal_private.work_revision(timestamptz), goal_private.work_text(jsonb,integer,boolean), goal_private.work_date(jsonb),
  goal_private.work_quantity(jsonb,boolean), goal_private.work_task_fields(jsonb,boolean), goal_private.work_schedule(jsonb),
  goal_private.work_progress(jsonb), goal_private.work_milestone_fields(jsonb,boolean,boolean), goal_private.work_reconcile(uuid,uuid[]),
  goal_private.work_task(public.tasks), goal_private.work_milestone_row(public.milestones), goal_private.work_milestone(public.milestones),
  goal_private.work_reason(text), goal_private.work_result(goal_private.work_mutations) to goal_manual_executor;
revoke all on goal_private.work_mutations from public, anon, authenticated, service_role;
revoke all on function goal_private.work_revision(timestamptz), goal_private.work_text(jsonb,integer,boolean), goal_private.work_date(jsonb),
  goal_private.work_quantity(jsonb,boolean), goal_private.work_task_fields(jsonb,boolean), goal_private.work_schedule(jsonb),
  goal_private.work_progress(jsonb), goal_private.work_milestone_fields(jsonb,boolean,boolean), goal_private.work_reconcile(uuid,uuid[]),
  goal_private.work_task(public.tasks), goal_private.work_milestone_row(public.milestones), goal_private.work_milestone(public.milestones),
  goal_private.work_reason(text), goal_private.work_result(goal_private.work_mutations) from public, anon, authenticated, service_role;
revoke all on function public.goal_work_v1(text,jsonb) from public, anon, service_role;
alter function public.goal_work_v1(text,jsonb) owner to goal_manual_executor;
grant execute on function public.goal_work_v1(text,jsonb) to authenticated;
revoke create on schema public, goal_private from goal_manual_executor;
revoke goal_manual_executor from current_user;
commit;
