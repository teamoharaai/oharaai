-- 074 probe: goal_card_v1 called as authenticated for a synthetic owner, plus executor ownership and grants.
-- Runs inside the preflight's single rollback-only transaction (scripts/test-manual-goal-hosted.mjs).
-- Hosted-only facts this reaches: the real auth schema (owned by supabase_auth_admin, unusable by the
-- executor, which is what broke the original 073 owner lookup), real grants and real triggers.
insert into auth.users(id,email,raw_user_meta_data) values
  ('11a00e2e-7474-4074-8074-000000000001','goal-card-probe@local.ohara.test','{}'),
  ('11a00e2e-7474-4074-8074-000000000002','goal-card-probe-other@local.ohara.test','{}');
update public.profiles set timezone='America/New_York' where id='11a00e2e-7474-4074-8074-000000000001';
insert into goal_private.verification_owners values('11a00e2e-7474-4074-8074-000000000001');
update goal_private.admission set enabled=true;
do $$
declare
  owner constant text := '11a00e2e-7474-4074-8074-000000000001';
  other constant text := '11a00e2e-7474-4074-8074-000000000002';
  fields constant jsonb := '{"title":"Card probe","category":"Life & Relationships"}';
  create_op constant jsonb := '{"operationId":"22a00e2e-7474-4074-8074-000000000001","operationType":"goal.create.manual","contractVersion":1}';
  digest text := goal_private.digest(goal_private.fields(fields));
  goal text; edit jsonb; first jsonb; r jsonb; blocked boolean;
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', owner, true);
  r := public.goal_manual_v1('register', create_op || jsonb_build_object('payloadDigest', digest));
  if r#>>'{data,state}' is distinct from 'registered' then raise exception '074 probe: registration failed: %', r; end if;
  r := public.goal_manual_v1('submit', create_op || jsonb_build_object('fields', fields));
  if r#>>'{data,state}' is distinct from 'committed' then raise exception '074 probe: Goal create failed: %', r; end if;
  goal := r#>>'{data,goalId}';

  -- Version-checked edit commits once and replays by identity.
  edit := jsonb_build_object('operationId', '22a00e2e-7474-4074-8074-000000000002', 'operationType', 'goal.update.manual',
    'contractVersion', 1, 'goalId', goal, 'expectedVersion', '1', 'changes', jsonb_build_object('title', 'Card probe renamed'));
  first := public.goal_card_v1('mutate', edit);
  if first#>>'{data,state}' is distinct from 'committed' or first#>>'{data,goalVersion}' is distinct from '2' then
    raise exception '074 probe: edit failed: %', first; end if;
  r := public.goal_card_v1('mutate', edit);
  if r->'data' is distinct from first->'data' then raise exception '074 probe: replay changed the receipt: %', r; end if;
  r := public.goal_manual_v1('header', jsonb_build_object('goalId', goal));
  if r#>>'{data,header,title}' is distinct from 'Card probe renamed' then raise exception '074 probe: header not updated: %', r; end if;

  -- Child reads.
  r := public.goal_card_v1('entries', jsonb_build_object('goalId', goal, 'entryType', 'note'));
  if r#>'{data,items}' is distinct from '[]'::jsonb then raise exception '074 probe: entries failed: %', r; end if;
  r := public.goal_card_v1('activity', jsonb_build_object('goalId', goal));
  if jsonb_array_length(r#>'{data,days}') <> 7 or r#>>'{data,timezone}' is distinct from 'America/New_York' then
    raise exception '074 probe: activity failed: %', r; end if;

  -- Another owner sees nothing and cannot commit.
  perform set_config('request.jwt.claim.sub', other, true);
  r := public.goal_card_v1('activity', jsonb_build_object('goalId', goal));
  if r#>>'{error,code}' is distinct from 'GOAL_UNAVAILABLE' then raise exception '074 probe: cross-owner read allowed: %', r; end if;
  r := public.goal_card_v1('mutate', jsonb_build_object('operationId', '22a00e2e-7474-4074-8074-000000000003',
    'operationType', 'goal.complete', 'contractVersion', 1, 'goalId', goal, 'expectedVersion', '2'));
  if r#>>'{data,state}' is distinct from 'not_committed' or r#>>'{data,reason}' is distinct from 'GOAL_UNAVAILABLE' then
    raise exception '074 probe: cross-owner mutate allowed: %', r; end if;

  -- The owner cannot bypass the RPC with a direct write to an adopted Goal.
  perform set_config('request.jwt.claim.sub', owner, true);
  begin
    update public.goals set title = 'bypass' where id = goal::uuid;
    blocked := false;
  exception when others then blocked := true;
  end;
  if not blocked then raise exception '074 probe: direct Goal write was allowed'; end if;
  perform set_config('role', 'none', true);

  -- Executor ownership and grants as deployed.
  if (select pg_get_userbyid(proowner) from pg_proc where oid = 'public.goal_card_v1(text,jsonb)'::regprocedure) <> 'goal_manual_executor'
    or not (select prosecdef from pg_proc where oid = 'public.goal_card_v1(text,jsonb)'::regprocedure) then
    raise exception '074 probe: goal_card_v1 is not a security definer owned by goal_manual_executor'; end if;
  if has_function_privilege('anon', 'public.goal_card_v1(text,jsonb)', 'EXECUTE') then raise exception '074 probe: anon can execute goal_card_v1'; end if;
  if not has_function_privilege('authenticated', 'public.goal_card_v1(text,jsonb)', 'EXECUTE') then raise exception '074 probe: authenticated cannot execute goal_card_v1'; end if;
  if exists (select 1 from pg_auth_members where roleid = 'goal_manual_executor'::regrole and (inherit_option or set_option)) then
    raise exception '074 probe: temporary SET/INHERIT membership survived'; end if;
  if has_schema_privilege('goal_manual_executor', 'public', 'CREATE') or has_schema_privilege('goal_manual_executor', 'goal_private', 'CREATE') then
    raise exception '074 probe: temporary schema CREATE survived'; end if;

  -- Account deletion cascades the receipts.
  delete from auth.users where id in (owner::uuid, other::uuid);
  if exists (select 1 from goal_private.operation_ledger where owner_id in (owner::uuid, other::uuid)) then
    raise exception '074 probe: account cascade failed'; end if;
end $$;
