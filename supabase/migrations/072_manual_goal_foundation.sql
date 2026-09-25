-- Manual Goal v1. Source preparation only: admission is OFF. No legacy date conversion.
-- Do not enable until the access/reader/job cutover evidence in the delivery note passes.
begin;
create schema if not exists goal_private;
revoke all on schema goal_private from public, anon, authenticated, service_role;
create role goal_manual_executor nologin noinherit bypassrls;
-- Hosted Supabase migrations run as a non-superuser. Ownership transfer needs
-- temporary SET ROLE membership and CREATE on the destination schemas.
grant goal_manual_executor to current_user;
grant create on schema public, goal_private to goal_manual_executor;
grant usage on schema public, extensions, goal_private to goal_manual_executor;
-- Supabase owns auth's ACL; postgres cannot delegate auth schema privileges.
-- This fixed identity-only helper retains auth.uid() as the authority.
create function goal_private.request_owner() returns uuid language sql stable
security definer set search_path=pg_catalog as $$ select auth.uid() $$;

create table goal_private.admission (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  verification_only boolean not null default true,
  secret bytea not null default extensions.gen_random_bytes(32)
);
insert into goal_private.admission default values;
-- Initial end-to-end verification can admit only explicitly provisioned test
-- owners. Existing desktop accounts remain untouched; enabled is still a kill switch.
create table goal_private.verification_owners (
  owner_id uuid primary key references auth.users(id) on delete cascade
);
create table goal_private.counters (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  last_seq bigint not null default 0 check(last_seq >= 0)
);
create table goal_private.operations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  seq bigint not null,
  digest text check(digest ~ '^[0-9a-f]{64}$'),
  reviewed_revision bigint,
  reviewed_resolver text,
  first_recorded_at timestamptz not null,
  admission_deadline timestamptz,
  state text not null check(state in ('registered','committed','not_committed')),
  revision bigint not null default 1 check(revision > 0),
  reason text,
  goal_id uuid, -- Historical link deliberately has no cascading Goal FK.
  goal_version bigint,
  terminal_at timestamptz,
  acknowledged_at timestamptz,
  primary key(owner_id,operation_id), unique(owner_id,seq),
  check ((reviewed_revision is null) = (reviewed_resolver is null)),
  check (reviewed_revision is null or reviewed_revision > 0),
  check ((digest is not null and admission_deadline = first_recorded_at + interval '24 hours')
    or (digest is null and admission_deadline is null and state = 'not_committed')),
  check ((state = 'registered' and terminal_at is null and goal_id is null and reason is null and acknowledged_at is null)
    or (state = 'committed' and terminal_at is not null and goal_id is not null and goal_version is not null and reason is null)
    or (state = 'not_committed' and terminal_at is not null and goal_id is null and reason is not null))
);
create index goal_receipt_inbox on goal_private.operations(owner_id,seq) where acknowledged_at is null;
create index goal_receipt_expiry on goal_private.operations(admission_deadline,owner_id,operation_id) where state='registered';
alter table public.goals
  add column date_contract_version smallint,
  add column end_date date,
  add column end_date_state text,
  add column goal_version bigint not null default 1,
  add column creation_operation_id uuid;
