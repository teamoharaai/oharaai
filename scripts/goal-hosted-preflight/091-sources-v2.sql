-- 091 probe: Sources use a private bucket, RLS-visible canonical Vault rows,
-- and preserve creator-owned reference material when Project membership ends.
-- The release runner always rolls these synthetic rows back.

do $$ begin
  if (select public from storage.buckets where id = 'sources') is distinct from false then
    raise exception '091 probe: Sources bucket is not private';
  end if;
  if (select file_size_limit from storage.buckets where id = 'sources') <> 26214400 then
    raise exception '091 probe: Sources bucket size limit changed';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Authorized viewers can read Source files'
  ) then raise exception '091 probe: signed Source reads are not protected by storage RLS'; end if;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11a00e2e-8091-4091-8091-000000000001', 'sources-owner@local.ohara.test', '{}'),
  ('11a00e2e-8091-4091-8091-000000000002', 'sources-member@local.ohara.test', '{}'),
  ('11a00e2e-8091-4091-8091-000000000003', 'sources-outsider@local.ohara.test', '{}');

insert into public.projects (id, user_id, title, mode)
values ('11a00e2e-8091-4091-8091-000000000010', '11a00e2e-8091-4091-8091-000000000001', 'Sources probe', 'team');
insert into public.project_members (project_id, user_id, role)
values ('11a00e2e-8091-4091-8091-000000000010', '11a00e2e-8091-4091-8091-000000000002', 'member');

insert into public.vault_items (id, vault_id, item_type, content_kind, title, metadata, visibility, created_by)
select '11a00e2e-8091-4091-8091-000000000020', id, 'image', 'generic', 'Shared Source probe',
  '{"provider":"ios_photos","storagePath":"11a00e2e-8091-4091-8091-000000000002/11a00e2e-8091-4091-8091-000000000020/photo.png","fileName":"photo.png","mimeType":"image/png","fileSize":100}'::jsonb,
  'vault_members', '11a00e2e-8091-4091-8091-000000000002'
from public.vaults where project_id = '11a00e2e-8091-4091-8091-000000000010';

insert into storage.objects (bucket_id, name, owner)
values ('sources', '11a00e2e-8091-4091-8091-000000000002/11a00e2e-8091-4091-8091-000000000020/photo.png', '11a00e2e-8091-4091-8091-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11a00e2e-8091-4091-8091-000000000002', true);
do $$ begin
  if not exists (select 1 from public.vault_items where id = '11a00e2e-8091-4091-8091-000000000020') then
    raise exception '091 probe: authorized member cannot read Source metadata';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'sources') then
    raise exception '091 probe: authorized member cannot read Source object';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '11a00e2e-8091-4091-8091-000000000003', true);
do $$ begin
  if exists (select 1 from public.vault_items where id = '11a00e2e-8091-4091-8091-000000000020') then
    raise exception '091 probe: outsider can read Source metadata';
  end if;
  if exists (select 1 from storage.objects where bucket_id = 'sources' and name like '%/photo.png') then
    raise exception '091 probe: outsider can read Source object';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '11a00e2e-8091-4091-8091-000000000001', true);
select public.remove_project_member_v11('11a00e2e-8091-4091-8091-000000000010', '11a00e2e-8091-4091-8091-000000000002');

select set_config('request.jwt.claim.sub', '11a00e2e-8091-4091-8091-000000000002', true);
do $$ begin
  if not exists (
    select 1 from public.vault_items vi join public.vaults v on v.id = vi.vault_id
    where vi.id = '11a00e2e-8091-4091-8091-000000000020'
      and vi.visibility = 'private' and v.user_id = auth.uid()
      and v.goal_id is null and v.project_id is null
  ) then raise exception '091 probe: departing member Source was not preserved privately'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'sources' and name like '%/photo.png') then
    raise exception '091 probe: departing member lost Source object access';
  end if;
end $$;

reset role;

do $$ begin
  begin
    insert into public.vault_items (vault_id, item_type, content_kind, title, metadata, visibility, created_by)
    select id, 'document', 'generic', 'Unsafe path probe',
      '{"provider":"web_upload","storagePath":"11a00e2e-8091-4091-8091-000000000001/bad/virus.exe","fileName":"virus.exe"}'::jsonb,
      'private', '11a00e2e-8091-4091-8091-000000000001'
    from public.vaults where user_id = '11a00e2e-8091-4091-8091-000000000002'
      and goal_id is null and project_id is null;
    raise exception '091 probe: unsafe Source extension was accepted';
  exception when raise_exception then
    if sqlerrm = '091 probe: unsafe Source extension was accepted' then raise; end if;
  end;
end $$;
