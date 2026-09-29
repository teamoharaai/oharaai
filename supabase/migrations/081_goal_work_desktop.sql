-- Goal work v1 for desktop (TD-005 phase a): what desktop's Milestone writes need, and one batch Task reconcile.
-- Design: design/ios-core/TD-005-desktop-work-cutover.md (iOS repo), agreed 2026-09-29 (D1, D5, B1-B9).
--
-- * goal_work_v1 gains, additively (existing requests, digests and responses are unchanged):
--     - milestone.delete {milestoneId}: hard delete (children cascade; goal_events follow, 080);
--     - milestone.reorder {parentId?, orderedIds}: the exact current siblings in their new order;
--     - photoPath on milestone.update: '{owner}/{milestoneId}/{name}.{ext}' in the private milestone-photos
--       bucket, and the object must exist in storage.objects (D5); null clears it;
--     - isAiSuggested on milestone.create;
--     - child Milestones accept description and dueDate (desktop's steps and evidence notes), not only a title;
--     - a completed Milestone still takes evidence (Justin 2026-09-29, IOSQ-007): its photo and its steps can change,
--       its own text/date/target stay sealed. 075 refused every write under a completed Milestone.
--   The Milestone DTO gains photoPath and isAiSuggested. Schedule interval/end date are NOT added: desktop keeps
--   its own Task routes (B1) and native doesn't author those schedules, so nothing would send them.
-- * public.reconcile_my_tasks_v1(p_goal_ids): one set-based reconcile of the caller's active scheduled Tasks,
--   replacing desktop's one reconcile_task_occurrences_v1 call per Task (IOSB-003). It materializes through
--   today + 28, exactly as that RPC's default does; goal_work_v1's own page reconcile stays through today.
--   One deliberate difference: a schedule that started more than 3660 days ago is clamped instead of raising.
-- * The executor may read storage.objects (existence check only).
-- Nothing here changes desktop until its code calls these (TD-005 phase b, behind a per-account flag).
-- Depends on 052/055/075/078/080.
begin;
-- Hosted migrations run as a non-superuser; ownership transfer needs temporary membership (see 072).
grant goal_manual_executor to current_user;
grant create on schema public, goal_private to goal_manual_executor;

-- Storage: read-only, for the photo existence check (B9; the hosted preflight probes this grant).
grant usage on schema storage to goal_manual_executor;
grant select on storage.objects to goal_manual_executor;

-- Ledger: admit the two new goal.work operation types. 078 declared the per-protocol checks inline, so the
-- goal.work one is found by its definition (exactly one must match).
do $$
declare found_name text; matches integer;
begin
  select count(*), min(conname) into matches, found_name from pg_constraint
  where conrelid = 'goal_private.operation_ledger'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) like '%goal.work%' and pg_get_constraintdef(oid) like '%milestone.complete%';
  if matches <> 1 then raise exception '081: expected one goal.work ledger check, found %', matches; end if;
  execute format('alter table goal_private.operation_ledger drop constraint %I', found_name);
end $$;
alter table goal_private.operation_ledger add constraint operation_ledger_goal_work check (protocol <> 'goal.work' or (
  (operation_type is null or operation_type in ('task.create', 'task.update', 'task.schedule', 'task.progress',
    'task.archive', 'milestone.create', 'milestone.update', 'milestone.complete', 'milestone.delete', 'milestone.reorder'))
  and goal_version is null and expected_version is null
  and (operation_type is null or goal_id is not null)
  and (state <> 'committed' or entity_id is not null)));