alter table public.goals add constraint goal_calendar_shape check ((
  (date_contract_version is null and end_date is null and end_date_state is null and creation_operation_id is null)
  or (date_contract_version=1 and deadline is null and creation_operation_id is not null
    and ((end_date_state='known' and end_date between date '0001-01-01' and date '9999-12-31')
      or (end_date_state='no_date' and end_date is null)))
) is true);
create unique index goal_manual_operation on public.goals(user_id,creation_operation_id) where creation_operation_id is not null;
create index goal_compact_page on public.goals(user_id,status,created_at,id);
create table goal_private.provenance (
  goal_id uuid primary key references public.goals(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  method text not null check(method in ('manual_date','manual_no_date')),
  policy_version integer not null default 1 check(policy_version=1),
  recorded_at timestamptz not null,
  context jsonb,
  foreign key(owner_id,operation_id) references goal_private.operations(owner_id,operation_id) on delete cascade,
  check((method='manual_date' and context is not null) or (method='manual_no_date' and context is null))
);
alter table public.profiles add column goal_timezone_revision bigint not null default 1;
create function goal_private.profile_revision() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  new.goal_timezone_revision := old.goal_timezone_revision + case when new.timezone is distinct from old.timezone then 1 else 0 end;
  return new;
end $$;
create trigger goal_profile_revision before update on public.profiles for each row execute function goal_private.profile_revision();

-- All legacy writers/definers/services are rejected for adopted rows, including no-ops.
-- No caller-set configuration flag grants access. Only the non-login function owner can write.
create function goal_private.protect_goal() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
  -- Account deletion ends retention; only the privileged FK cascade after auth-user deletion may delete an adopted row.
  if tg_op='DELETE' and current_user not in ('anon','authenticated','service_role') then
    if not exists(select 1 from auth.users where id=old.user_id) then return old; end if;
  end if;
  if tg_op <> 'INSERT' and old.date_contract_version is not null then
    if current_user <> 'goal_manual_executor' then raise exception 'GOAL_WRITE_UPGRADE_REQUIRED'; end if;
    if tg_op='DELETE' then raise exception 'GOAL_DELETE_UNAVAILABLE'; end if;
    if new.date_contract_version is distinct from old.date_contract_version or new.user_id <> old.user_id
      or new.creation_operation_id is distinct from old.creation_operation_id then raise exception 'GOAL_AUTHORITY_IMMUTABLE'; end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  if new.date_contract_version is not null and current_user <> 'goal_manual_executor' then raise exception 'GOAL_WRITE_UPGRADE_REQUIRED'; end if;
  if new.previous_goal_id is not null and exists(select 1 from public.goals where id=new.previous_goal_id and date_contract_version is not null) then
    raise exception 'GOAL_PHASE_UNAVAILABLE';
  end if;
  if tg_op='UPDATE' then new.goal_version := old.goal_version+1; else new.goal_version:=1; end if;
  return new;
end $$;
create trigger goal_calendar_protection before insert or update or delete on public.goals for each row execute function goal_private.protect_goal();

create function goal_private.fail(code text) returns jsonb language sql immutable as $$ select jsonb_build_object('ok',false,'error',jsonb_build_object('code',code)) $$;
create function goal_private.sign(value jsonb) returns text language sql security definer set search_path=pg_catalog,extensions,goal_private as $$
  select encode(convert_to(value::text,'UTF8'),'hex') || '.' || encode(extensions.hmac(convert_to(value::text,'UTF8'), secret, 'sha256'),'hex') from goal_private.admission
$$;
create function goal_private.verify(token text, owner uuid, purpose text, allow_expired boolean default false) returns jsonb language plpgsql security definer set search_path=pg_catalog,extensions,goal_private as $$
declare body jsonb; mac text;
begin
  body := convert_from(decode(split_part(token,'.',1),'hex'),'UTF8')::jsonb;
  if token <> goal_private.sign(body) or body->>'owner' <> owner::text or body->>'purpose' <> purpose
    or (not allow_expired and (body->>'expires')::timestamptz <= clock_timestamp()) then return null; end if;
  return body;
exception when others then return null;
end $$;
create function goal_private.context(owner uuid) returns jsonb language plpgsql stable set search_path=pg_catalog,public as $$
declare zone text; rev bigint; stamp timestamptz:=clock_timestamp();
begin
  select timezone,goal_timezone_revision into zone,rev from public.profiles where id=owner;
  if not found then return jsonb_build_object('state','unavailable','reason','profile_missing'); end if;
  if zone is null or zone='' then return jsonb_build_object('state','unavailable','reason','invalid_timezone'); end if;
  if not (zone='UTC' or zone like '%/%') or not exists(select 1 from pg_timezone_names where name=zone) then
    return jsonb_build_object('state','unavailable','reason','unsupported_timezone'); end if;
  return jsonb_build_object('state','available','timezone',zone,'source','profile','evaluatedAt',stamp,
    'localDate',to_char(stamp at time zone zone,'YYYY-MM-DD'),'profileTimezoneRevision',rev::text,'resolverVersion','postgres-tz-v1');
end $$;

-- PostgreSQL repeats validation at the trusted boundary; an API hash never authorizes input.
create function goal_private.fields(input jsonb) returns jsonb language plpgsql immutable set search_path=pg_catalog as $$
declare title text; description text; category text; day text; trimset text := E'\t\n\f\r ' || chr(11)||chr(133)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288);
begin
  if jsonb_typeof(input) <> 'object' or input is null or (input - array['title','category','description','endDate']) <> '{}'::jsonb
    or jsonb_typeof(input->'title') is distinct from 'string' or jsonb_typeof(input->'category') is distinct from 'string'
    or (input ? 'description' and jsonb_typeof(input->'description') not in ('string','null'))
    or (input ? 'endDate' and jsonb_typeof(input->'endDate') not in ('string','null')) then raise exception 'INVALID_FIELD'; end if;
  title := btrim(normalize(input->>'title',NFC),trimset);
  description := nullif(btrim(normalize(input->>'description',NFC),trimset),'');
  category := input->>'category'; day := input->>'endDate';
  if char_length(title) not between 1 and 200 or char_length(description)>2000
    or category not in ('Health & Fitness','Work & Money','Learning & Creativity','Life & Relationships') then raise exception 'INVALID_FIELD'; end if;
  if day is not null then
    if day !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or left(day,4)='0000' then raise exception 'INVALID_DATE'; end if;
    if to_char(day::date,'YYYY-MM-DD') <> day then raise exception 'INVALID_DATE'; end if;
  end if;
  return jsonb_build_object('title',title,'category',category,'description',description,'endDate',day);
