-- Rollback-only production rehearsal. Never commits or updates the ledger.
\set ON_ERROR_STOP on
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';
do $$ begin
  if (select max(version) from supabase_migrations.schema_migrations) <> '066' then
    raise exception 'Expected reviewed production ledger through 066';
  end if;
end $$;
create temporary table before_goals as select id, category, to_jsonb(g)-'category' as original from public.goals g;
create temporary table before_goal_snapshots as select to_jsonb(s) as original from public.goal_momentum_weekly_snapshots s;
create temporary table before_user_snapshots as select to_jsonb(s) as original from public.momentum_weekly_snapshots s;
create temporary table before_profiles as select to_jsonb(p) as original from public.goal_difficulty_profiles p;
\ir ../../supabase/migrations/067_goal_momentum_scoring_profile.sql
\ir ../../supabase/migrations/068_goal_product_categories.sql
\ir ../../supabase/migrations/069_goal_visibility_management.sql
do $$ begin
  if exists(select 1 from before_goals b full join public.goals g on g.id=b.id
    where b.id is null or g.id is null or b.original <> (to_jsonb(g)-'category'-'momentum_scoring_profile')) then
    raise exception 'Goal identity/history changed';
  end if;
  if exists(select 1 from before_goals b join public.goals g on g.id=b.id
    where g.momentum_scoring_profile <> public.goal_scoring_profile_for_category(b.category)
      or g.category <> public.goal_product_category(b.category,b.id)) then
    raise exception 'Approved category/scoring continuity failed';
  end if;
  if exists((select original from before_goal_snapshots except select to_jsonb(s) from public.goal_momentum_weekly_snapshots s)
    union all (select to_jsonb(s) from public.goal_momentum_weekly_snapshots s except select original from before_goal_snapshots)) then
    raise exception 'Goal snapshots changed';
  end if;
  if exists((select original from before_user_snapshots except select to_jsonb(s) from public.momentum_weekly_snapshots s)
    union all (select to_jsonb(s) from public.momentum_weekly_snapshots s except select original from before_user_snapshots)) then
    raise exception 'User snapshots changed';
  end if;
  if exists((select original from before_profiles except select to_jsonb(p) from public.goal_difficulty_profiles p)
    union all (select to_jsonb(p) from public.goal_difficulty_profiles p except select original from before_profiles)) then
    raise exception 'Difficulty history changed';
  end if;
end $$;
select category,count(*) as goals from public.goals group by category order by category;
select 'PASS: approved mapping, Goal identity/history, scoring profiles, and immutable Momentum history' as result;
rollback;
