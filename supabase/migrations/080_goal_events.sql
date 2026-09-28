-- Goal events (TD-004): one table of Goal Activity facts, written in the same transaction as every write
-- that changes them. Design: design/ios-core/TD-004-goal-events.md (iOS repo), agreed 2026-09-27.
--
-- * goal_private.goal_events: one row per (Goal, kind, entity). Kinds: task_completed (a Task occurrence),
--   entry_created (a Note or Reflection), milestone_completed. Counting rules (IOSB-004, decided):
--     - an Entry counts toward a Goal if it is linked directly (entry_goal_links) or through one of the Goal's
--       Milestones (reflection_milestone_links), ONCE per Goal: unique (goal_id, kind, entity_id);
--     - Notes and Reflections are one kind; entry_type is stored so they can be split later;
--     - archiving keeps history; a hard delete, an unlink and an un-complete remove the event;
--     - a Task or Milestone moved to another Goal takes its events with it;
--     - only canonical entries count (desktop's legacy echo_entry_links do not);
--     - as in 074, only rows owned by the Goal's owner count.
-- * AFTER row triggers on task_occurrences, tasks, milestones, entries, entry_goal_links,
--   reflection_milestone_links and goals keep it exact for EVERY write path: the canonical Task RPCs
--   (048-064, 076) and Project Task RPCs (073) that desktop calls, goal_work_v1, desktop's direct RLS writes to
--   Milestones and Entry links, and FK cascades. Those RPCs are not edited, but their transactions now also
--   write goal_events (desktop-shared behaviour change, listed in CHANGELOGCODEX).
-- * Each kind has ONE derivation function, used by the triggers and by the one-time backfill below.
-- * goal_card_v1 `activity` reads the events (same wire shape, 1-28 days); public.goal_activity_v1 serves the
--   same window up to 120 days for desktop's activity-window route (the route switch is held, TD-004 A7).
-- * Momentum is unchanged (TD-004 A5).
-- Depends on 036/048/072/074/078.
begin;
-- Hosted migrations run as a non-superuser; ownership transfer needs temporary membership (see 072).
grant goal_manual_executor to current_user;
grant create on schema public, goal_private to goal_manual_executor;

-- Events -----------------------------------------------------------------------------------------
create table goal_private.goal_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  kind text not null check (kind in ('task_completed', 'entry_created', 'milestone_completed')),
  entity_id uuid not null, -- the occurrence, Entry or Milestone; no FK: the triggers remove it on delete
  entry_type text check (entry_type in ('note', 'reflection')),
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default clock_timestamp(),
  unique (goal_id, kind, entity_id),
  check ((kind = 'entry_created') = (entry_type is not null))
);
create index goal_events_window_idx on goal_private.goal_events (owner_id, goal_id, occurred_at);
create index goal_events_entity_idx on goal_private.goal_events (entity_id, kind);

-- Derivation: one function per kind. Each takes entity ids, computes which events should exist for them and
-- makes the table match (delete what is no longer wanted, upsert what is). Idempotent.
create function goal_private.sync_task_events(occurrence_ids uuid[]) returns void
language sql set search_path=pg_catalog,public,goal_private as $$
  with wanted as (
    select g.user_id as owner_id, g.id as goal_id, o.id as entity_id, o.completed_at as occurred_at
    from public.task_occurrences o join public.tasks t on t.id = o.task_id join public.goals g on g.id = t.goal_id
    where o.id = any(occurrence_ids) and o.status = 'completed' and o.completed_at is not null and t.user_id = g.user_id),
  gone as (
    delete from goal_private.goal_events e where e.kind = 'task_completed' and e.entity_id = any(occurrence_ids)
      and not exists (select 1 from wanted w where w.goal_id = e.goal_id and w.entity_id = e.entity_id))
  insert into goal_private.goal_events (owner_id, goal_id, kind, entity_id, occurred_at)
  select owner_id, goal_id, 'task_completed', entity_id, occurred_at from wanted
  on conflict (goal_id, kind, entity_id) do update set owner_id = excluded.owner_id, occurred_at = excluded.occurred_at
    where (goal_events.owner_id, goal_events.occurred_at) is distinct from (excluded.owner_id, excluded.occurred_at);