end $$;
create function goal_private.digest(fields jsonb) returns text language sql immutable set search_path=pg_catalog,extensions as $$
  select encode(extensions.digest(convert_to('[1,"goal.create.manual",' || to_json(fields->>'title')::text || ',' || to_json(fields->>'category')::text || ',' || coalesce(to_json(fields->>'description')::text,'null') || ',' || coalesce(to_json(fields->>'endDate')::text,'null') || ']','UTF8'),'sha256'),'hex')
$$;
create function goal_private.receipt(op goal_private.operations, include_id boolean default true) returns jsonb language sql stable set search_path=pg_catalog,public as $$
  select jsonb_build_object('ownerId',op.owner_id,'operationId',op.operation_id,'operationType','goal.create.manual','contractVersion',1,
    'state',op.state,'revision',op.revision::text,'admissionDeadline',op.admission_deadline,'reason',op.reason,
    'goalId',case when include_id and exists(select 1 from public.goals where id=op.goal_id and user_id=op.owner_id) then op.goal_id end,
    'goalVersion',op.goal_version::text,'terminalAt',op.terminal_at)
$$;
create function goal_private.projection(g public.goals, detail boolean) returns jsonb language plpgsql stable set search_path=pg_catalog,public,goal_private as $$
declare state text; day text; status text;
begin
  status:=case g.status when 'complete' then 'completed' when 'stagnant' then 'paused' else g.status end;
  if status not in ('active','paused','completed','expired','archived','draft','discovered') then raise exception 'GOAL_CONTRACT_UNSUPPORTED'; end if;
  if g.date_contract_version is null then state:=case when g.deadline is null then 'legacy_no_date' else 'needs_review' end;
  elsif g.date_contract_version=1 then
    if not exists(select 1 from goal_private.provenance p join goal_private.operations o on o.owner_id=p.owner_id and o.operation_id=p.operation_id
      where p.goal_id=g.id and p.owner_id=g.user_id and p.operation_id=g.creation_operation_id and o.state='committed' and o.goal_id=g.id) then raise exception 'GOAL_CONTRACT_INVALID'; end if;
    state:=g.end_date_state; day:=to_char(g.end_date,'YYYY-MM-DD');
  else raise exception 'GOAL_CONTRACT_UNSUPPORTED'; end if;
  return jsonb_build_object('id',g.id,'title',g.title,'category',g.category,'status',status,'progress',g.progress,
    'goalVersion',g.goal_version::text,'dateContractVersion',g.date_contract_version,'dateState',state,'endDate',day)
    || case when detail then jsonb_build_object('description',g.description) else '{}'::jsonb end;
end $$;