-- Milestone fields. Create requires a title; an edit supplies a non-empty subset. Children now take description
-- and dueDate as well (targetCount stays top-level). isAiSuggested is create-only; photoPath is edit-only (the
-- object path includes the Milestone ID, so it can't exist before the Milestone). Only the path's shape is
-- checked here; owner, Milestone and existence are checked against the row in goal_work_v1.
create or replace function goal_private.work_milestone_fields(input jsonb, partial boolean, child boolean) returns jsonb
language plpgsql immutable set search_path=pg_catalog,goal_private as $$
declare result jsonb := '{}'::jsonb; keys text[];
begin
  keys := array['title','description','dueDate'] || case when child then '{}'::text[] else array['targetCount'] end
    || case when partial then array['photoPath'] else array['isAiSuggested'] end;
  if jsonb_typeof(input) is distinct from 'object' or (partial and input = '{}'::jsonb)
    or (input - keys) <> '{}'::jsonb
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
  if input ? 'isAiSuggested' then
    if jsonb_typeof(input->'isAiSuggested') <> 'boolean' then raise exception 'INVALID_FIELD'; end if;
    result := result || jsonb_build_object('isAiSuggested', input->'isAiSuggested');
  end if;
  if input ? 'photoPath' then
    if jsonb_typeof(input->'photoPath') = 'null' then result := result || '{"photoPath":null}'::jsonb;
    elsif jsonb_typeof(input->'photoPath') = 'string'
      and input->>'photoPath' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9-]{1,64}\.[a-z0-9]{1,8}$' then
      result := result || jsonb_build_object('photoPath', input->>'photoPath');
    else raise exception 'INVALID_FIELD'; end if;
  end if;
  return result;
end $$;

-- The Milestone DTO row gains the photo path and the AI-suggested flag (additive keys).
create or replace function goal_private.work_milestone_row(m public.milestones) returns jsonb language sql stable set search_path=pg_catalog,public,goal_private as $$
  select jsonb_build_object('id', m.id, 'parentId', m.parent_id, 'title', m.title, 'description', m.description, 'kind', m.kind,
    'dueDate', to_char(m.due_date, 'YYYY-MM-DD'), 'completedAt', m.completed_at, 'targetCount', m.target_count,
    'photoPath', m.photo_url, 'isAiSuggested', m.is_ai_suggested, 'revision', work_revision(m.updated_at))
$$;

-- Set-based reconciliation with a forward horizon. 075's body, with the upper bound moved from today to
-- today + horizon_days; horizon 0 is 075's behaviour exactly, and the two-argument form now delegates to it.
create function goal_private.work_reconcile(owner uuid, task_ids uuid[], horizon_days integer) returns void language plpgsql
set search_path=pg_catalog,public as $$
begin
  if horizon_days is null or horizon_days < 0 or horizon_days > 180 then raise exception 'INVALID_FIELD'; end if;
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
  cross join lateral generate_series(greatest(s.start_date, coalesce(f.frontier + 1, s.start_date), w.today + horizon_days - 3660),
    least(coalesce(s.end_date, w.today + horizon_days), w.today + horizon_days), interval '1 day') gs(day_value)
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

create or replace function goal_private.work_reconcile(owner uuid, task_ids uuid[]) returns void language sql
set search_path=pg_catalog,goal_private as $$
  select work_reconcile(owner, task_ids, 0)
$$;

-- One call instead of one reconcile_task_occurrences_v1 per Task (desktop's Task lists and Momentum), for the
-- caller's Goals in p_goal_ids (all of them when null).
-- Same horizon as that RPC's default (today + 28 in each schedule's zone). Unknown or foreign Goals reconcile
-- nothing; like the per-Task RPC it needs a signed-in caller. The owner comes from request_owner() (072), as in
-- goal_work_v1: the executor has no access to the auth schema on hosted.
create function public.reconcile_my_tasks_v1(p_goal_ids uuid[] default null) returns void
language plpgsql security definer set search_path=pg_catalog,public,goal_private
set lock_timeout='5s' set statement_timeout='15s' as $$
declare owner uuid := goal_private.request_owner(); ids uuid[];
begin
  if owner is null then raise exception 'Unauthorized'; end if;
  select array_agg(t.id) into ids from public.tasks t
  join public.goals g on g.id = t.goal_id and g.user_id = owner and g.status = 'active'
  where t.user_id = owner and t.status = 'active' and (p_goal_ids is null or t.goal_id = any(p_goal_ids))
    and exists(select 1 from public.task_schedules s where s.task_id = t.id and s.user_id = owner and s.is_active);
  if ids is not null then perform goal_private.work_reconcile(owner, ids, 28); end if;