$$;

create function goal_private.sync_milestone_events(milestone_ids uuid[]) returns void
language sql set search_path=pg_catalog,public,goal_private as $$
  with wanted as (
    select g.user_id as owner_id, g.id as goal_id, m.id as entity_id, m.completed_at as occurred_at
    from public.milestones m join public.goals g on g.id = m.goal_id
    where m.id = any(milestone_ids) and m.completed_at is not null and m.user_id = g.user_id),
  gone as (
    delete from goal_private.goal_events e where e.kind = 'milestone_completed' and e.entity_id = any(milestone_ids)
      and not exists (select 1 from wanted w where w.goal_id = e.goal_id and w.entity_id = e.entity_id))
  insert into goal_private.goal_events (owner_id, goal_id, kind, entity_id, occurred_at)
  select owner_id, goal_id, 'milestone_completed', entity_id, occurred_at from wanted
  on conflict (goal_id, kind, entity_id) do update set owner_id = excluded.owner_id, occurred_at = excluded.occurred_at
    where (goal_events.owner_id, goal_events.occurred_at) is distinct from (excluded.owner_id, excluded.occurred_at);
$$;

-- An Entry counts once per Goal it reaches directly or through one of that Goal's Milestones.
create function goal_private.sync_entry_events(entry_ids uuid[]) returns void
language sql set search_path=pg_catalog,public,goal_private as $$
  with wanted as (
    select distinct g.user_id as owner_id, g.id as goal_id, e.id as entity_id, e.entry_type, e.created_at as occurred_at
    from public.entries e
    join lateral (
      select l.goal_id from public.entry_goal_links l where l.entry_id = e.id
      union
      select m.goal_id from public.reflection_milestone_links r join public.milestones m on m.id = r.milestone_id where r.entry_id = e.id
    ) linked on true
    join public.goals g on g.id = linked.goal_id and g.user_id = e.user_id
    where e.id = any(entry_ids)),
  gone as (
    delete from goal_private.goal_events e where e.kind = 'entry_created' and e.entity_id = any(entry_ids)
      and not exists (select 1 from wanted w where w.goal_id = e.goal_id and w.entity_id = e.entity_id))
  insert into goal_private.goal_events (owner_id, goal_id, kind, entity_id, entry_type, occurred_at)
  select owner_id, goal_id, 'entry_created', entity_id, entry_type, occurred_at from wanted
  on conflict (goal_id, kind, entity_id) do update
    set owner_id = excluded.owner_id, entry_type = excluded.entry_type, occurred_at = excluded.occurred_at
    where (goal_events.owner_id, goal_events.entry_type, goal_events.occurred_at)
      is distinct from (excluded.owner_id, excluded.entry_type, excluded.occurred_at);
$$;

-- Every entity of one Goal (an owner change, and the backfill).
create function goal_private.sync_goal_events(gid uuid) returns void
language plpgsql set search_path=pg_catalog,public,goal_private as $$
begin
  perform goal_private.sync_task_events(array(
    select o.id from public.task_occurrences o join public.tasks t on t.id = o.task_id where t.goal_id = gid and o.status = 'completed'
    union select e.entity_id from goal_private.goal_events e where e.goal_id = gid and e.kind = 'task_completed'));
  perform goal_private.sync_milestone_events(array(
    select m.id from public.milestones m where m.goal_id = gid and m.completed_at is not null
    union select e.entity_id from goal_private.goal_events e where e.goal_id = gid and e.kind = 'milestone_completed'));
  perform goal_private.sync_entry_events(array(
    select l.entry_id from public.entry_goal_links l where l.goal_id = gid
    union select r.entry_id from public.reflection_milestone_links r join public.milestones m on m.id = r.milestone_id where m.goal_id = gid
    union select e.entity_id from goal_private.goal_events e where e.goal_id = gid and e.kind = 'entry_created'));
end $$;

-- Triggers ---------------------------------------------------------------------------------------
-- Security definer (owned by goal_manual_executor, which bypasses RLS) so a desktop write under RLS, or an
-- engine RPC, records its events whatever role it runs as. Each only calls the derivation for its rows.
create function goal_private.task_occurrence_events() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,goal_private as $$
begin
  perform goal_private.sync_task_events(array[coalesce(new.id, old.id)]);
  return null;