-- One versioned, fixed-shape RPC; no caller-selected owner, SQL or projection.
create function public.goal_manual_v1(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,goal_private
set lock_timeout='5s' set statement_timeout='15s' as $$
declare owner uuid:=goal_private.request_owner(); op goal_private.operations; oid uuid; now_at timestamptz;
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
    page as (select o.* from goal_private.operations o,bound b where o.owner_id=owner and o.acknowledged_at is null and o.seq>last_seq and o.seq<=b.n order by o.seq limit limit_n+1)
    select b.n, coalesce((select jsonb_agg(goal_private.receipt(p,false)||jsonb_build_object('_seq',p.seq::text) order by p.seq) from page p),'[]'),
      exists(select 1 from goal_private.operations o where o.owner_id=owner and o.acknowledged_at is null and o.seq<=b.n)
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
    select * into op from goal_private.operations where owner_id=owner and operation_id=oid;
    if not found then return goal_private.fail('HISTORY_UNAVAILABLE'); end if;
  else
    if action in ('register','close') then
      -- Counter lock serializes first materialization in commit order, including missing-close tombstones.
      insert into goal_private.counters(owner_id) values(owner) on conflict do nothing;
      perform 1 from goal_private.counters where owner_id=owner for update;
    end if;
    select * into op from goal_private.operations where owner_id=owner and operation_id=oid for update;
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
      insert into goal_private.operations(owner_id,operation_id,seq,digest,reviewed_revision,reviewed_resolver,first_recorded_at,admission_deadline,state,reason,terminal_at)
      values(owner,oid,seq,hash,rev,resolver,now_at,case when action='register' then now_at+interval '24 hours' end,
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
        update goal_private.operations set state='not_committed',reason=op.reason,terminal_at=now_at,revision=revision+1 where owner_id=owner and operation_id=oid returning * into op;
      else
        insert into public.goals(user_id,title,category,description,status,visibility,is_private,smart_data,progress,ai_generated,
          deadline,end_date,end_date_state,date_contract_version,creation_operation_id,color_theme)
        values(owner,fields->>'title',fields->>'category',fields->>'description','active','private',true,'{}',0,false,
          null,(fields->>'endDate')::date,case when fields->>'endDate' is null then 'no_date' else 'known' end,1,oid,
          case fields->>'category' when 'Health & Fitness' then 'forest' when 'Work & Money' then 'ocean' when 'Learning & Creativity' then 'lavender' else 'rose' end)
        returning id into gid;
        insert into goal_private.provenance(goal_id,owner_id,operation_id,method,recorded_at,context)
          values(gid,owner,oid,case when fields->>'endDate' is null then 'manual_no_date' else 'manual_date' end,now_at,ctx);
        update goal_private.operations set state='committed',goal_id=gid,goal_version=1,terminal_at=now_at,revision=revision+1
          where owner_id=owner and operation_id=oid returning * into op;
      end if;
    end if;
  elsif action='close' and op.state='registered' then
    update goal_private.operations set state='not_committed',reason='closed_by_owner',terminal_at=clock_timestamp(),revision=revision+1
      where owner_id=owner and operation_id=oid returning * into op;
  elsif action='ack' then
    if op.state='registered' or payload->>'revision' is distinct from op.revision::text then return goal_private.fail('RECEIPT_REVISION_MISMATCH'); end if;
    update goal_private.operations set acknowledged_at=coalesce(acknowledged_at,clock_timestamp()) where owner_id=owner and operation_id=oid returning * into op;
  end if;
  return jsonb_build_object('ok',true,'data',goal_private.receipt(op));
exception
  when invalid_text_representation or datetime_field_overflow or invalid_datetime_format then return goal_private.fail('INVALID_FIELD');
  when raise_exception then
    if sqlerrm in ('INVALID_FIELD','INVALID_DATE','GOAL_CONTRACT_UNSUPPORTED','GOAL_CONTRACT_INVALID') then return goal_private.fail(sqlerrm); end if;
    raise;
end $$;

-- No raw ledger access or anonymous EXECUTE. Recovery remains available with admission OFF.
grant select,insert,update on goal_private.operations,goal_private.counters to goal_manual_executor;
grant select on goal_private.admission,goal_private.verification_owners to goal_manual_executor;
grant update(singleton) on goal_private.admission to goal_manual_executor;
grant select,insert on goal_private.provenance to goal_manual_executor;
grant select,insert on public.goals to goal_manual_executor;
grant select on public.profiles to goal_manual_executor;
grant update(goal_timezone_revision) on public.profiles to goal_manual_executor;
grant execute on all functions in schema goal_private to goal_manual_executor;
revoke all on all tables in schema goal_private from public,anon,authenticated,service_role;
revoke all on all functions in schema goal_private from public,anon,authenticated,service_role;
revoke all on function public.goal_manual_v1(text,jsonb) from public,anon,service_role;
alter function public.goal_manual_v1(text,jsonb) owner to goal_manual_executor;
alter function goal_private.sign(jsonb) owner to goal_manual_executor;
alter function goal_private.verify(text,uuid,text,boolean) owner to goal_manual_executor;
grant execute on function public.goal_manual_v1(text,jsonb) to authenticated;
revoke create on schema public, goal_private from goal_manual_executor;
revoke goal_manual_executor from current_user;
commit;
