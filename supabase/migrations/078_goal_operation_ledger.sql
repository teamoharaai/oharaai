-- Goal operation ledger (TD-002): one receipt store, one operation surface and retention for every
-- Goal-domain write. Design: design/ios-core/TD-002-operation-ledger.md (iOS repo).
--
-- * goal_private.operation_ledger replaces the three per-protocol receipt tables:
--     goal.create -> 072 goal_private.operations   (manual Goal creation, two-phase)
--     goal.mutate -> 074 goal_private.goal_mutations (Goal edit/complete/archive)
--     goal.work   -> 075 goal_private.work_mutations (Task and Milestone writes)
--   Existing rows are COPIED (the old tables are left untouched and frozen; a later migration drops them),
--   and goal_manual_v1 / goal_card_v1 / goal_work_v1 switch to the ledger with unchanged wire contracts.
-- * public.goal_operations_v1: lookup | close | discover | ack for every protocol. close writes a
--   permanent tombstone that fences a delayed request carrying the same operation ID.
-- * goal_private.prune_operations(), daily through pg_cron: 30 days after acknowledgment; unacknowledged
--   rows bounded to 500 per owner and 180 days; never a create operation that is a Goal's provenance.
--   Also prunes the canonical Task engine's receipts (048 task_mutation_receipts, shared with desktop)
--   after 30 days; desktop retries within seconds, so its idempotency is unaffected.
-- * Revokes service_role EXECUTE on goal_card_v1 (074 missed it; goal_work_v1/goal_manual_v1 never had it).
-- Depends on 072/074/075. Desktop RPCs and tables are unchanged apart from the 048 retention.
begin;
-- Hosted migrations run as a non-superuser; ownership transfer needs temporary membership (see 072).
grant goal_manual_executor to current_user;
grant create on schema public, goal_private to goal_manual_executor;

-- Hosted: supautils creates it for postgres (as for pgvector). Chain: the platform stand-in already has.
create extension if not exists pg_cron;

-- Ledger ------------------------------------------------------------------------------------------
create table goal_private.operation_ledger (
  owner_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  -- Per-owner, from goal_private.counters, assigned under the counter row lock: rows become visible
  -- in seq order, which makes barrier-based discovery complete (072).
  seq bigint not null check (seq > 0),
  protocol text not null check (protocol in ('goal.create', 'goal.mutate', 'goal.work')),
  -- Null only for a tombstone: close on an identity the server never saw.
  operation_type text,
  goal_id uuid,   -- Historical links deliberately have no cascading FK.
  entity_id uuid,
  digest text check (digest ~ '^[0-9a-f]{64}$'),
  state text not null check (state in ('registered', 'committed', 'not_committed')),
  reason text,
  revision bigint not null default 1 check (revision > 0),
  recorded_at timestamptz not null,
  terminal_at timestamptz,
  acknowledged_at timestamptz,
  -- Protocol facts: goal.create (072) and goal.mutate (074).
  goal_version bigint,
  expected_version bigint,
  admission_deadline timestamptz,
  reviewed_revision bigint check (reviewed_revision > 0),
  reviewed_resolver text,
  primary key (owner_id, operation_id),
  unique (owner_id, seq),
  -- Lifecycle, shared by every protocol.
  check ((state = 'registered') = (terminal_at is null)),
  check ((state = 'not_committed') = (reason is not null)),
  check (state <> 'registered' or acknowledged_at is null),
  check ((operation_type is null) = (digest is null)),
  check (operation_type is not null or state = 'not_committed'),
  check ((reviewed_revision is null) = (reviewed_resolver is null)),
  -- Per protocol: the invariants each old table enforced.
  check (protocol = 'goal.create' or (state <> 'registered' and admission_deadline is null and reviewed_revision is null)),
  check (protocol <> 'goal.create' or (
    operation_type is not distinct from case when digest is not null then 'goal.create.manual' end
    and entity_id is null and expected_version is null
    and (digest is null) = (admission_deadline is null)
    and (admission_deadline is null or admission_deadline = recorded_at + interval '24 hours')
    and (state = 'committed') = (goal_id is not null)
    and (state <> 'committed' or goal_version is not null))),
  check (protocol <> 'goal.mutate' or (
    (operation_type is null or operation_type in ('goal.update.manual', 'goal.complete', 'goal.archive'))
    and entity_id is null
    and (operation_type is null or goal_id is not null)
    and (state <> 'committed' or goal_version is not null))),
  check (protocol <> 'goal.work' or (
    (operation_type is null or operation_type in ('task.create', 'task.update', 'task.schedule', 'task.progress',
      'task.archive', 'milestone.create', 'milestone.update', 'milestone.complete'))
    and goal_version is null and expected_version is null
    and (operation_type is null or goal_id is not null)
    and (state <> 'committed' or entity_id is not null)))
);
-- Discovery inbox (every protocol), 074's time-ordered inbox, 072 expiry, and retention scans.
create index operation_ledger_inbox on goal_private.operation_ledger(owner_id, seq) where acknowledged_at is null;
create index operation_ledger_mutation_inbox on goal_private.operation_ledger(owner_id, recorded_at, operation_id)
  where acknowledged_at is null and protocol = 'goal.mutate';