end $$;

create function goal_private.task_events() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,goal_private as $$
begin
  perform goal_private.sync_task_events(array(select o.id from public.task_occurrences o where o.task_id = new.id and o.status = 'completed'));
  return null;
end $$;

create function goal_private.milestone_events() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,goal_private as $$
begin
  perform goal_private.sync_milestone_events(array[coalesce(new.id, old.id)]);
  -- A Milestone moving Goal (or owner) moves the Entries reached through it. Deletes reach them through the
  -- reflection_milestone_links cascade instead.
  if tg_op = 'UPDATE' and (old.goal_id, old.user_id) is distinct from (new.goal_id, new.user_id) then
    perform goal_private.sync_entry_events(array(select r.entry_id from public.reflection_milestone_links r where r.milestone_id = new.id));
  end if;
  return null;
end $$;

create function goal_private.entry_events() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,goal_private as $$
begin
  perform goal_private.sync_entry_events(array[new.id]);
  return null;
end $$;

create function goal_private.entry_link_events() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,goal_private as $$
begin
  perform goal_private.sync_entry_events(array_remove(array[old.entry_id, new.entry_id], null));
  return null;
end $$;

create function goal_private.goal_owner_events() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,goal_private as $$
begin
  perform goal_private.sync_goal_events(new.id);
  return null;
end $$;

-- WHEN clauses keep the hot paths free: reconcile's bulk pending/missed occurrences never call a function.
create trigger goal_events_insert after insert on public.task_occurrences
  for each row when (new.status = 'completed') execute function goal_private.task_occurrence_events();
create trigger goal_events_update after update of status, completed_at, task_id on public.task_occurrences
  for each row when (old.status = 'completed' or new.status = 'completed') execute function goal_private.task_occurrence_events();
create trigger goal_events_delete after delete on public.task_occurrences
  for each row when (old.status = 'completed') execute function goal_private.task_occurrence_events();

create trigger goal_events_move after update of goal_id, user_id on public.tasks
  for each row when ((old.goal_id, old.user_id) is distinct from (new.goal_id, new.user_id)) execute function goal_private.task_events();

create trigger goal_events_insert after insert on public.milestones
  for each row when (new.completed_at is not null) execute function goal_private.milestone_events();
create trigger goal_events_update after update of completed_at, goal_id, user_id on public.milestones
  for each row when ((old.completed_at, old.goal_id, old.user_id) is distinct from (new.completed_at, new.goal_id, new.user_id))
  execute function goal_private.milestone_events();
create trigger goal_events_delete after delete on public.milestones
  for each row when (old.completed_at is not null) execute function goal_private.milestone_events();

create trigger goal_events_update after update of entry_type, created_at, user_id on public.entries
  for each row when ((old.entry_type, old.created_at, old.user_id) is distinct from (new.entry_type, new.created_at, new.user_id))
  execute function goal_private.entry_events();

create trigger goal_events_link after insert or update of entry_id, goal_id or delete on public.entry_goal_links
  for each row execute function goal_private.entry_link_events();
create trigger goal_events_link after insert or update of entry_id, milestone_id or delete on public.reflection_milestone_links
  for each row execute function goal_private.entry_link_events();

create trigger goal_events_owner after update of user_id on public.goals
  for each row when (old.user_id is distinct from new.user_id) execute function goal_private.goal_owner_events();