end $$;

-- goal_work_v1: 078's body, extended with milestone.delete, milestone.reorder, photoPath, isAiSuggested and child fields.
create or replace function public.goal_work_v1(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,goal_private,extensions
set lock_timeout='5s' set statement_timeout='15s' as $$
declare owner uuid := goal_private.request_owner(); gid uuid; g public.goals; allowed text[]; limit_n integer;
  cursor_data jsonb; rows jsonb; more boolean; next_cursor text; purpose text; expiry timestamptz; ids uuid[];
  oid uuid; op text; m goal_private.operation_ledger; stamp timestamptz; body jsonb; hash text; reason text; entity uuid; target uuid;
  t public.tasks; s public.task_schedules; o public.task_occurrences; ms public.milestones; parent public.milestones;
  fields jsonb; changes jsonb; sched jsonb; progress jsonb; mode text; qty numeric; unit text; due_time time;
  today date; current_kind text; key text; ordered uuid[]; siblings uuid[];
begin
  if owner is null then return goal_private.fail('UNAUTHORIZED'); end if;
  allowed := case action
    when 'tasks' then array['goalId','cursor','limit'] when 'milestones' then array['goalId','cursor','limit']
    when 'mutate' then array['operationId','operationType','contractVersion','goalId','taskId','milestoneId','parentId',
      'occurrenceId','expectedRevision','fields','changes','schedule','progress','orderedIds'] else null end;
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
      'milestone.create','milestone.update','milestone.complete','milestone.delete','milestone.reorder')
      or payload->'contractVersion' is distinct from '1'::jsonb then
    return goal_private.fail('UNSUPPORTED_CONTRACT');
  end if;
  allowed := case op
    when 'task.create' then array['fields','schedule'] when 'task.update' then array['taskId','expectedRevision','changes']
    when 'task.schedule' then array['taskId','expectedRevision','schedule'] when 'task.progress' then array['taskId','occurrenceId','progress']
    when 'task.archive' then array['taskId'] when 'milestone.create' then array['parentId','fields']
    when 'milestone.update' then array['milestoneId','expectedRevision','changes']
    when 'milestone.reorder' then array['parentId','orderedIds'] else array['milestoneId'] end;
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
    when 'milestone.reorder' then
      -- The complete sibling list in its new order: 1-100 distinct Milestone IDs, normalized to canonical text.
      if payload ? 'parentId' and jsonb_typeof(payload->'parentId') not in ('string','null')
        or jsonb_typeof(payload->'orderedIds') is distinct from 'array' or jsonb_array_length(payload->'orderedIds') not between 1 and 100
        or exists(select 1 from jsonb_array_elements(payload->'orderedIds') e where jsonb_typeof(e) <> 'string') then
        return goal_private.fail('INVALID_FIELD');
      end if;
      select array_agg(e::uuid order by n) into ordered from jsonb_array_elements_text(payload->'orderedIds') with ordinality x(e, n);
      if cardinality(ordered) <> (select count(distinct u) from unnest(ordered) u) then return goal_private.fail('INVALID_FIELD'); end if;
      body := body || jsonb_build_object('parentId', (payload->>'parentId')::uuid, 'orderedIds', to_jsonb(ordered));
    else
      body := body || jsonb_build_object('milestoneId', (payload->>'milestoneId')::uuid);
  end case;
  if exists(select 1 from jsonb_each(body) e where e.key in ('taskId','milestoneId','occurrenceId') and e.value = 'null'::jsonb) then
    return goal_private.fail('INVALID_FIELD');
  end if;
  hash := encode(extensions.digest(convert_to(jsonb_build_array(1, op, body)::text, 'UTF8'), 'sha256'), 'hex');

  -- Serializes every attempt for one identity; a repeat returns the recorded outcome.
  perform goal_private.lock_operation(owner, oid);
  select * into m from goal_private.operation_ledger where owner_id = owner and operation_id = oid;
  if found then
    -- Another protocol's identity, or a different payload, is never reused. A tombstone (no digest)
    -- fences a delayed request: it answers not_committed/closed_by_owner in this request's type.
    if m.protocol <> 'goal.work' or m.digest <> hash then return goal_private.fail('OPERATION_PAYLOAD_MISMATCH'); end if;
    return goal_private.work_result(m, op);
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
  elsif reason is null and op in ('milestone.update','milestone.complete','milestone.delete') then
    select * into ms from public.milestones where id = (body->>'milestoneId')::uuid and user_id = owner and goal_id = gid for update;
    if found and ms.parent_id is not null then
      select * into parent from public.milestones where id = ms.parent_id and user_id = owner and goal_id = gid;
    end if;
    -- Only the visible levels are writable: top-level Milestones and their direct children.
    if ms.id is null or (ms.parent_id is not null and (parent.id is null or parent.parent_id is not null)) then reason := 'MILESTONE_UNAVAILABLE';
    else
      entity := ms.id;
      -- A completed Milestone still takes evidence (Justin, 2026-09-29; IOSQ-007 seal rule): it can be deleted and
      -- its photo attached, replaced or cleared, but its own text, date and target are sealed and it can't be re-completed.
      if ms.completed_at is not null and op <> 'milestone.delete'
        and not (op = 'milestone.update' and (body->'changes') - 'photoPath' = '{}'::jsonb) then reason := 'MILESTONE_COMPLETE';
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
            -- Steps and evidence may be added under a completed Milestone (the evidence rule above).
            if not found or parent.parent_id is not null then reason := 'PARENT_INVALID';
            elsif (select count(*) from public.milestones where parent_id = target and user_id = owner) >= 20 then reason := 'LIMIT_REACHED';
            end if;
          elsif (select count(*) from public.milestones where goal_id = gid and user_id = owner and parent_id is null) >= 100 then reason := 'LIMIT_REACHED';
          end if;
          if reason is null then
            insert into public.milestones(goal_id, user_id, title, description, due_date, target_count, parent_id, kind, sort_order, is_ai_suggested)
            values (gid, owner, fields->>'title', fields->>'description', (fields->>'dueDate')::date, (fields->>'targetCount')::integer, target,
              'achievement', coalesce((select max(sort_order) + 1 from public.milestones where goal_id = gid and user_id = owner
                and parent_id is not distinct from target), 0), coalesce((fields->>'isAiSuggested')::boolean, false))
            returning id into entity;
          end if;
        when 'milestone.update' then
          changes := body->'changes';
          -- Steps (one visible child level) take a title, description, date and photo; the counter target is top-level only.
          if ms.parent_id is not null and changes - array['title','description','dueDate','photoPath'] <> '{}'::jsonb then reason := 'FIELD_CONFLICT';
          -- A photo belongs to this owner and this Milestone, and must already be uploaded (D5).
          elsif changes->>'photoPath' is not null and changes->>'photoPath' not like owner::text || '/' || ms.id::text || '/%' then reason := 'PHOTO_PATH_INVALID';
          elsif changes->>'photoPath' is not null and not exists(select 1 from storage.objects so
              where so.bucket_id = 'milestone-photos' and so.name = changes->>'photoPath') then reason := 'PHOTO_NOT_FOUND';
          elsif coalesce(changes->>'title', ms.title) = ms.title
            and (not changes ? 'description' or changes->>'description' is not distinct from ms.description)
            and (not changes ? 'dueDate' or changes->>'dueDate' is not distinct from to_char(ms.due_date, 'YYYY-MM-DD'))
            and (not changes ? 'targetCount' or (changes->>'targetCount')::integer is not distinct from ms.target_count)
            and (not changes ? 'photoPath' or changes->>'photoPath' is not distinct from ms.photo_url) then reason := 'NO_CHANGES';
          else
            update public.milestones set
              title = coalesce(changes->>'title', title),
              description = case when changes ? 'description' then changes->>'description' else description end,
              due_date = case when changes ? 'dueDate' then (changes->>'dueDate')::date else due_date end,
              target_count = case when changes ? 'targetCount' then (changes->>'targetCount')::integer else target_count end,
              photo_url = case when changes ? 'photoPath' then changes->>'photoPath' else photo_url end
            where id = ms.id;
          end if;
        when 'milestone.delete' then
          -- Hard delete: children cascade (052) and their goal_events go with them (080). The receipt projects
          -- the parent when a step was deleted; a deleted top-level Milestone projects nothing.
          delete from public.milestones where id = ms.id;
          entity := coalesce(ms.parent_id, ms.id);
        when 'milestone.reorder' then
          target := (body->>'parentId')::uuid;
          select array_agg(e::uuid order by n) into ordered from jsonb_array_elements_text(body->'orderedIds') with ordinality x(e, n);
          if target is not null then
            select * into parent from public.milestones where id = target and user_id = owner and goal_id = gid for update;
            if not found or parent.parent_id is not null then reason := 'PARENT_INVALID'; end if;
          end if;
          if reason is null then
            -- The request must name exactly the current siblings; anything else means the client's list is stale.
            select array_agg(x.id order by x.sort_order, x.created_at, x.id) into siblings from (
              select id, sort_order, created_at from public.milestones
              where goal_id = gid and user_id = owner and parent_id is not distinct from target
              order by sort_order, created_at, id for update) x;
            if siblings is null or cardinality(siblings) <> cardinality(ordered) or not (siblings @> ordered and ordered @> siblings) then
              reason := 'MILESTONE_ORDER_STALE';
            elsif siblings = ordered then reason := 'NO_CHANGES';
            else
              update public.milestones row_m set sort_order = x.n - 1
              from unnest(ordered) with ordinality x(id, n) where row_m.id = x.id and row_m.sort_order is distinct from (x.n - 1)::integer;
              -- Reordered steps project their parent; a top-level reorder projects the first Milestone.
              entity := coalesce(target, ordered[1]);
            end if;
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

  stamp := clock_timestamp();
  insert into goal_private.operation_ledger(owner_id, operation_id, seq, protocol, operation_type, goal_id, entity_id, digest, state, reason, recorded_at, terminal_at)
  values (owner, oid, goal_private.next_operation_seq(owner), 'goal.work', op, gid, case when reason is null or op not in ('task.create','milestone.create') then entity end, hash,
    case when reason is null then 'committed' else 'not_committed' end, reason, stamp, stamp)
  returning * into m;
  return goal_private.work_result(m);
exception
  when invalid_text_representation or datetime_field_overflow or invalid_datetime_format or numeric_value_out_of_range then
    return goal_private.fail('INVALID_FIELD');
  when raise_exception then
    if sqlerrm = 'INVALID_FIELD' then return goal_private.fail('INVALID_FIELD'); end if;
    raise;
end $$;

-- Grants ------------------------------------------------------------------------------------------
-- Delete, reorder and photo path are new executor writes; the 075 column grant covers the rest.
grant delete, update(sort_order, photo_url) on public.milestones to goal_manual_executor;
grant execute on function goal_private.work_reconcile(uuid,uuid[],integer) to goal_manual_executor;
revoke all on function goal_private.work_reconcile(uuid,uuid[],integer) from public, anon, authenticated, service_role;

revoke all on function public.reconcile_my_tasks_v1(uuid[]) from public, anon, service_role;
alter function public.reconcile_my_tasks_v1(uuid[]) owner to goal_manual_executor;
grant execute on function public.reconcile_my_tasks_v1(uuid[]) to authenticated;

revoke create on schema public, goal_private from goal_manual_executor;
revoke goal_manual_executor from current_user;
commit;
