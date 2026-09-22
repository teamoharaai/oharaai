\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000081'),('00000000-0000-4000-8000-000000000082'),('00000000-0000-4000-8000-000000000083');
insert into public.friend_connections(requester_id,addressee_id,status,responded_at) values
 ('00000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000082','accepted',now());
insert into public.goals(id,user_id,title,category) values
 ('10000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000081','Visibility fixture','Work & Money');
insert into public.vaults(id,user_id,goal_id) values
 ('20000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000081');
insert into public.vault_items(vault_id,created_by,item_type,title,content) values
 ('20000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000081','note','PRIVATE TITLE','PRIVATE BODY');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
select public.set_goal_visibility_v2('10000000-0000-4000-8000-000000000081','circle',array['00000000-0000-4000-8000-000000000082'::uuid]);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000082',true);
do $$ declare invite uuid; payload jsonb; begin
 if public.get_viewable_goal('10000000-0000-4000-8000-000000000081') is not null then raise exception 'Pending viewer got access'; end if;
 select id into invite from public.goal_share_invites where goal_id='10000000-0000-4000-8000-000000000081' and status='pending';
 perform public.respond_to_goal_invite(invite,'accepted');
 payload := public.get_viewable_goal('10000000-0000-4000-8000-000000000081');
 if payload is null then raise exception 'Accepted viewer denied'; end if;
 if payload::text like '%PRIVATE%' or exists(select 1 from public.vault_items) then raise exception 'Vault leak'; end if;
 begin
   perform public.set_goal_visibility_v2('10000000-0000-4000-8000-000000000081','public');
   raise exception 'Viewer changed visibility';
 exception when raise_exception then if sqlerrm='Viewer changed visibility' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
select public.set_goal_visibility_v2('10000000-0000-4000-8000-000000000081','private');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000082',true);
do $$ begin
 if public.get_viewable_goal('10000000-0000-4000-8000-000000000081') is not null then raise exception 'Revoked viewer still sees Goal'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
select public.set_goal_visibility_v2('10000000-0000-4000-8000-000000000081','public');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000082',true);
do $$ begin
 if public.get_viewable_goal('10000000-0000-4000-8000-000000000081') is null then raise exception 'Friend public view denied'; end if;
 if exists(select 1 from public.vault_items) then raise exception 'Public Vault leak'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000083',true);
do $$ begin
 if public.get_viewable_goal('10000000-0000-4000-8000-000000000081') is not null then raise exception 'Public broadened beyond friends'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
select public.set_goal_visibility_v2('10000000-0000-4000-8000-000000000081','circle',array['00000000-0000-4000-8000-000000000082'::uuid]);
select public.set_goal_visibility_v2('10000000-0000-4000-8000-000000000081','public');
select public.set_goal_visibility_v2('10000000-0000-4000-8000-000000000081','private');
rollback;