-- Reads ------------------------------------------------------------------------------------------
-- One activity window for both clients: 074's ownership check and date context (IOSD-022: UTC only when no
-- profile zone is configured), counts from goal_events. Returns 074's `activity` envelope.
create function goal_private.activity_window(owner uuid, gid uuid, days_n integer) returns jsonb
language plpgsql set search_path=pg_catalog,public,goal_private as $$
declare ctx jsonb; zone text; zone_source text; today date; since date; rows jsonb;
begin
  if not exists (select 1 from public.goals where id = gid and user_id = owner) then return goal_private.fail('GOAL_UNAVAILABLE'); end if;
  ctx := goal_private.context(owner);
  if ctx->>'state' = 'available' then zone := ctx->>'timezone'; zone_source := 'profile';
  elsif ctx->>'reason' = 'invalid_timezone' and exists (select 1 from public.profiles where id = owner and coalesce(timezone, '') = '') then
    zone := 'UTC'; zone_source := 'utc_unconfigured';
  else return goal_private.fail('DATE_CONTEXT_UNAVAILABLE'); end if;
  today := (clock_timestamp() at time zone zone)::date; since := today - (days_n - 1);
  with day_list as (select generate_series(since, today, interval '1 day')::date as day),
  counted as (
    select (e.occurred_at at time zone zone)::date as day,
           count(*) filter (where e.kind = 'task_completed') as tasks,
           count(*) filter (where e.kind = 'entry_created') as entries,
           count(*) filter (where e.kind = 'milestone_completed') as milestones
    from goal_private.goal_events e
    where e.owner_id = owner and e.goal_id = gid and e.occurred_at >= (since::timestamp at time zone zone)
    group by 1)
  select jsonb_agg(jsonb_build_object('date', to_char(d.day, 'YYYY-MM-DD'), 'taskCompletions', coalesce(c.tasks, 0),
    'entriesCreated', coalesce(c.entries, 0), 'milestonesCompleted', coalesce(c.milestones, 0)) order by d.day) into rows
  from day_list d left join counted c on c.day = d.day;
  return jsonb_build_object('ok', true, 'data', jsonb_build_object('ownerId', owner, 'contractVersion', 1, 'goalId', gid,
    'timezone', zone, 'timezoneSource', zone_source, 'asOfLocalDate', to_char(today, 'YYYY-MM-DD'), 'days', rows));
end $$;

-- Desktop's long window (heatmap): the same envelope for 1-120 days.
create function public.goal_activity_v1(p_goal_id uuid, p_days integer default 7) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,goal_private
set statement_timeout='15s' as $$
declare owner uuid := goal_private.request_owner();
begin
  if owner is null then return goal_private.fail('UNAUTHORIZED'); end if;
  if p_goal_id is null or p_days is null or p_days < 1 or p_days > 120 then return goal_private.fail('INVALID_FIELD'); end if;
  return goal_private.activity_window(owner, p_goal_id, p_days);
end $$;

