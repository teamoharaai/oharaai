-- Public transfer/ownership/rollback acceptance. Disposable local 001–060 only.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000094'),('00000000-0000-4000-8000-000000000095');
insert into public.goals(id,user_id,title,category,visibility) values
 ('10000000-0000-4000-8000-000000000094','00000000-0000-4000-8000-000000000094','Public phase fixture','body','public');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000094',true);
do $$ declare successor uuid; begin
 successor := public.start_goal_new_phase_v1('10000000-0000-4000-8000-000000000094',now()+interval '1 year');
 if not exists(select 1 from public.goals where id=successor and status='active' and visibility='public'
   and previous_goal_id='10000000-0000-4000-8000-000000000094') then raise exception 'public successor invalid'; end if;
 if not exists(select 1 from public.goals where id='10000000-0000-4000-8000-000000000094' and status='archived' and visibility='private') then raise exception 'predecessor not retained privately'; end if;
 if (select count(*) from public.goals where visibility='public')<>1 then raise exception 'public slot count invalid'; end if;
 begin
   perform public.start_goal_new_phase_v1('10000000-0000-4000-8000-000000000094',now()+interval '1 year');
   raise exception 'duplicate phase accepted';
 exception when others then
   if SQLERRM='duplicate phase accepted' then raise; end if;
 end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000095',true);
do $$ begin
 begin
   perform public.start_goal_new_phase_v1('10000000-0000-4000-8000-000000000094',now()+interval '1 year');
   raise exception 'foreign phase accepted';
 exception when others then
   if SQLERRM<>'Goal not found' then raise; end if;
 end;
end $$;
reset role;
-- Inject a failure after the predecessor relinquishes public visibility. The
-- entire RPC must roll back, including that earlier visibility write.
create function public.release_reject_successor() returns trigger language plpgsql as $$
begin if new.previous_goal_id is not null and new.title='Rollback fixture' then
 raise exception 'release injected failure'; end if; return new; end $$;
create trigger release_reject_successor before insert on public.goals
 for each row execute function public.release_reject_successor();
insert into public.goals(id,user_id,title,category,visibility) values
 ('10000000-0000-4000-8000-000000000095','00000000-0000-4000-8000-000000000095','Rollback fixture','body','public');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000095',true);
do $$ begin
 begin
   perform public.start_goal_new_phase_v1('10000000-0000-4000-8000-000000000095',now()+interval '1 year');
   raise exception 'injected failure not raised';
 exception when others then
   if SQLERRM<>'release injected failure' then raise; end if;
 end;
 if not exists(select 1 from public.goals where id='10000000-0000-4000-8000-000000000095' and visibility='public' and status='active') then raise exception 'partial predecessor mutation'; end if;
 if exists(select 1 from public.goals where previous_goal_id='10000000-0000-4000-8000-000000000095') then raise exception 'partial successor'; end if;
end $$;
rollback;
select 'Public New Phase, ownership, uniqueness and rollback passed' as result;