create index operation_ledger_registered on goal_private.operation_ledger(admission_deadline) where state = 'registered';
create index operation_ledger_acknowledged on goal_private.operation_ledger(acknowledged_at) where acknowledged_at is not null;
create index operation_ledger_unacknowledged on goal_private.operation_ledger(terminal_at)
  where acknowledged_at is null and state <> 'registered';

-- Copy existing receipts (the old tables are not modified) -----------------------------------------
insert into goal_private.operation_ledger(owner_id, operation_id, seq, protocol, operation_type, goal_id, digest, state,
  reason, revision, recorded_at, terminal_at, acknowledged_at, goal_version, admission_deadline, reviewed_revision, reviewed_resolver)
select owner_id, operation_id, seq, 'goal.create', case when digest is not null then 'goal.create.manual' end, goal_id, digest, state,
  reason, revision, first_recorded_at, terminal_at, acknowledged_at, goal_version, admission_deadline, reviewed_revision, reviewed_resolver
from goal_private.operations;

-- 074/075 rows had no sequence: number them after each owner's current counter, in recorded order.
insert into goal_private.counters(owner_id)
select owner_id from goal_private.goal_mutations union select owner_id from goal_private.work_mutations
on conflict do nothing;
with later as (
  select 'goal.mutate' as protocol, owner_id, operation_id, operation_type, goal_id, null::uuid as entity_id, digest, state,
    reason, recorded_at, acknowledged_at, goal_version, expected_version from goal_private.goal_mutations
  union all
  select 'goal.work', owner_id, operation_id, operation_type, goal_id, entity_id, digest, state,
    reason, recorded_at, null, null, null from goal_private.work_mutations
)
insert into goal_private.operation_ledger(owner_id, operation_id, seq, protocol, operation_type, goal_id, entity_id, digest, state,
  reason, recorded_at, terminal_at, acknowledged_at, goal_version, expected_version)
select l.owner_id, l.operation_id,
  c.last_seq + row_number() over (partition by l.owner_id order by l.recorded_at, l.protocol, l.operation_id),
  l.protocol, l.operation_type, l.goal_id, l.entity_id, l.digest, l.state, l.reason, l.recorded_at, l.recorded_at,
  l.acknowledged_at, l.goal_version, l.expected_version
from later l join goal_private.counters c on c.owner_id = l.owner_id;
update goal_private.counters c set last_seq = m.last
from (select owner_id, max(seq) as last from goal_private.operation_ledger group by owner_id) m
where m.owner_id = c.owner_id and m.last > c.last_seq;

-- Provenance now points at the ledger. NO ACTION (not CASCADE): deleting a create operation that is a
-- Goal's provenance fails instead of silently invalidating the Goal; account deletion still cascades
-- (the provenance row goes in the same statement).
alter table goal_private.provenance drop constraint provenance_owner_id_operation_id_fkey;
alter table goal_private.provenance add constraint provenance_operation_fkey
  foreign key (owner_id, operation_id) references goal_private.operation_ledger(owner_id, operation_id);

-- Freeze the old tables: read-only history until a later migration drops them.
revoke all on goal_private.operations, goal_private.goal_mutations, goal_private.work_mutations from goal_manual_executor;

-- Shared ledger helpers ---------------------------------------------------------------------------
-- Serializes every action on one operation identity, across all Goal protocols.
create function goal_private.lock_operation(owner uuid, oid uuid) returns void language sql volatile set search_path=pg_catalog as $$
  select pg_advisory_xact_lock(hashtextextended('goal_operation:' || owner::text || ':' || oid::text, 0))
$$;

-- The owner's next sequence number. The counter row stays locked until commit, so rows commit in
-- seq order. Callers take the Goal row lock (if any) first: Goal -> counter is the only lock order.
create function goal_private.next_operation_seq(owner uuid) returns bigint language plpgsql set search_path=pg_catalog as $$
declare n bigint;
begin
  insert into goal_private.counters(owner_id) values (owner) on conflict do nothing;
  update goal_private.counters set last_seq = last_seq + 1 where owner_id = owner returning last_seq into n;
  return n;
end $$;

-- Protocol-neutral receipt for goal_operations_v1. Links are shown only while the Goal is still the owner's.
create function goal_private.operation_receipt(l goal_private.operation_ledger) returns jsonb language sql stable set search_path=pg_catalog,public as $$
  select jsonb_build_object('ownerId', l.owner_id, 'operationId', l.operation_id, 'protocol', l.protocol,
    'operationType', l.operation_type, 'contractVersion', 1, 'state', l.state, 'reason', l.reason, 'revision', l.revision::text,
    'goalId', case when o.owned then l.goal_id end, 'entityId', case when o.owned then l.entity_id end,
    'recordedAt', l.recorded_at, 'terminalAt', l.terminal_at, 'acknowledged', l.acknowledged_at is not null)
  from (select exists(select 1 from public.goals where id = l.goal_id and user_id = l.owner_id) as owned) o