-- 078's goal_card_v1, unchanged except that `activity` delegates to goal_private.activity_window.
create or replace function public.goal_card_v1(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,goal_private,extensions
set lock_timeout='5s' set statement_timeout='15s' as $$
declare owner uuid:=goal_private.request_owner(); gid uuid; g public.goals; allowed text[]; limit_n integer; cursor_data jsonb; rows jsonb;
  more boolean; next_cursor text; purpose text; expiry timestamptz; ctx jsonb; zone text; zone_source text; today date;
  days_n integer; since date; oid uuid; m goal_private.operation_ledger; stamp timestamptz; op_type text; changes jsonb; proof jsonb; hash text;
  reason text; expected bigint; new_version bigint; kind_filter text;
begin
  if owner is null then return goal_private.fail('UNAUTHORIZED'); end if;
  allowed := case action
    when 'entries' then array['goalId','entryType','cursor','limit'] when 'activity' then array['goalId','days']
    when 'mutate' then array['operationId','operationType','contractVersion','goalId','expectedVersion','changes','reviewToken']
    when 'mutation_lookup' then array['operationId'] when 'mutation_close' then array['operationId']
    when 'mutation_discover' then array['limit'] when 'mutation_ack' then array['operationId'] else null end;
  if allowed is null or jsonb_typeof(payload) is distinct from 'object' or payload - allowed <> '{}'::jsonb then return goal_private.fail('INVALID_FIELD'); end if;

  if action in ('entries','activity') then
    gid := (payload->>'goalId')::uuid;
    -- Ownership is established first; a missing or foreign Goal is never an empty collection.
    select * into g from public.goals where id=gid and user_id=owner;
    if not found then return goal_private.fail('GOAL_UNAVAILABLE'); end if;
    if action='activity' then
      days_n := coalesce((payload->>'days')::integer, 7);
      if days_n < 1 or days_n > 28 then return goal_private.fail('INVALID_FIELD'); end if;
      -- 080 (TD-004): counts come from goal_private.goal_events; the wire shape is unchanged.
      return goal_private.activity_window(owner, gid, days_n);
    end if;

    limit_n := coalesce((payload->>'limit')::integer, 20);
    if limit_n < 1 or limit_n > 50 then return goal_private.fail('INVALID_FIELD'); end if;
    kind_filter := payload->>'entryType';
    if action='entries' and kind_filter is distinct from 'reflection' and kind_filter is distinct from 'note' then return goal_private.fail('INVALID_FIELD'); end if;
    purpose := 'card:' || action || coalesce(':' || kind_filter, '');
    expiry := clock_timestamp() + interval '15 minutes';
    if payload->>'cursor' is not null then
      cursor_data := goal_private.verify(payload->>'cursor', owner, purpose);
      if cursor_data is null or cursor_data->>'goal' <> gid::text then return goal_private.fail('CURSOR_EXPIRED'); end if;
      expiry := (cursor_data->>'expires')::timestamptz;
    end if;
    -- action = 'entries'
    with page as (select e.* from public.entry_goal_links l join public.entries e on e.id=l.entry_id
          where l.goal_id=gid and e.user_id=owner and e.entry_type=kind_filter and not e.archived
          and (cursor_data is null or (e.created_at,e.id) < ((cursor_data->>'time')::timestamptz,(cursor_data->>'id')::uuid))
          order by e.created_at desc,e.id desc limit limit_n+1)
      select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'entryType',p.entry_type,'title',p.title,
          'excerpt',left(p.plain_text,280),'createdAt',p.created_at,'updatedAt',p.updated_at,
          '_k',jsonb_build_object('time',p.created_at)) order by p.created_at desc,p.id desc),'[]') into rows from page p;
    more := jsonb_array_length(rows) > limit_n;
    if more then
      rows := rows - limit_n;
      next_cursor := goal_private.sign(jsonb_build_object('owner',owner,'purpose',purpose,'goal',gid,'expires',expiry,
        'id',rows->-1->>'id') || (rows->-1->'_k'));
    end if;
    select coalesce(jsonb_agg(value - '_k'),'[]') into rows from jsonb_array_elements(rows);
    return jsonb_build_object('ok',true,'data',jsonb_build_object('ownerId',owner,'contractVersion',1,'goalId',gid,
      'items',rows,'hasMore',more,'nextCursor',next_cursor));
  end if;

  if action='mutation_discover' then
    limit_n := coalesce((payload->>'limit')::integer, 20);
    if limit_n < 1 or limit_n > 50 then return goal_private.fail('INVALID_FIELD'); end if;
    with page as (select * from goal_private.operation_ledger where owner_id=owner and protocol='goal.mutate' and acknowledged_at is null
      order by recorded_at, operation_id limit limit_n+1)
    select coalesce(jsonb_agg(goal_private.mutation_receipt(page::goal_private.operation_ledger) order by recorded_at, operation_id),'[]') into rows from page;
    more := jsonb_array_length(rows) > limit_n;
    if more then rows := rows - limit_n; end if;
    return jsonb_build_object('ok',true,'data',jsonb_build_object('ownerId',owner,'items',rows,'hasMore',more));
  end if;

  oid := (payload->>'operationId')::uuid;
  if oid is null then return goal_private.fail('INVALID_FIELD'); end if;
  -- Serializes every action for one operation identity, including a close racing a delayed mutate.
  perform goal_private.lock_operation(owner, oid);
  select * into m from goal_private.operation_ledger where owner_id=owner and operation_id=oid for update;
  -- One identity space for every Goal protocol: another protocol's operation is never reused.
  if found and m.protocol <> 'goal.mutate' then
    return goal_private.fail(case when action in ('mutate','mutation_close') then 'OPERATION_PAYLOAD_MISMATCH' else 'HISTORY_UNAVAILABLE' end);
  end if;

  if action='mutation_lookup' then
    if not found then return goal_private.fail('HISTORY_UNAVAILABLE'); end if;
    return jsonb_build_object('ok',true,'data',goal_private.mutation_receipt(m));
  elsif action='mutation_close' then
    if not found then
      stamp := clock_timestamp();
      insert into goal_private.operation_ledger(owner_id,operation_id,seq,protocol,state,reason,recorded_at,terminal_at)
        values(owner,oid,goal_private.next_operation_seq(owner),'goal.mutate','not_committed','closed_by_owner',stamp,stamp) returning * into m;
    end if;
    return jsonb_build_object('ok',true,'data',goal_private.mutation_receipt(m));
  elsif action='mutation_ack' then
    if not found then return goal_private.fail('HISTORY_UNAVAILABLE'); end if;
    update goal_private.operation_ledger set acknowledged_at=coalesce(acknowledged_at,clock_timestamp())
      where owner_id=owner and operation_id=oid returning * into m;
    return jsonb_build_object('ok',true,'data',goal_private.mutation_receipt(m));
  end if;

  -- action = 'mutate'
  op_type := payload->>'operationType';
  if op_type not in ('goal.update.manual','goal.complete','goal.archive') or payload->'contractVersion' is distinct from '1'::jsonb then
    return goal_private.fail('UNSUPPORTED_CONTRACT'); end if;
  gid := (payload->>'goalId')::uuid; expected := (payload->>'expectedVersion')::bigint;
  if gid is null or expected is null or expected < 1 then return goal_private.fail('INVALID_FIELD'); end if;
  if op_type='goal.update.manual' then
    changes := goal_private.changes(payload->'changes');
    if (jsonb_typeof(changes->'endDate')='string') <> (payload->>'reviewToken' is not null) then return goal_private.fail('INVALID_FIELD'); end if;
    if payload->>'reviewToken' is not null then
      proof := goal_private.verify(payload->>'reviewToken', owner, 'review', true);
      if proof is null then return goal_private.fail('DATE_CONTEXT_CHANGED'); end if;
    end if;
  elsif payload ? 'changes' or payload ? 'reviewToken' then return goal_private.fail('INVALID_FIELD');
  end if;
  hash := encode(extensions.digest(convert_to(jsonb_build_array(1, op_type, gid, expected::text, changes,
    proof->>'revision', proof->>'resolver')::text, 'UTF8'), 'sha256'), 'hex');
  if m.operation_id is not null then
    -- Same identity: return the recorded outcome. A different payload never reuses it; a tombstone fences.
    if m.digest is not null and m.digest <> hash then return goal_private.fail('OPERATION_PAYLOAD_MISMATCH'); end if;
    return jsonb_build_object('ok',true,'data',goal_private.mutation_receipt(m));
  end if;

  select * into g from public.goals where id=gid and user_id=owner for update;
  if not found then reason := 'GOAL_UNAVAILABLE';
  elsif g.goal_version <> expected then reason := 'VERSION_CONFLICT';
  elsif op_type in ('goal.update.manual','goal.complete') and g.status <> 'active' then reason := 'STATUS_CONFLICT';
  elsif op_type='goal.archive' and g.status not in ('active','stagnant','complete','expired') then reason := 'STATUS_CONFLICT';
  elsif op_type='goal.update.manual' then
    if changes ? 'endDate' and g.date_contract_version is null then reason := 'DATE_ADOPTION_UNAVAILABLE';
    elsif (not changes ? 'title' or changes->>'title' = g.title)
      and (not changes ? 'category' or changes->>'category' = g.category)
      and (not changes ? 'description' or changes->>'description' is not distinct from g.description)
      and (not changes ? 'endDate' or (changes->>'endDate' is not distinct from to_char(g.end_date,'YYYY-MM-DD')
        and (changes->>'endDate' is not null or g.end_date_state='no_date'))) then reason := 'NO_CHANGES';
    elsif jsonb_typeof(changes->'endDate')='string' then
      perform 1 from public.profiles where id=owner for share;
      ctx := goal_private.context(owner);
      if (proof->>'expires')::timestamptz <= clock_timestamp() then reason := 'DATE_CONTEXT_CHANGED';
      elsif ctx->>'state' <> 'available' then reason := 'DATE_CONTEXT_UNAVAILABLE';
      elsif ctx->>'profileTimezoneRevision' <> proof->>'revision' or ctx->>'resolverVersion' <> proof->>'resolver' then reason := 'DATE_CONTEXT_CHANGED';
      elsif changes->>'endDate' < ctx->>'localDate' then reason := 'DATE_IN_PAST';
      end if;
    end if;
  end if;

  if reason is null then
    if op_type='goal.update.manual' then
      update public.goals set
        title = case when changes ? 'title' then changes->>'title' else title end,
        category = case when changes ? 'category' then changes->>'category' else category end,
        description = case when changes ? 'description' then changes->>'description' else description end,
        end_date = case when changes ? 'endDate' then (changes->>'endDate')::date else end_date end,
        end_date_state = case when changes ? 'endDate' then case when changes->>'endDate' is null then 'no_date' else 'known' end else end_date_state end,
        updated_at = clock_timestamp()
      where id=gid and user_id=owner returning goal_version into new_version;
    else
      update public.goals set status = case op_type when 'goal.complete' then 'complete' else 'archived' end, updated_at = clock_timestamp()
        where id=gid and user_id=owner returning goal_version into new_version;
    end if;
  end if;
  stamp := clock_timestamp();
  insert into goal_private.operation_ledger(owner_id,operation_id,seq,protocol,operation_type,goal_id,expected_version,digest,state,reason,goal_version,recorded_at,terminal_at)
    values(owner,oid,goal_private.next_operation_seq(owner),'goal.mutate',op_type,gid,expected,hash,case when reason is null then 'committed' else 'not_committed' end,reason,new_version,stamp,stamp)
    returning * into m;
  return jsonb_build_object('ok',true,'data',goal_private.mutation_receipt(m));
