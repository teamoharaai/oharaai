-- Hosted facts, reported rather than asserted. Runs last, inside the preflight transaction, after the probes.
\echo '-- Facts: Goal and Task RPC ownership and EXECUTE grants'
select p.oid::regprocedure as function, pg_get_userbyid(p.proowner) as owner, p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('goal_manual_v1', 'goal_card_v1', 'goal_work_v1', 'replace_task_schedule_v1', 'reconcile_task_occurrences_v1')
order by 1::text;
\echo '-- Facts: executor access to the auth schema (the original 073 owner lookup needed this and failed)'
select has_schema_privilege('goal_manual_executor', 'auth', 'USAGE') as executor_auth_usage,
       pg_get_userbyid((select nspowner from pg_namespace where nspname = 'auth')) as auth_schema_owner;
\echo '-- Facts: user triggers on the tables the Goal RPCs write'
select c.oid::regclass as table, count(t.oid) as triggers, string_agg(t.tgname, ', ' order by t.tgname) as names
from pg_class c left join pg_trigger t on t.tgrelid = c.oid and not t.tgisinternal
where c.oid in ('public.goals'::regclass, 'public.tasks'::regclass, 'public.task_occurrences'::regclass, 'public.milestones'::regclass)
group by 1 order by 1::text;
