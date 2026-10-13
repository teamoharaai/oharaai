-- 090 probe: Project deletion may unlink a Goal without trying to retain a
-- foreign key to the Project being deleted. Explicit detach still records its
-- ordinary history event. The release runner rolls all synthetic rows back.

insert into auth.users (id, email, raw_user_meta_data)
values ('11a00e2e-8090-4090-8090-000000000001', 'parent-delete-owner@local.ohara.test', '{}');

insert into public.projects (id, user_id, title, mode) values
  ('11a00e2e-8090-4090-8090-000000000010', '11a00e2e-8090-4090-8090-000000000001', 'Deleted parent probe', 'personal'),
  ('11a00e2e-8090-4090-8090-000000000011', '11a00e2e-8090-4090-8090-000000000001', 'Explicit detach probe', 'personal');

insert into public.goals (id, user_id, title, category, project_id)
values (
  '11a00e2e-8090-4090-8090-000000000020',
  '11a00e2e-8090-4090-8090-000000000001',
  'Parent deletion Goal',
  'Work & Money',
  '11a00e2e-8090-4090-8090-000000000010'
);

delete from public.projects where id = '11a00e2e-8090-4090-8090-000000000010';

do $$ begin
  if not exists (
    select 1 from public.goals
    where id = '11a00e2e-8090-4090-8090-000000000020' and project_id is null
  ) then raise exception '090 probe: deleting a Project did not preserve and unlink its Goal'; end if;
  if exists (
    select 1 from public.project_goal_events
    where goal_id = '11a00e2e-8090-4090-8090-000000000020' and event_type = 'detached'
  ) then raise exception '090 probe: parent deletion wrote a synthetic detach event'; end if;
end $$;

update public.goals
set project_id = '11a00e2e-8090-4090-8090-000000000011'
where id = '11a00e2e-8090-4090-8090-000000000020';
update public.goals
set project_id = null
where id = '11a00e2e-8090-4090-8090-000000000020';

do $$ begin
  if not exists (
    select 1 from public.project_goal_events
    where goal_id = '11a00e2e-8090-4090-8090-000000000020'
      and prior_project_id = '11a00e2e-8090-4090-8090-000000000011'
      and event_type = 'detached'
  ) then raise exception '090 probe: explicit detach history was not recorded'; end if;
end $$;

delete from auth.users where id = '11a00e2e-8090-4090-8090-000000000001';

do $$ begin
  if exists (select 1 from public.goals where id = '11a00e2e-8090-4090-8090-000000000020')
     or exists (select 1 from public.projects where id = '11a00e2e-8090-4090-8090-000000000011') then
    raise exception '090 probe: synthetic rows survived cleanup';
  end if;
end $$;
