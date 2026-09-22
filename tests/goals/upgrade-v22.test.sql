-- Run ONLY on a disposable full 001–066 database; the entire upgrade rolls back.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000071');
create temporary table approved_mind(id uuid, category text);
insert into approved_mind values ('0072a366-4863-4004-b16c-404c5a096fd0','Learning & Creativity'),
('11125ce9-713e-4ede-84a2-cbae9e41012e','Health & Fitness'),
('1941106e-85e5-4947-850e-25eeb9fffa31','Life & Relationships'),
('465140b0-0183-41dc-9dcb-09136ee48f2e','Health & Fitness'),
('5e7a4487-98a1-4bea-9fb6-c7a05b98097c','Learning & Creativity'),
('79ed0b33-a2e5-41b1-a4c7-63c1ddf90f8e','Learning & Creativity'),
('98046f42-f474-480a-b782-fff92da86bb0','Learning & Creativity'),
('ad607078-f9ac-45a5-bd35-a0e68e0de31b','Learning & Creativity'),
('ae716a0f-a7ed-44cd-9161-ca6193fd9287','Health & Fitness'),
('ddd70994-48da-4c0e-adc4-1673f6976414','Learning & Creativity');
insert into public.goals(id,user_id,title,category,created_at,updated_at)
select id,'00000000-0000-4000-8000-000000000071','Synthetic mind migration fixture','mind','2026-08-01','2026-08-02' from approved_mind;
insert into public.goals(id,user_id,title,category)
select ('70000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 '00000000-0000-4000-8000-000000000071','Synthetic category fixture',category
from unnest(array['health','finance','career','creative','education','relationships','growth','body','create','connect','money','contribute']) with ordinality as i(category,n);
insert into public.entries(id,user_id,entry_type,title) values
 ('80000000-0000-4000-8000-000000000071','00000000-0000-4000-8000-000000000071','note','Synthetic linked note');
insert into public.entry_category_links(entry_id,category_id,link_source) values
 ('80000000-0000-4000-8000-000000000071','finance','category_only'),
 ('80000000-0000-4000-8000-000000000071','career','category_only');
insert into public.entry_goal_links(entry_id,goal_id)
select '80000000-0000-4000-8000-000000000071',id from approved_mind;
select public.publish_goal_momentum_v1_snapshot(
 '00000000-0000-4000-8000-000000000071','70000000-0000-4000-8000-000000000002',
 '2026-07-27','2026-08-02','UTC',null,72.5,72.5,'building',
 '{}','{}','{}','{}','[]','[]','goal-momentum-v1.1',repeat('c',64),'original-revision',
 'finance','frequency_routine','{}','{}',45,'D2','{}','difficulty-v1.0','momentum-categories-v1.0'
);
create temporary table old_goals as select id,to_jsonb(g)-'category' as original from public.goals g;
create temporary table old_snapshots as select to_jsonb(s) as original from public.goal_momentum_weekly_snapshots s;
create temporary table old_profiles as select to_jsonb(p) as original from public.goal_difficulty_profiles p;
\ir ../../supabase/migrations/067_goal_momentum_scoring_profile.sql
\ir ../../supabase/migrations/068_goal_product_categories.sql
\ir ../../supabase/migrations/069_goal_visibility_management.sql
do $$ begin
 if exists(select 1 from approved_mind a join public.goals g on g.id=a.id where g.category<>a.category or g.momentum_scoring_profile<>'education') then raise exception 'Approved mind mapping or profile changed'; end if;
 if exists(select 1 from old_goals o full join public.goals g on g.id=o.id where o.id is null or g.id is null or o.original<>(to_jsonb(g)-'category'-'momentum_scoring_profile')) then raise exception 'Goal identity/history changed'; end if;
 if exists((select original from old_snapshots except select to_jsonb(s) from public.goal_momentum_weekly_snapshots s) union all (select to_jsonb(s) from public.goal_momentum_weekly_snapshots s except select original from old_snapshots)) then raise exception 'Closed snapshots changed'; end if;
 if exists((select original from old_profiles except select to_jsonb(p) from public.goal_difficulty_profiles p) union all (select to_jsonb(p) from public.goal_difficulty_profiles p except select original from old_profiles)) then raise exception 'Historical difficulty profiles changed'; end if;
 if (select count(*) from public.category_link_migration_history)<>2 then raise exception 'Original category link records lost'; end if;
 if (select count(*) from public.entry_category_links where entry_id='80000000-0000-4000-8000-000000000071')<>4 then raise exception 'Inherited mind categories or deduplication incorrect'; end if;
 if (select momentum_scoring_profile from public.goals where id='70000000-0000-4000-8000-000000000003')<>'career' then raise exception 'Career baseline changed'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000071',true);
do $$ declare successor uuid; begin
 successor := public.start_goal_new_phase_v1('11125ce9-713e-4ede-84a2-cbae9e41012e',now()+interval '90 days');
 if not exists(select 1 from public.goals where id=successor and category='Health & Fitness' and momentum_scoring_profile='education') then
   raise exception 'Actual New Phase RPC recalibrated approved mind predecessor';
 end if;
 update public.goals set category='Work & Money' where id=successor;
 if (select momentum_scoring_profile from public.goals where id=successor)<>'education' then raise exception 'Category edit changed inherited profile'; end if;
end $$;
rollback;
