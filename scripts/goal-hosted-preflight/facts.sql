-- Hosted facts, reported rather than asserted. Runs last, inside the preflight transaction, after the probes.
\echo '-- Facts: Goal and Task RPC ownership and EXECUTE grants'
select p.oid::regprocedure as function, pg_get_userbyid(p.proowner) as owner, p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('goal_manual_v1', 'goal_card_v1', 'goal_work_v1', 'goal_operations_v1', 'replace_task_schedule_v1', 'reconcile_task_occurrences_v1')
order by 1::text;
\echo '-- Facts: executor access to the auth schema (the original 073 owner lookup needed this and failed)'
select has_schema_privilege('goal_manual_executor', 'auth', 'USAGE') as executor_auth_usage,
       pg_get_userbyid((select nspowner from pg_namespace where nspname = 'auth')) as auth_schema_owner;
\echo '-- Facts: user triggers on the tables the Goal RPCs write'
select c.oid::regclass as table, count(t.oid) as triggers, string_agg(t.tgname, ', ' order by t.tgname) as names
from pg_class c left join pg_trigger t on t.tgrelid = c.oid and not t.tgisinternal
where c.oid in ('public.goals'::regclass, 'public.tasks'::regclass, 'public.task_occurrences'::regclass, 'public.milestones'::regclass)
group by 1 order by 1::text;
\echo '-- Facts: migration history shape (--apply records version, name and the whole file as statements, as 072 was recorded)'
select column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema = 'supabase_migrations' and table_name = 'schema_migrations' order by ordinal_position;
select version, name,
       (select coalesce(string_agg(key, ', ' order by key), '-') from jsonb_each(to_jsonb(m) - 'version' - 'name') where value <> 'null') as other_columns_set
from supabase_migrations.schema_migrations m where version >= '070' order by version;
\echo '-- Facts: pg_cron (078 schedules the Goal operation retention job with it)'
select extname, extversion, extnamespace::regnamespace as schema from pg_extension where extname = 'pg_cron';
select jobname, schedule, command, username, active from cron.job order by jobname;
\echo '-- Facts: Goal operation receipts (078 copies the three old tables into the ledger, which retention then bounds)'
select 'ledger' as store, protocol, state, count(*) as rows, count(*) filter (where acknowledged_at is null) as unacknowledged
from goal_private.operation_ledger group by protocol, state
union all select 'operations (072)', 'goal.create', state, count(*), count(*) filter (where acknowledged_at is null) from goal_private.operations group by state
union all select 'goal_mutations (074)', 'goal.mutate', state, count(*), count(*) filter (where acknowledged_at is null) from goal_private.goal_mutations group by state
union all select 'work_mutations (075)', 'goal.work', state, count(*), count(*) from goal_private.work_mutations group by state
union all select 'task_mutation_receipts (048)', '-', 'older than 30 days', count(*), null from public.task_mutation_receipts where created_at < now() - interval '30 days'
order by 1, 2, 3;
