-- Goal Card v1: owner-checked bounded Entry/Activity reads and receipt-backed existing-Goal mutations.
-- Task and Milestone reads/writes live in Migration 074 (goal_work_v1), the single contract for them.
-- Source preparation only, like 072: no legacy date conversion, no child writes, no raw-grant changes.
-- Depends on 072 (goal_private schema, executor role, sign/verify/context/fields helpers).
begin;
-- Hosted migrations run as a non-superuser; ownership transfer needs temporary membership (see 072).
grant goal_manual_executor to current_user;
grant create on schema public, goal_private to goal_manual_executor;

-- One atomic transaction per existing-Goal mutation. A row exists only as a terminal outcome
-- (committed or not_committed), so lookup is authoritative once found. `mutation_close` writes a
-- permanent not_committed tombstone that fences a delayed request carrying the same ID.
create table goal_private.goal_mutations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  operation_type text check (operation_type in ('goal.update.manual','goal.complete','goal.archive')),
  goal_id uuid, -- Historical link deliberately has no cascading Goal FK.
  expected_version bigint,
  digest text check (digest ~ '^[0-9a-f]{64}$'),
  state text not null check (state in ('committed','not_committed')),
  reason text,
  goal_version bigint,
  recorded_at timestamptz not null,
  acknowledged_at timestamptz,
  primary key (owner_id, operation_id),
  check ((state = 'committed' and reason is null and goal_version is not null and operation_type is not null and digest is not null)
    or (state = 'not_committed' and reason is not null)),
  check ((operation_type is null) = (digest is null))
);
create index goal_mutation_inbox on goal_private.goal_mutations(owner_id, recorded_at, operation_id) where acknowledged_at is null;
create index task_occurrences_completed_page on public.task_occurrences(task_id, completed_at) where status = 'completed';

create function goal_private.mutation_receipt(m goal_private.goal_mutations) returns jsonb language sql stable set search_path=pg_catalog,public as $$
  select jsonb_build_object('ownerId',m.owner_id,'operationId',m.operation_id,'operationType',m.operation_type,'contractVersion',1,
    'state',m.state,'reason',m.reason,
    'goalId',case when exists(select 1 from public.goals where id=m.goal_id and user_id=m.owner_id) then m.goal_id end,
    'goalVersion',m.goal_version::text,'recordedAt',m.recorded_at)
$$;

-- Normalizes an edit's supplied subset with the exact create-field rules. Absent keys are untouched;
-- description null clears; endDate null means No end date. Untouched members never appear in output.
create function goal_private.changes(input jsonb) returns jsonb language plpgsql immutable set search_path=pg_catalog,goal_private as $$
declare normalized jsonb; result jsonb := '{}'::jsonb; key text;
begin
  if jsonb_typeof(input) is distinct from 'object' or input = '{}'::jsonb
    or (input - array['title','category','description','endDate']) <> '{}'::jsonb then raise exception 'INVALID_FIELD'; end if;
  normalized := goal_private.fields(jsonb_build_object('title',coalesce(input->'title','"x"'::jsonb),
    'category',coalesce(input->'category','"Health & Fitness"'::jsonb)) || (input - 'title' - 'category'));
  foreach key in array array['title','category','description','endDate'] loop
    if input ? key then result := result || jsonb_build_object(key, normalized->key); end if;
  end loop;
  return result;
end $$;