exception
  when invalid_text_representation or datetime_field_overflow or invalid_datetime_format or numeric_value_out_of_range then return goal_private.fail('INVALID_FIELD');
  when raise_exception then
    if sqlerrm in ('INVALID_FIELD','INVALID_DATE') then return goal_private.fail(sqlerrm); end if;
    raise;
end $$;

-- Backfill ---------------------------------------------------------------------------------------
-- Once, from existing rows, through the same derivation the triggers use (archived Entries included).
do $$ declare gid uuid;
begin
  for gid in select id from public.goals order by id loop perform goal_private.sync_goal_events(gid); end loop;
end $$;

-- Grants -----------------------------------------------------------------------------------------
grant select, insert, update, delete on goal_private.goal_events to goal_manual_executor;
grant select on public.reflection_milestone_links, public.entry_goal_links, public.entries to goal_manual_executor;
revoke all on goal_private.goal_events from public, anon, authenticated, service_role;
alter function goal_private.sync_task_events(uuid[]) owner to goal_manual_executor;
alter function goal_private.sync_milestone_events(uuid[]) owner to goal_manual_executor;
alter function goal_private.sync_entry_events(uuid[]) owner to goal_manual_executor;
alter function goal_private.sync_goal_events(uuid) owner to goal_manual_executor;
alter function goal_private.task_occurrence_events() owner to goal_manual_executor;
alter function goal_private.task_events() owner to goal_manual_executor;
alter function goal_private.milestone_events() owner to goal_manual_executor;
alter function goal_private.entry_events() owner to goal_manual_executor;
alter function goal_private.entry_link_events() owner to goal_manual_executor;
alter function goal_private.goal_owner_events() owner to goal_manual_executor;
alter function goal_private.activity_window(uuid, uuid, integer) owner to goal_manual_executor;
revoke all on function goal_private.sync_task_events(uuid[]), goal_private.sync_milestone_events(uuid[]),
  goal_private.sync_entry_events(uuid[]), goal_private.sync_goal_events(uuid), goal_private.task_occurrence_events(),
  goal_private.task_events(), goal_private.milestone_events(), goal_private.entry_events(), goal_private.entry_link_events(),
  goal_private.goal_owner_events(), goal_private.activity_window(uuid, uuid, integer)
  from public, anon, authenticated, service_role;

revoke all on function public.goal_activity_v1(uuid, integer) from public, anon, service_role;
alter function public.goal_activity_v1(uuid, integer) owner to goal_manual_executor;
grant execute on function public.goal_activity_v1(uuid, integer) to authenticated;

revoke create on schema public, goal_private from goal_manual_executor;
revoke goal_manual_executor from current_user;
commit;
