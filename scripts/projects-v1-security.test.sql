\set ON_ERROR_STOP on
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'projects-a@example.com', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'projects-b@example.com', '', now(), now(), now());

insert into public.projects (id, user_id, title) values
  ('a1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Owner A Project'),
  ('b2000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Owner B Project');

do $$
begin
  if (select count(*) from public.vaults where project_id in (
    'a1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000002'
  )) <> 2 then raise exception 'Project Vault auto-creation failed'; end if;

  begin
    insert into public.goals (id, user_id, title, category, project_id)
    values ('a1100000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Cross-owner Goal', 'Health & Fitness', 'b2000000-0000-0000-0000-000000000002');
    raise exception 'Cross-owner Goal association unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'Cross-owner Goal association unexpectedly succeeded' then raise; end if;
  end;

  begin
    insert into public.vaults (user_id, project_id)
    values ('10000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000002');
    raise exception 'Cross-owner Project Vault unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'Cross-owner Project Vault unexpectedly succeeded' then raise; end if;
  end;

  begin
    insert into public.vaults (user_id) values ('10000000-0000-0000-0000-000000000001');
    raise exception 'Parentless Vault unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'Parentless Vault unexpectedly succeeded' then raise; end if;
  end;
end $$;

insert into public.goals (id, user_id, title, category, project_id)
values ('a1200000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Owner A Goal', 'Health & Fitness', 'a1000000-0000-0000-0000-000000000001');

do $$
begin
  begin
    insert into public.vaults (user_id, project_id)
    values ('10000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001');
    raise exception 'Second Project Vault unexpectedly succeeded';
  exception when unique_violation then null;
  end;

  begin
    insert into public.vaults (user_id, goal_id, project_id)
    values (
      '10000000-0000-0000-0000-000000000001',
      'a1200000-0000-0000-0000-000000000001',
      'a1000000-0000-0000-0000-000000000001'
    );
    raise exception 'Two-parent Vault unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'Two-parent Vault unexpectedly succeeded' then raise; end if;
  end;
end $$;

insert into public.vault_items (vault_id, item_type, content_kind, title, content, created_by)
select id, 'note', 'sticky_note', 'Owner private', 'Secret preview', '10000000-0000-0000-0000-000000000001'
from public.vaults where project_id = 'a1000000-0000-0000-0000-000000000001';

update public.projects set status = 'archived'
where id = 'a1000000-0000-0000-0000-000000000001';

do $$
begin
  if not exists (
    select 1 from public.goals
    where id = 'a1200000-0000-0000-0000-000000000001'
      and project_id = 'a1000000-0000-0000-0000-000000000001'
      and status = 'active'
  ) then raise exception 'Project archive changed Goal lifecycle or association'; end if;

  begin
    insert into public.goals (id, user_id, title, category, project_id)
    values ('a1300000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Blocked archive Goal', 'Work & Money', 'a1000000-0000-0000-0000-000000000001');
    raise exception 'Archived Project accepted a new Goal';
  exception when others then
    if sqlerrm = 'Archived Project accepted a new Goal' then raise; end if;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);

do $$
begin
  if exists (
    select 1 from public.vault_items vi join public.vaults v on v.id = vi.vault_id
    where v.project_id = 'a1000000-0000-0000-0000-000000000001'
  ) then raise exception 'Cross-owner Project Vault content leaked'; end if;
  if exists (
    select 1 from public.project_goal_events
    where owner_id = '10000000-0000-0000-0000-000000000001'
  ) then raise exception 'Cross-owner Project activity leaked'; end if;
end $$;

reset role;
rollback;
\echo 'Projects V1.0 database security assertions passed.'
