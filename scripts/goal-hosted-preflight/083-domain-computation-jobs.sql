-- Migration 083 is additive. Verify its projections, expiring leases, bounded
-- Echo claim surface, and privilege boundary without reading user content.
do $$
declare
  project_definition text;
  echo_definition text;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'momentum_profiles'
      and column_name = 'current_summary' and data_type = 'jsonb'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'momentum_profiles'
      and column_name = 'current_week_start' and data_type = 'date'
  ) then
    raise exception 'MOMENTUM_CURRENT_PROJECTION_MISSING';
  end if;

  if to_regclass('public.momentum_recalculation_leases') is null
     or not has_table_privilege('service_role', 'public.momentum_recalculation_leases', 'SELECT, INSERT, UPDATE, DELETE')
     or has_table_privilege('authenticated', 'public.momentum_recalculation_leases', 'SELECT')
     or has_table_privilege('anon', 'public.momentum_recalculation_leases', 'SELECT') then
    raise exception 'MOMENTUM_LEASE_PRIVILEGES_INVALID';
  end if;

  if not has_function_privilege('service_role', 'public.claim_momentum_recalculation_v1(uuid,date,uuid,integer)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.release_momentum_recalculation_v1(uuid,date,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.claim_momentum_recalculation_v1(uuid,date,uuid,integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.release_momentum_recalculation_v1(uuid,date,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.claim_momentum_recalculation_v1(uuid,date,uuid,integer)', 'EXECUTE') then
    raise exception 'MOMENTUM_LEASE_FUNCTION_PRIVILEGES_INVALID';
  end if;

  select pg_get_functiondef('public.get_project_goal_momentum_v11(uuid)'::regprocedure)
    into project_definition;
  if project_definition not like '%momentum_profiles%current_summary%'
     or project_definition not like '%goal_momentum_weekly_snapshots%' then
    raise exception 'PROJECT_MOMENTUM_PROJECTION_INVALID';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'echo_entries'
      and indexname = 'idx_echo_entries_reconcile_queue'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'echo_entries'
      and column_name = 'reconcile_lease_expires_at'
  ) then
    raise exception 'ECHO_RECONCILIATION_LEASE_MISSING';
  end if;

  select pg_get_functiondef('public.claim_echo_reconciliation_v1(uuid[],integer,uuid,integer)'::regprocedure)
    into echo_definition;
  if lower(echo_definition) not like '%for update skip locked%'
     or lower(echo_definition) not like '%p_limit > 10%'
     or not has_function_privilege('authenticated', 'public.claim_echo_reconciliation_v1(uuid[],integer,uuid,integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.claim_echo_reconciliation_v1(uuid[],integer,uuid,integer)', 'EXECUTE') then
    raise exception 'ECHO_RECONCILIATION_CLAIM_INVALID';
  end if;
end $$;
