\set ON_ERROR_STOP on

-- Synthetic aggregate-shaped rows only. No production content or identity is
-- read by this disposable migration scenario.
insert into auth.users(id) values ('00000000-0000-4000-8000-00000000000c');
insert into public.profiles(id,display_name,timezone)
values ('00000000-0000-4000-8000-00000000000c','Fixture','America/New_York');

insert into public.goals(id,user_id,title,status,deadline,previous_goal_id,created_at) values
  ('11000000-0000-4000-8000-00000000000c','00000000-0000-4000-8000-00000000000c','Past deadline','active',now()-interval '2 days',null,now()-interval '30 days'),
  ('12000000-0000-4000-8000-00000000000c','00000000-0000-4000-8000-00000000000c','Phase predecessor','active',now()+interval '10 days',null,now()-interval '40 days'),
  ('13000000-0000-4000-8000-00000000000c','00000000-0000-4000-8000-00000000000c','Phase successor','active',now()+interval '40 days','12000000-0000-4000-8000-00000000000c',now()-interval '1 day'),
  ('14000000-0000-4000-8000-00000000000c','00000000-0000-4000-8000-00000000000c','Current active','active',now()+interval '1 year',null,now()-interval '20 days');

insert into public.trackers(
  id,goal_id,title,type,target_value,target_unit,frequency,current_value,
  is_ai_suggested,sort_order,created_at,updated_at
) values
  ('21000000-0000-4000-8000-00000000000c','11000000-0000-4000-8000-00000000000c','Expired quantity','counter',20,'pages','daily',14,false,0,now()-interval '20 days',now()-interval '1 day'),
  ('22000000-0000-4000-8000-00000000000c','12000000-0000-4000-8000-00000000000c','Same phase definition','habit',null,null,'weekly',1,true,1,now()-interval '35 days',now()-interval '4 days'),
  ('23000000-0000-4000-8000-00000000000c','13000000-0000-4000-8000-00000000000c','Same phase definition','habit',null,null,'weekly',0,false,1,now()-interval '1 day',now()-interval '1 day'),
  ('24000000-0000-4000-8000-00000000000c','14000000-0000-4000-8000-00000000000c','Anytime checklist','checklist',null,null,null,1,false,2,now()-interval '15 days',now()-interval '2 days'),
  ('25000000-0000-4000-8000-00000000000c','14000000-0000-4000-8000-00000000000c','Monthly legacy','counter',0,null,'monthly',3,false,3,now()-interval '10 days',now()-interval '2 days');

insert into public.tracker_logs(id,tracker_id,value,note,logged_at) values
  ('31000000-0000-4000-8000-00000000000c','21000000-0000-4000-8000-00000000000c',4,'Fixture note',now()-interval '3 days'),
  ('32000000-0000-4000-8000-00000000000c','22000000-0000-4000-8000-00000000000c',1,null,now()-interval '8 days'),
  ('33000000-0000-4000-8000-00000000000c','23000000-0000-4000-8000-00000000000c',1,null,now()-interval '1 day');

insert into public.action_logs(id,goal_id,user_id,action_text,status,due_date,completed_at,created_at) values
  ('41000000-0000-4000-8000-00000000000c','14000000-0000-4000-8000-00000000000c','00000000-0000-4000-8000-00000000000c','Pending legacy action','pending',current_date+1,null,now()-interval '2 days'),
  ('42000000-0000-4000-8000-00000000000c','14000000-0000-4000-8000-00000000000c','00000000-0000-4000-8000-00000000000c','Completed legacy action','complete',current_date-1,now()-interval '1 day',now()-interval '2 days'),
  ('43000000-0000-4000-8000-00000000000c','11000000-0000-4000-8000-00000000000c','00000000-0000-4000-8000-00000000000c','Skipped legacy action','skipped',null,null,now()-interval '4 days');
