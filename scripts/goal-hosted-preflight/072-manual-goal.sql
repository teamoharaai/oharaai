-- 072 probe: manual Goal creation, replay, header, list, privacy defaults and account cascade.
-- Runs inside the preflight's single rollback-only transaction (scripts/test-manual-goal-hosted.mjs),
-- which owns BEGIN, the timeouts and ROLLBACK. Synthetic rows only; does not alter real users.
insert into auth.users(id,email,raw_user_meta_data)
values('11a00e2e-1111-4111-8111-111111111111','goal-migration-probe@local.ohara.test','{}');
insert into goal_private.verification_owners values('11a00e2e-1111-4111-8111-111111111111');
update goal_private.admission set enabled=true;
set local role authenticated;
set local request.jwt.claim.sub='11a00e2e-1111-4111-8111-111111111111';
do $$
declare r jsonb; replay jsonb; header jsonb; op jsonb := '{"operationId":"22a00e2e-2222-4222-8222-222222222222","operationType":"goal.create.manual","contractVersion":1}';
begin
 r:=public.goal_manual_v1('register',op||'{"payloadDigest":"034eb48c780988013ae1487ceb012e0b900d3b04c4f020c6695e26076382e37e"}');
 if r#>>'{data,state}' is distinct from 'registered' then raise exception 'Registration failed: %',r; end if;
 r:=public.goal_manual_v1('submit',op||'{"fields":{"title":"Café","category":"Life & Relationships"}}');
 if r#>>'{data,state}' is distinct from 'committed' then raise exception 'Commit failed: %',r; end if;
 replay:=public.goal_manual_v1('submit',op||'{"fields":{"title":"Café","category":"Life & Relationships"}}');
 if replay is distinct from r then raise exception 'Replay changed receipt'; end if;
 header:=public.goal_manual_v1('header',jsonb_build_object('goalId',r#>>'{data,goalId}'));
 if header#>>'{data,header,dateState}' is distinct from 'no_date' then raise exception 'Header failed: %',header; end if;
 if jsonb_array_length(public.goal_manual_v1('list','{"limit":1}')#>'{data,items}')<>1 then raise exception 'List failed'; end if;
end $$;
reset role;
do $$
begin
 if (select count(*) from public.goals where user_id='11a00e2e-1111-4111-8111-111111111111' and visibility='private' and is_private and deadline is null and end_date_state='no_date')<>1 then raise exception 'Privacy/default invariant failed'; end if;
 if exists(select 1 from public.trackers where goal_id in(select id from public.goals where user_id='11a00e2e-1111-4111-8111-111111111111')) then raise exception 'Unexpected child tracker'; end if;
 if exists(select 1 from pg_auth_members where roleid='goal_manual_executor'::regrole and (inherit_option or set_option)) then raise exception 'Temporary SET/INHERIT membership survived'; end if;
 if has_schema_privilege('goal_manual_executor','public','CREATE') then raise exception 'Temporary schema CREATE survived'; end if;
end $$;
delete from auth.users where id='11a00e2e-1111-4111-8111-111111111111';
do $$ begin
 if exists(select 1 from goal_private.operation_ledger where owner_id='11a00e2e-1111-4111-8111-111111111111') then raise exception 'Account cascade failed'; end if;
end $$;