$$;

-- Per-protocol receipts, rebuilt on the ledger row type (same bodies as 072/074/075).
drop function goal_private.receipt(goal_private.operations, boolean);
drop function goal_private.mutation_receipt(goal_private.goal_mutations);
drop function goal_private.work_result(goal_private.work_mutations);
create function goal_private.receipt(op goal_private.operation_ledger, include_id boolean default true) returns jsonb language sql stable set search_path=pg_catalog,public as $$
  select jsonb_build_object('ownerId',op.owner_id,'operationId',op.operation_id,'operationType','goal.create.manual','contractVersion',1,
    'state',op.state,'revision',op.revision::text,'admissionDeadline',op.admission_deadline,'reason',op.reason,
    'goalId',case when include_id and exists(select 1 from public.goals where id=op.goal_id and user_id=op.owner_id) then op.goal_id end,
    'goalVersion',op.goal_version::text,'terminalAt',op.terminal_at)
$$;
create function goal_private.mutation_receipt(m goal_private.operation_ledger) returns jsonb language sql stable set search_path=pg_catalog,public as $$
  select jsonb_build_object('ownerId',m.owner_id,'operationId',m.operation_id,'operationType',m.operation_type,'contractVersion',1,
    'state',m.state,'reason',m.reason,
    'goalId',case when exists(select 1 from public.goals where id=m.goal_id and user_id=m.owner_id) then m.goal_id end,
    'goalVersion',m.goal_version::text,'recordedAt',m.recorded_at)
$$;
create function goal_private.work_result(m goal_private.operation_ledger, request_type text default null) returns jsonb language plpgsql set search_path=pg_catalog,public,goal_private as $$
declare t public.tasks; ms public.milestones; entity jsonb; owned boolean;
  -- A tombstone has no type of its own; it answers in the type of the request it fenced.
  kind text := coalesce(m.operation_type, request_type);
begin
  owned := exists(select 1 from public.goals where id = m.goal_id and user_id = m.owner_id);
  if owned and m.entity_id is not null then
    if kind like 'task.%' then
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
    'operationType', kind, 'contractVersion', 1, 'state', m.state, 'reason', m.reason,
    'goalId', case when owned then m.goal_id end, 'recordedAt', m.recorded_at,
    'task', case when kind like 'task.%' then entity end,
    'milestone', case when kind like 'milestone.%' then entity end));
end $$;

