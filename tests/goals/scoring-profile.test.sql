\set ON_ERROR_STOP on
begin;
create schema auth;
create role anon;
create role authenticated;
create table public.goals (
  id uuid primary key,
  user_id uuid not null,
  category text not null,
  previous_goal_id uuid references public.goals(id),
  updated_at timestamptz not null default '2026-09-01T00:00:00Z'
);
create table public.goal_momentum_weekly_snapshots (id int, payload jsonb);
insert into public.goal_momentum_weekly_snapshots values (1, '{"score":51,"closed":true}');
insert into public.goals(id,user_id,category)
select ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
  '10000000-0000-4000-8000-000000000001', category
from unnest(array['finance','career','creative','education','relationships','growth','mind'])
with ordinality as input(category,n);
\ir ../../supabase/migrations/067_goal_momentum_scoring_profile.sql
do $$
declare actual text[];
begin
 select array_agg(momentum_scoring_profile order by id) into actual from public.goals;
 if actual <> array['finance','career','creative','education','relationships','personal_growth','education'] then
   raise exception 'Existing scoring profiles changed: %', actual;
 end if;
 if exists(select 1 from public.goals where updated_at <> '2026-09-01T00:00:00Z') then
   raise exception 'Migration fabricated Goal activity';
 end if;
end $$;

update public.goals set category = 'Health & Fitness' where category='mind';
insert into public.goals(id,user_id,category)
select ('20000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
 '10000000-0000-4000-8000-000000000001', category
from unnest(array['Health & Fitness','Work & Money','Learning & Creativity','Life & Relationships'])
with ordinality as input(category,n);
insert into public.goals(id,user_id,category,previous_goal_id)
values ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
 'Health & Fitness','00000000-0000-4000-8000-000000000007');
do $$
declare actual text[];
begin
 select array_agg(momentum_scoring_profile order by id) into actual from public.goals where id::text like '20000000%';
 if actual <> array['health_fitness','finance','creative','relationships'] then raise exception 'New defaults differ'; end if;
 if (select momentum_scoring_profile from public.goals where id='30000000-0000-4000-8000-000000000001') <> 'education' then
   raise exception 'New Phase recalibrated scoring';
 end if;
 if (select momentum_scoring_profile from public.goals where id='00000000-0000-4000-8000-000000000007') <> 'education' then
   raise exception 'Category edit recalibrated scoring';
 end if;
 begin
   update public.goals set momentum_scoring_profile='finance' where id='00000000-0000-4000-8000-000000000007';
   raise exception 'profile mutation was allowed';
 exception when raise_exception then
   if sqlerrm = 'profile mutation was allowed' then raise; end if;
 end;
 if (select payload from public.goal_momentum_weekly_snapshots where id=1) <> '{"score":51,"closed":true}'::jsonb then
   raise exception 'Historical snapshot changed';
 end if;
end $$;
rollback;
