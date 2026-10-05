-- 087 probe: personal Note folders remain viewer-owned organization metadata.
-- A collaborator may file an RLS-visible shared Note, another viewer cannot see
-- that folder or assignment, and deleting the folder preserves the Entry.
-- The release runner rolls this synthetic work back before any production commit.

do $$
declare
  folder_policy_count integer;
  assignment_policy_count integer;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.note_folders'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.note_folder_assignments'::regclass) then
    raise exception '087 probe: Notes folder tables do not enforce RLS';
  end if;

  select count(*) into folder_policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'note_folders';
  select count(*) into assignment_policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'note_folder_assignments';
  if folder_policy_count <> 4 or assignment_policy_count <> 4 then
    raise exception '087 probe: expected four CRUD policies per table, found folders %, assignments %',
      folder_policy_count, assignment_policy_count;
  end if;

  if has_table_privilege('anon', 'public.note_folders', 'select')
     or has_table_privilege('anon', 'public.note_folder_assignments', 'select') then
    raise exception '087 probe: anon can read personal Note organization';
  end if;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11a00e2e-8087-4087-8087-000000000001', 'notes-folder-owner@local.ohara.test', '{}'),
  ('11a00e2e-8087-4087-8087-000000000002', 'notes-folder-member@local.ohara.test', '{}');

insert into public.projects (id, user_id, title, mode)
values (
  '11a00e2e-8087-4087-8087-000000000010',
  '11a00e2e-8087-4087-8087-000000000001',
  'Notes Folder Probe',
  'team'
);
insert into public.project_members (project_id, user_id, role)
values (
  '11a00e2e-8087-4087-8087-000000000010',
  '11a00e2e-8087-4087-8087-000000000002',
  'member'
);
insert into public.entries (id, user_id, entry_type, title, project_id, project_share_scope)
values (
  '11a00e2e-8087-4087-8087-000000000020',
  '11a00e2e-8087-4087-8087-000000000001',
  'note',
  'Shared Note Probe',
  '11a00e2e-8087-4087-8087-000000000010',
  'project'
);

set role authenticated;
select set_config('request.jwt.claim.sub', '11a00e2e-8087-4087-8087-000000000002', false);
insert into public.note_folders (id, user_id, name)
values (
  '11a00e2e-8087-4087-8087-000000000030',
  '11a00e2e-8087-4087-8087-000000000002',
  'Shared research'
);
insert into public.note_folder_assignments (user_id, entry_id, folder_id)
values (
  '11a00e2e-8087-4087-8087-000000000002',
  '11a00e2e-8087-4087-8087-000000000020',
  '11a00e2e-8087-4087-8087-000000000030'
);
do $$
begin
  if not exists (
    select 1 from public.note_folder_assignments
    where user_id = auth.uid()
      and entry_id = '11a00e2e-8087-4087-8087-000000000020'
  ) then
    raise exception '087 probe: collaborator could not file an authorized shared Note';
  end if;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '11a00e2e-8087-4087-8087-000000000001', false);
do $$
begin
  if exists (
    select 1 from public.note_folders
    where id = '11a00e2e-8087-4087-8087-000000000030'
  ) or exists (
    select 1 from public.note_folder_assignments
    where folder_id = '11a00e2e-8087-4087-8087-000000000030'
  ) then
    raise exception '087 probe: one viewer can read another viewer personal organization';
  end if;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '11a00e2e-8087-4087-8087-000000000002', false);
delete from public.note_folders
where id = '11a00e2e-8087-4087-8087-000000000030';
reset role;

do $$
begin
  if exists (
    select 1 from public.note_folder_assignments
    where folder_id = '11a00e2e-8087-4087-8087-000000000030'
  ) then
    raise exception '087 probe: folder deletion did not clear its assignment';
  end if;
  if not exists (
    select 1 from public.entries
    where id = '11a00e2e-8087-4087-8087-000000000020'
  ) then
    raise exception '087 probe: folder deletion removed the canonical Note';
  end if;
end $$;

delete from auth.users
where id in (
  '11a00e2e-8087-4087-8087-000000000001',
  '11a00e2e-8087-4087-8087-000000000002'
);
do $$
begin
  if exists (
    select 1 from public.projects
    where id = '11a00e2e-8087-4087-8087-000000000010'
  ) or exists (
    select 1 from public.entries
    where id = '11a00e2e-8087-4087-8087-000000000020'
  ) then
    raise exception '087 probe: synthetic rows survived account deletion';
  end if;
end $$;