-- Provenance check on the ledger (072's projection, unchanged otherwise).
create or replace function goal_private.projection(g public.goals, detail boolean) returns jsonb language plpgsql stable set search_path=pg_catalog,public,goal_private as $$
declare state text; day text; status text;
begin
  status:=case g.status when 'complete' then 'completed' when 'stagnant' then 'paused' else g.status end;
  if status not in ('active','paused','completed','expired','archived','draft','discovered') then raise exception 'GOAL_CONTRACT_UNSUPPORTED'; end if;
  if g.date_contract_version is null then state:=case when g.deadline is null then 'legacy_no_date' else 'needs_review' end;
  elsif g.date_contract_version=1 then
    if not exists(select 1 from goal_private.provenance p join goal_private.operation_ledger o on o.owner_id=p.owner_id and o.operation_id=p.operation_id and o.protocol='goal.create'
      where p.goal_id=g.id and p.owner_id=g.user_id and p.operation_id=g.creation_operation_id and o.state='committed' and o.goal_id=g.id) then raise exception 'GOAL_CONTRACT_INVALID'; end if;
    state:=g.end_date_state; day:=to_char(g.end_date,'YYYY-MM-DD');
  else raise exception 'GOAL_CONTRACT_UNSUPPORTED'; end if;
  return jsonb_build_object('id',g.id,'title',g.title,'category',g.category,'status',status,'progress',g.progress,
    'goalVersion',g.goal_version::text,'dateContractVersion',g.date_contract_version,'dateState',state,'endDate',day)
    || case when detail then jsonb_build_object('description',g.description) else '{}'::jsonb end;
end $$;

-- Manual Goal creation (072) on the ledger. Unchanged apart from storage and the shared identity lock.
create or replace function public.goal_manual_v1(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,goal_private
set lock_timeout='5s' set statement_timeout='15s' as $$
declare owner uuid:=goal_private.request_owner(); op goal_private.operation_ledger; oid uuid; now_at timestamptz;
  enabled boolean; fields jsonb; hash text; ctx jsonb; proof jsonb; cursor_data jsonb;
  rev bigint; resolver text; seq bigint; result jsonb; rows jsonb; more boolean; outstanding boolean;
  barrier bigint; last_seq bigint:=0; limit_n integer:=50; expiry timestamptz; next_cursor text;
  gid uuid; g public.goals; status_filter text; last_time timestamptz; last_id uuid; barrier_time timestamptz;
  allowed text[];
begin
  if owner is null then return goal_private.fail('UNAUTHORIZED'); end if;
  allowed := case action
    when 'capabilities' then array[]::text[] when 'context' then array[]::text[]
    when 'register' then array['operationId','operationType','contractVersion','payloadDigest','reviewToken']
    when 'submit' then array['operationId','operationType','contractVersion','fields']
    when 'lookup' then array['operationId'] when 'close' then array['operationId']
    when 'ack' then array['operationId','revision'] when 'discover' then array['cursor','limit']
    when 'list' then array['cursor','limit','status'] when 'header' then array['goalId'] else null end;
  if allowed is null or jsonb_typeof(payload) is distinct from 'object' or payload - allowed <> '{}'::jsonb then return goal_private.fail('INVALID_FIELD'); end if;
  if action='capabilities' then
    select a.enabled and (not a.verification_only or exists(select 1 from goal_private.verification_owners v where v.owner_id=owner)) into enabled from goal_private.admission a;
    return jsonb_build_object('ok',true,'data',jsonb_build_object('ownerId',owner,'contractVersion',1,'creationEnabled',enabled));
  end if;
  if action='context' then
    ctx:=goal_private.context(owner);
    if ctx->>'state'='available' then
      ctx:=ctx || jsonb_build_object('reviewToken',goal_private.sign(jsonb_build_object('owner',owner,'purpose','review',
        'revision',ctx->>'profileTimezoneRevision','resolver',ctx->>'resolverVersion','expires',clock_timestamp()+interval '15 minutes')));
    end if;
    return jsonb_build_object('ok',true,'data',ctx);
  end if;
  if action in ('header','list') then
    if action='header' then
      select jsonb_build_object('ownerId',owner,'headerContractVersion',1,'header',goal_private.projection(row,true),
        'dateContext',goal_private.context(owner)) into result
      from public.goals row where row.id=(payload->>'goalId')::uuid and row.user_id=owner;
      if not found then return goal_private.fail('GOAL_UNAVAILABLE'); end if;
      return jsonb_build_object('ok',true,'data',result);
    end if;
    status_filter:=coalesce(payload->>'status','active');
    if status_filter not in ('active','paused','completed','expired','archived') then return goal_private.fail('INVALID_FIELD'); end if;
    limit_n:=coalesce((payload->>'limit')::integer,50);
    if limit_n<1 or limit_n>100 then return goal_private.fail('INVALID_FIELD'); end if;
    barrier_time:=clock_timestamp(); expiry:=barrier_time+interval '15 minutes';
    if payload->>'cursor' is not null then
      cursor_data:=goal_private.verify(payload->>'cursor',owner,'list');
      if cursor_data is null or cursor_data->>'status'<>status_filter then return goal_private.fail('CURSOR_EXPIRED'); end if;
      barrier_time:=(cursor_data->>'barrier')::timestamptz; expiry:=(cursor_data->>'expires')::timestamptz;
      last_time:=(cursor_data->>'lastTime')::timestamptz; last_id:=(cursor_data->>'lastId')::uuid;
    end if;
    with page as (
      select row.* from public.goals row where row.user_id=owner
        and row.status=case status_filter when 'paused' then 'stagnant' when 'completed' then 'complete' else status_filter end
        and row.created_at<=barrier_time and (last_time is null or (row.created_at,row.id)>(last_time,last_id))
        order by row.created_at,row.id limit limit_n+1
    )
    select coalesce(jsonb_agg(goal_private.projection(page::public.goals,false) || jsonb_build_object('_createdAt',page.created_at)
      order by page.created_at,page.id),'[]'),goal_private.context(owner) into rows,ctx from page;
    more:=jsonb_array_length(rows)>limit_n;
    if more then rows:=rows - limit_n; end if;
    last_time:=(rows->-1->>'_createdAt')::timestamptz; last_id:=(rows->-1->>'id')::uuid;
    select coalesce(jsonb_agg(value - '_createdAt'),'[]') into rows from jsonb_array_elements(rows);
    if more then next_cursor:=goal_private.sign(jsonb_build_object('owner',owner,'purpose','list','status',status_filter,
      'barrier',barrier_time,'expires',expiry,'lastTime',last_time,'lastId',last_id)); end if;
    return jsonb_build_object('ok',true,'data',jsonb_build_object('ownerId',owner,'contractVersion',1,'items',rows,'dateContext',ctx,'nextCursor',next_cursor,'hasMore',more));
  end if;
  if action='discover' then
    limit_n:=coalesce((payload->>'limit')::integer,50);
    if limit_n<1 or limit_n>100 then return goal_private.fail('INVALID_FIELD'); end if;
    expiry:=clock_timestamp()+interval '15 minutes';
    if payload->>'cursor' is not null then
      cursor_data:=goal_private.verify(payload->>'cursor',owner,'discovery');
      if cursor_data is null then return goal_private.fail('CURSOR_EXPIRED'); end if;
      barrier:=(cursor_data->>'barrier')::bigint; last_seq:=(cursor_data->>'last')::bigint; expiry:=(cursor_data->>'expires')::timestamptz;
    end if;
    -- One statement gives barrier, bounded rows and outstanding summary one snapshot.
    with bound as (select coalesce(barrier,(select c.last_seq from goal_private.counters c where c.owner_id=owner),0) as n),
    page as (select o.* from goal_private.operation_ledger o,bound b where o.owner_id=owner and o.protocol='goal.create' and o.acknowledged_at is null and o.seq>last_seq and o.seq<=b.n order by o.seq limit limit_n+1)
    select b.n, coalesce((select jsonb_agg(goal_private.receipt(p,false)||jsonb_build_object('_seq',p.seq::text) order by p.seq) from page p),'[]'),
      exists(select 1 from goal_private.operation_ledger o where o.owner_id=owner and o.protocol='goal.create' and o.acknowledged_at is null and o.seq<=b.n)
    into barrier,rows,outstanding from bound b;
    more:=jsonb_array_length(rows)>limit_n;
    if more then rows:=rows - limit_n; end if;
    if more then next_cursor:=goal_private.sign(jsonb_build_object('owner',owner,'purpose','discovery','barrier',barrier::text,
      'last',rows->-1->>'_seq','expires',expiry)); end if;
    select coalesce(jsonb_agg(value - '_seq'),'[]') into rows from jsonb_array_elements(rows);
    return jsonb_build_object('ok',true,'data',jsonb_build_object('ownerId',owner,'items',rows,'hasMore',more,'nextCursor',next_cursor,'barrier',barrier::text,'hasOutstandingAtBarrier',outstanding));
  end if;
  oid:=(payload->>'operationId')::uuid;
  if oid is null then return goal_private.fail('INVALID_FIELD'); end if;
  if action in ('register','submit') then
    if payload->>'operationType' is distinct from 'goal.create.manual' or payload->'contractVersion' is distinct from '1'::jsonb then return goal_private.fail('UNSUPPORTED_CONTRACT'); end if;
    -- Shared admission lock held through commit; an operator's disabling UPDATE drains admitted transactions.
    select a.enabled and (not a.verification_only or exists(select 1 from goal_private.verification_owners v where v.owner_id=owner)) into enabled from goal_private.admission a for share;
  end if;
  if action='lookup' then
    select * into op from goal_private.operation_ledger where owner_id=owner and operation_id=oid and protocol='goal.create';
    if not found then return goal_private.fail('HISTORY_UNAVAILABLE'); end if;
  else
    if action in ('register','close') then
      -- Counter lock serializes first materialization in commit order, including missing-close tombstones.
      insert into goal_private.counters(owner_id) values(owner) on conflict do nothing;
      perform 1 from goal_private.counters where owner_id=owner for update;
    end if;
    perform goal_private.lock_operation(owner,oid);
    select * into op from goal_private.operation_ledger where owner_id=owner and operation_id=oid for update;
    -- One identity space for every Goal protocol: another protocol's operation is never reused.
    if found and op.protocol<>'goal.create' then
      return goal_private.fail(case when action='ack' then 'HISTORY_UNAVAILABLE' else 'OPERATION_PAYLOAD_MISMATCH' end);
    end if;
    if not found then
      if action not in ('register','close') then return goal_private.fail('HISTORY_UNAVAILABLE'); end if;
      if action='register' then
        if not enabled then return goal_private.fail('CREATION_UNAVAILABLE'); end if;
        hash:=payload->>'payloadDigest';
        if hash is null or hash !~ '^[0-9a-f]{64}$' then return goal_private.fail('INVALID_FIELD'); end if;
        if payload->>'reviewToken' is not null then
          proof:=goal_private.verify(payload->>'reviewToken',owner,'review');
          if proof is null then return goal_private.fail('DATE_CONTEXT_CHANGED'); end if;
          rev:=(proof->>'revision')::bigint; resolver:=proof->>'resolver';
        end if;
      end if;
      update goal_private.counters c set last_seq=c.last_seq+1 where c.owner_id=owner returning c.last_seq into seq;
      now_at:=clock_timestamp();
      insert into goal_private.operation_ledger(owner_id,operation_id,seq,protocol,operation_type,digest,reviewed_revision,reviewed_resolver,recorded_at,admission_deadline,state,reason,terminal_at)
      values(owner,oid,seq,'goal.create',case when action='register' then 'goal.create.manual' end,hash,rev,resolver,now_at,case when action='register' then now_at+interval '24 hours' end,
        case when action='register' then 'registered' else 'not_committed' end,
        case when action='close' then 'closed_by_owner' end,case when action='close' then now_at end) returning * into op;
    end if;
  end if;
  if action='register' and op.digest is not null then
    -- A renewed proof is equivalent only for the same immutable revision/resolver.
    if payload->>'reviewToken' is not null then proof:=goal_private.verify(payload->>'reviewToken',owner,'review',true);
      if proof is null then return goal_private.fail('DATE_CONTEXT_CHANGED'); end if;
    else proof:=null; end if;
    if op.digest is distinct from payload->>'payloadDigest' or op.reviewed_revision::text is distinct from proof->>'revision'
      or op.reviewed_resolver is distinct from proof->>'resolver' then return goal_private.fail('OPERATION_PAYLOAD_MISMATCH'); end if;
  end if;
  if action='submit' then
    fields:=goal_private.fields(payload->'fields'); hash:=goal_private.digest(fields);
    if op.digest is not null and op.digest<>hash then return goal_private.fail('OPERATION_PAYLOAD_MISMATCH'); end if;
    if op.state='registered' then
      if not enabled then return goal_private.fail('CREATION_UNAVAILABLE'); end if;
      if (fields->>'endDate' is null) <> (op.reviewed_revision is null) then return goal_private.fail('OPERATION_PAYLOAD_MISMATCH'); end if;
      if fields->>'endDate' is not null then
        perform 1 from public.profiles where id=owner for share;
        ctx:=goal_private.context(owner);
        if ctx->>'state'<>'available' then return goal_private.fail('DATE_CONTEXT_UNAVAILABLE'); end if;
        if ctx->>'profileTimezoneRevision'<>op.reviewed_revision::text or ctx->>'resolverVersion'<>op.reviewed_resolver then op.reason:='DATE_CONTEXT_CHANGED';
        elsif fields->>'endDate'<ctx->>'localDate' then op.reason:='DATE_IN_PAST'; end if;
      end if;
      now_at:=clock_timestamp();
      if now_at>=op.admission_deadline then op.reason:='SUBMISSION_WINDOW_ENDED'; end if;
      if op.reason is not null then
        update goal_private.operation_ledger set state='not_committed',reason=op.reason,terminal_at=now_at,revision=revision+1 where owner_id=owner and operation_id=oid returning * into op;
      else
        insert into public.goals(user_id,title,category,description,status,visibility,is_private,smart_data,progress,ai_generated,
          deadline,end_date,end_date_state,date_contract_version,creation_operation_id,color_theme)
        values(owner,fields->>'title',fields->>'category',fields->>'description','active','private',true,'{}',0,false,
          null,(fields->>'endDate')::date,case when fields->>'endDate' is null then 'no_date' else 'known' end,1,oid,
          case fields->>'category' when 'Health & Fitness' then 'forest' when 'Work & Money' then 'ocean' when 'Learning & Creativity' then 'lavender' else 'rose' end)
        returning id into gid;
        insert into goal_private.provenance(goal_id,owner_id,operation_id,method,recorded_at,context)
          values(gid,owner,oid,case when fields->>'endDate' is null then 'manual_no_date' else 'manual_date' end,now_at,ctx);
        update goal_private.operation_ledger set state='committed',goal_id=gid,goal_version=1,terminal_at=now_at,revision=revision+1
          where owner_id=owner and operation_id=oid returning * into op;
      end if;
    end if;
  elsif action='close' and op.state='registered' then
    update goal_private.operation_ledger set state='not_committed',reason='closed_by_owner',terminal_at=clock_timestamp(),revision=revision+1
      where owner_id=owner and operation_id=oid returning * into op;
  elsif action='ack' then
    if op.state='registered' or payload->>'revision' is distinct from op.revision::text then return goal_private.fail('RECEIPT_REVISION_MISMATCH'); end if;
    update goal_private.operation_ledger set acknowledged_at=coalesce(acknowledged_at,clock_timestamp()) where owner_id=owner and operation_id=oid returning * into op;
  end if;
  return jsonb_build_object('ok',true,'data',goal_private.receipt(op));
exception
  when invalid_text_representation or datetime_field_overflow or invalid_datetime_format then return goal_private.fail('INVALID_FIELD');
  when raise_exception then
    if sqlerrm in ('INVALID_FIELD','INVALID_DATE','GOAL_CONTRACT_UNSUPPORTED','GOAL_CONTRACT_INVALID') then return goal_private.fail(sqlerrm); end if;
    raise;
end $$;

-- Goal edit/complete/archive (074) on the ledger. Unchanged apart from storage and the shared identity lock.
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

-- Task and Milestone writes (075) on the ledger. Unchanged apart from storage, the shared identity lock and tombstones.
create or replace function public.goal_work_v1(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,goal_private,extensions
set lock_timeout='5s' set statement_timeout='15s' as $$
declare owner uuid := goal_private.request_owner(); gid uuid; g public.goals; allowed text[]; limit_n integer;
  cursor_data jsonb; rows jsonb; more boolean; next_cursor text; purpose text; expiry timestamptz; ids uuid[];
  oid uuid; op text; m goal_private.operation_ledger; stamp timestamptz; body jsonb; hash text; reason text; entity uuid; target uuid;
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

-- One operation surface for every Goal protocol -----------------------------------------------------
create function public.goal_operations_v1(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,goal_private
set lock_timeout='5s' set statement_timeout='15s' as $$
declare owner uuid := goal_private.request_owner(); allowed text[]; oid uuid; l goal_private.operation_ledger;
  limit_n integer; cursor_data jsonb; barrier bigint; last_seq bigint := 0; expiry timestamptz; rows jsonb; more boolean;
  outstanding boolean; next_cursor text; stamp timestamptz;
begin
  if owner is null then return goal_private.fail('UNAUTHORIZED'); end if;
  allowed := case action
    when 'lookup' then array['operationId'] when 'close' then array['operationId','protocol']
    when 'ack' then array['operationId','revision'] when 'discover' then array['cursor','limit'] else null end;
  if allowed is null or jsonb_typeof(payload) is distinct from 'object' or payload - allowed <> '{}'::jsonb then return goal_private.fail('INVALID_FIELD'); end if;

  if action = 'discover' then
    -- 072's algorithm for every protocol: a barrier at the owner's current seq, then bounded pages.
    limit_n := coalesce((payload->>'limit')::integer, 50);
    if limit_n < 1 or limit_n > 50 then return goal_private.fail('INVALID_FIELD'); end if;
    expiry := clock_timestamp() + interval '15 minutes';
    if payload->>'cursor' is not null then
      cursor_data := goal_private.verify(payload->>'cursor', owner, 'operations:discover');
      if cursor_data is null then return goal_private.fail('CURSOR_EXPIRED'); end if;
      barrier := (cursor_data->>'barrier')::bigint; last_seq := (cursor_data->>'last')::bigint; expiry := (cursor_data->>'expires')::timestamptz;
    end if;
    with bound as (select coalesce(barrier, (select c.last_seq from goal_private.counters c where c.owner_id = owner), 0) as n),
    page as (select x.* from goal_private.operation_ledger x, bound b where x.owner_id = owner and x.acknowledged_at is null
      and x.seq > last_seq and x.seq <= b.n order by x.seq limit limit_n + 1)
    select b.n, coalesce((select jsonb_agg(goal_private.operation_receipt(p) || jsonb_build_object('_seq', p.seq::text) order by p.seq) from page p), '[]'),
      exists(select 1 from goal_private.operation_ledger x where x.owner_id = owner and x.acknowledged_at is null and x.seq <= b.n)
    into barrier, rows, outstanding from bound b;
    more := jsonb_array_length(rows) > limit_n;
    if more then
      rows := rows - limit_n;
      next_cursor := goal_private.sign(jsonb_build_object('owner', owner, 'purpose', 'operations:discover', 'barrier', barrier::text,
        'last', rows->-1->>'_seq', 'expires', expiry));
    end if;
    select coalesce(jsonb_agg(value - '_seq'), '[]') into rows from jsonb_array_elements(rows);
    return jsonb_build_object('ok', true, 'data', jsonb_build_object('ownerId', owner, 'contractVersion', 1, 'items', rows,
      'hasMore', more, 'nextCursor', next_cursor, 'barrier', barrier::text, 'hasOutstandingAtBarrier', outstanding));
  end if;

  oid := (payload->>'operationId')::uuid;
  if oid is null then return goal_private.fail('INVALID_FIELD'); end if;
  if action = 'lookup' then
    select * into l from goal_private.operation_ledger where owner_id = owner and operation_id = oid;
    if not found then return goal_private.fail('HISTORY_UNAVAILABLE'); end if;
    return jsonb_build_object('ok', true, 'data', goal_private.operation_receipt(l));
  end if;

  perform goal_private.lock_operation(owner, oid);
  select * into l from goal_private.operation_ledger where owner_id = owner and operation_id = oid for update;
  if action = 'close' then
    if payload->>'protocol' is null or payload->>'protocol' not in ('goal.create', 'goal.mutate', 'goal.work') then
      return goal_private.fail('INVALID_FIELD');
    end if;
    stamp := clock_timestamp();
    if not found then
      -- A permanent tombstone: a delayed request with this identity can never commit.
      insert into goal_private.operation_ledger(owner_id, operation_id, seq, protocol, state, reason, recorded_at, terminal_at)
      values (owner, oid, goal_private.next_operation_seq(owner), payload->>'protocol', 'not_committed', 'closed_by_owner', stamp, stamp)
      returning * into l;
    elsif l.state = 'registered' then
      update goal_private.operation_ledger set state = 'not_committed', reason = 'closed_by_owner', terminal_at = stamp, revision = revision + 1
      where owner_id = owner and operation_id = oid returning * into l;
    end if;
    -- A terminal operation (of any protocol) is returned unchanged: close is idempotent.
    return jsonb_build_object('ok', true, 'data', goal_private.operation_receipt(l));
  end if;

  -- action = 'ack': only an outcome the client has seen (its revision) can be acknowledged.
  if not found then return goal_private.fail('HISTORY_UNAVAILABLE'); end if;
  if l.state = 'registered' or payload->>'revision' is distinct from l.revision::text then
    return goal_private.fail('RECEIPT_REVISION_MISMATCH');
  end if;
  update goal_private.operation_ledger set acknowledged_at = coalesce(acknowledged_at, clock_timestamp())
  where owner_id = owner and operation_id = oid returning * into l;
  return jsonb_build_object('ok', true, 'data', goal_private.operation_receipt(l));
exception
  when invalid_text_representation or numeric_value_out_of_range then return goal_private.fail('INVALID_FIELD');
end $$;

-- Retention ---------------------------------------------------------------------------------------
-- Daily, in bounded batches. Never deletes a create operation that is a Goal's provenance (the FK
-- would refuse it anyway). Returns what it did, which pg_cron records in cron.job_run_details.
create function goal_private.prune_operations(batch integer default 5000) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,goal_private
set lock_timeout='5s' set statement_timeout='60s' as $$
declare expired bigint; acknowledged bigint; aged bigint; capped bigint; engine bigint;
begin
  if batch < 1 then raise exception 'INVALID_FIELD'; end if;
  -- 072 registrations past their admission deadline end as submit would end them.
  with due as (select owner_id, operation_id from goal_private.operation_ledger
      where state = 'registered' and admission_deadline <= clock_timestamp() order by admission_deadline limit batch for update skip locked)
  update goal_private.operation_ledger l set state = 'not_committed', reason = 'SUBMISSION_WINDOW_ENDED',
    terminal_at = clock_timestamp(), revision = l.revision + 1
  from due where l.owner_id = due.owner_id and l.operation_id = due.operation_id;
  get diagnostics expired = row_count;

  -- Acknowledged outcomes, 30 days after acknowledgment.
  with doomed as (select owner_id, operation_id from goal_private.operation_ledger l
      where acknowledged_at < clock_timestamp() - interval '30 days'
        and not exists(select 1 from goal_private.provenance p where p.owner_id = l.owner_id and p.operation_id = l.operation_id)
      limit batch)
  delete from goal_private.operation_ledger l using doomed d where l.owner_id = d.owner_id and l.operation_id = d.operation_id;
  get diagnostics acknowledged = row_count;

  -- Unacknowledged outcomes: kept, but at most 180 days ...
  with doomed as (select owner_id, operation_id from goal_private.operation_ledger l
      where acknowledged_at is null and state <> 'registered' and terminal_at < clock_timestamp() - interval '180 days'
        and not exists(select 1 from goal_private.provenance p where p.owner_id = l.owner_id and p.operation_id = l.operation_id)
      limit batch)
  delete from goal_private.operation_ledger l using doomed d where l.owner_id = d.owner_id and l.operation_id = d.operation_id;
  get diagnostics aged = row_count;

  -- ... and at most 500 per owner (the newest are kept).
  with ranked as (select owner_id, operation_id, row_number() over (partition by owner_id order by seq desc) as n
      from goal_private.operation_ledger l
      where acknowledged_at is null and state <> 'registered'
        and not exists(select 1 from goal_private.provenance p where p.owner_id = l.owner_id and p.operation_id = l.operation_id)),
  doomed as (select owner_id, operation_id from ranked where n > 500 limit batch)
  delete from goal_private.operation_ledger l using doomed d where l.owner_id = d.owner_id and l.operation_id = d.operation_id;
  get diagnostics capped = row_count;

  -- The canonical Task engine's idempotency receipts (048, shared with desktop), after 30 days.
  with doomed as (select id from public.task_mutation_receipts where created_at < clock_timestamp() - interval '30 days'
      order by created_at limit batch)
  delete from public.task_mutation_receipts r using doomed d where r.id = d.id;
  get diagnostics engine = row_count;

  return jsonb_build_object('expired', expired, 'acknowledged', acknowledged, 'aged', aged, 'capped', capped, 'taskReceipts', engine);
end $$;

-- Grants ------------------------------------------------------------------------------------------
grant select, insert, update, delete on goal_private.operation_ledger to goal_manual_executor;
grant select, delete on public.task_mutation_receipts to goal_manual_executor;
revoke all on goal_private.operation_ledger from public, anon, authenticated, service_role;
grant execute on function goal_private.lock_operation(uuid,uuid), goal_private.next_operation_seq(uuid),
  goal_private.operation_receipt(goal_private.operation_ledger), goal_private.receipt(goal_private.operation_ledger,boolean),
  goal_private.mutation_receipt(goal_private.operation_ledger), goal_private.work_result(goal_private.operation_ledger,text)
  to goal_manual_executor;
revoke all on function goal_private.lock_operation(uuid,uuid), goal_private.next_operation_seq(uuid),
  goal_private.operation_receipt(goal_private.operation_ledger), goal_private.receipt(goal_private.operation_ledger,boolean),
  goal_private.mutation_receipt(goal_private.operation_ledger), goal_private.work_result(goal_private.operation_ledger,text),
  goal_private.prune_operations(integer)
  from public, anon, authenticated, service_role;
alter function goal_private.prune_operations(integer) owner to goal_manual_executor;
-- The scheduler runs jobs as the role that scheduled them (the migration role).
grant execute on function goal_private.prune_operations(integer) to current_user;

revoke all on function public.goal_operations_v1(text,jsonb) from public, anon, service_role;
alter function public.goal_operations_v1(text,jsonb) owner to goal_manual_executor;
grant execute on function public.goal_operations_v1(text,jsonb) to authenticated;
revoke execute on function public.goal_card_v1(text,jsonb) from service_role;

do $$ begin
  perform cron.schedule('goal-operation-retention', '17 3 * * *', 'select goal_private.prune_operations()');
end $$;

revoke create on schema public, goal_private from goal_manual_executor;
revoke goal_manual_executor from current_user;
commit;