create function public.goal_card_v1(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,goal_private,extensions
set lock_timeout='5s' set statement_timeout='15s' as $$
declare owner uuid:=goal_private.request_owner(); gid uuid; g public.goals; allowed text[]; limit_n integer; cursor_data jsonb; rows jsonb;
  more boolean; next_cursor text; purpose text; expiry timestamptz; ctx jsonb; zone text; zone_source text; today date;
  days_n integer; since date; oid uuid; m goal_private.goal_mutations; op_type text; changes jsonb; proof jsonb; hash text;
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
      ctx := goal_private.context(owner);
      if ctx->>'state'='available' then zone := ctx->>'timezone'; zone_source := 'profile';
      elsif ctx->>'reason'='invalid_timezone' and exists(select 1 from public.profiles where id=owner and coalesce(timezone,'')='') then
        zone := 'UTC'; zone_source := 'utc_unconfigured'; -- IOSD-022: UTC only when no profile zone is configured.
      else return goal_private.fail('DATE_CONTEXT_UNAVAILABLE'); end if;
      today := (clock_timestamp() at time zone zone)::date; since := today - (days_n - 1);
      with day_list as (select generate_series(since, today, interval '1 day')::date as day),
      tasks_done as (
        select (o.completed_at at time zone zone)::date as day, count(*) as n from public.task_occurrences o
        join public.tasks t on t.id=o.task_id where t.goal_id=gid and t.user_id=owner and o.status='completed'
          and o.completed_at >= (since::timestamp at time zone zone) group by 1),
      entries_made as (
        select (e.created_at at time zone zone)::date as day, count(*) as n from public.entry_goal_links l
        join public.entries e on e.id=l.entry_id where l.goal_id=gid and e.user_id=owner and not e.archived
          and e.created_at >= (since::timestamp at time zone zone) group by 1),
      milestones_done as (
        select (m2.completed_at at time zone zone)::date as day, count(*) as n from public.milestones m2
        where m2.goal_id=gid and m2.user_id=owner and m2.completed_at >= (since::timestamp at time zone zone) group by 1)
      select jsonb_agg(jsonb_build_object('date',to_char(d.day,'YYYY-MM-DD'),'taskCompletions',coalesce(a.n,0),
        'entriesCreated',coalesce(b.n,0),'milestonesCompleted',coalesce(c.n,0)) order by d.day) into rows
      from day_list d left join tasks_done a on a.day=d.day left join entries_made b on b.day=d.day left join milestones_done c on c.day=d.day;
      return jsonb_build_object('ok',true,'data',jsonb_build_object('ownerId',owner,'contractVersion',1,'goalId',gid,
        'timezone',zone,'timezoneSource',zone_source,'asOfLocalDate',to_char(today,'YYYY-MM-DD'),'days',rows));
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
    with page as (select * from goal_private.goal_mutations where owner_id=owner and acknowledged_at is null
      order by recorded_at, operation_id limit limit_n+1)
    select coalesce(jsonb_agg(goal_private.mutation_receipt(page::goal_private.goal_mutations) order by recorded_at, operation_id),'[]') into rows from page;
    more := jsonb_array_length(rows) > limit_n;
    if more then rows := rows - limit_n; end if;
    return jsonb_build_object('ok',true,'data',jsonb_build_object('ownerId',owner,'items',rows,'hasMore',more));
  end if;

  oid := (payload->>'operationId')::uuid;
  if oid is null then return goal_private.fail('INVALID_FIELD'); end if;
  -- Serializes every action for one operation identity, including a close racing a delayed mutate.
  perform pg_advisory_xact_lock(hashtextextended('goal_card_v1:' || owner::text || ':' || oid::text, 0));
  select * into m from goal_private.goal_mutations where owner_id=owner and operation_id=oid for update;

  if action='mutation_lookup' then
    if not found then return goal_private.fail('HISTORY_UNAVAILABLE'); end if;
    return jsonb_build_object('ok',true,'data',goal_private.mutation_receipt(m));
  elsif action='mutation_close' then
    if not found then
      insert into goal_private.goal_mutations(owner_id,operation_id,state,reason,recorded_at)
        values(owner,oid,'not_committed','closed_by_owner',clock_timestamp()) returning * into m;
    end if;
    return jsonb_build_object('ok',true,'data',goal_private.mutation_receipt(m));
  elsif action='mutation_ack' then
    if not found then return goal_private.fail('HISTORY_UNAVAILABLE'); end if;
    update goal_private.goal_mutations set acknowledged_at=coalesce(acknowledged_at,clock_timestamp())
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
  insert into goal_private.goal_mutations(owner_id,operation_id,operation_type,goal_id,expected_version,digest,state,reason,goal_version,recorded_at)
    values(owner,oid,op_type,gid,expected,hash,case when reason is null then 'committed' else 'not_committed' end,reason,new_version,clock_timestamp())
    returning * into m;
  return jsonb_build_object('ok',true,'data',goal_private.mutation_receipt(m));
exception
  when invalid_text_representation or datetime_field_overflow or invalid_datetime_format or numeric_value_out_of_range then return goal_private.fail('INVALID_FIELD');
  when raise_exception then
    if sqlerrm in ('INVALID_FIELD','INVALID_DATE') then return goal_private.fail(sqlerrm); end if;
    raise;
end $$;

grant select, insert, update on goal_private.goal_mutations to goal_manual_executor;
grant select on public.tasks, public.task_occurrences, public.milestones, public.entries, public.entry_goal_links to goal_manual_executor;
grant update(title, category, description, status, end_date, end_date_state, updated_at) on public.goals to goal_manual_executor;
grant execute on function goal_private.mutation_receipt(goal_private.goal_mutations), goal_private.changes(jsonb) to goal_manual_executor;
revoke all on goal_private.goal_mutations from public, anon, authenticated;
revoke all on function goal_private.mutation_receipt(goal_private.goal_mutations), goal_private.changes(jsonb) from public, anon, authenticated;
revoke all on function public.goal_card_v1(text,jsonb) from public, anon;
alter function public.goal_card_v1(text,jsonb) owner to goal_manual_executor;
grant execute on function public.goal_card_v1(text,jsonb) to authenticated;
revoke create on schema public, goal_private from goal_manual_executor;
revoke goal_manual_executor from current_user;
commit;
