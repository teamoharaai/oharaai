\set ON_ERROR_STOP on

begin;

do $$ begin
  if (select public from storage.buckets where id='sources') is distinct from false then raise exception 'Sources bucket is not private'; end if;
  if (select file_size_limit from storage.buckets where id='sources') <> 26214400 then raise exception 'Sources bucket size limit changed'; end if;
end $$;

insert into storage.objects(bucket_id,name,owner) values
  ('sources','91000000-0000-4000-8000-000000000001/93000000-0000-4000-8000-000000000001/private.pdf','91000000-0000-4000-8000-000000000001'),
  ('sources','91000000-0000-4000-8000-000000000001/93000000-0000-4000-8000-000000000002/shared.pdf','91000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);

do $$ begin
  if (select count(*) from public.vault_items where id in ('93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002')) <> 1 then
    raise exception 'Member Source metadata privacy leaked or shared Source missing';
  end if;
  if exists(select 1 from public.vault_items where id='93000000-0000-4000-8000-000000000001') then raise exception 'Private Source metadata leaked'; end if;
  if (select count(*) from storage.objects where bucket_id='sources') <> 1 then raise exception 'Member Source storage privacy leaked or shared object missing'; end if;
end $$;

insert into storage.objects(bucket_id,name,owner) values
  ('sources','91000000-0000-4000-8000-000000000002/93000000-0000-4000-8000-000000000003/member.png','91000000-0000-4000-8000-000000000002');
insert into public.vault_items(id,vault_id,item_type,content_kind,title,metadata,visibility,created_by)
select '93000000-0000-4000-8000-000000000003',id,'image','generic','Member image',
  '{"provider":"ios_photos","storagePath":"91000000-0000-4000-8000-000000000002/93000000-0000-4000-8000-000000000003/member.png","fileName":"member.png","mimeType":"image/png","fileSize":360}'::jsonb,
  'vault_members','91000000-0000-4000-8000-000000000002'
from public.vaults where project_id='92000000-0000-4000-8000-000000000001';

do $$ begin
  begin
    insert into storage.objects(bucket_id,name,owner) values
      ('sources','91000000-0000-4000-8000-000000000002/bad/virus.exe','91000000-0000-4000-8000-000000000002');
    raise exception 'Unsafe executable upload was accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.vault_items(vault_id,item_type,content_kind,title,metadata,visibility,created_by)
    select id,'document','generic','Wrong path','{"provider":"ios_files","storagePath":"91000000-0000-4000-8000-000000000001/wrong/file.pdf","fileName":"file.pdf"}'::jsonb,'vault_members','91000000-0000-4000-8000-000000000002'
    from public.vaults where project_id='92000000-0000-4000-8000-000000000001';
    raise exception 'Cross-owner Source storage path was accepted';
  exception when raise_exception then
    if sqlerrm='Cross-owner Source storage path was accepted' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$ begin
  if exists(select 1 from public.vault_items where id in ('93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000003')) then raise exception 'Outsider Source metadata leaked'; end if;
  if exists(select 1 from storage.objects where bucket_id='sources') then raise exception 'Outsider Source object leaked'; end if;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select public.remove_project_member_v11('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002');
do $$ begin
  if exists(select 1 from public.vault_items where id='93000000-0000-4000-8000-000000000003') then raise exception 'Departed member Source remained in Project projection'; end if;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$ begin
  if not exists(select 1 from public.vault_items vi join public.vaults v on v.id=vi.vault_id where vi.id='93000000-0000-4000-8000-000000000003' and vi.visibility='private' and v.goal_id is null and v.project_id is null and v.user_id=auth.uid()) then raise exception 'Departing member did not retain their Source privately'; end if;
  if exists(select 1 from public.vault_items where id='93000000-0000-4000-8000-000000000002') then raise exception 'Departing member retained owner shared Source access'; end if;
  if not exists(select 1 from storage.objects where bucket_id='sources' and name like '%/member.png') then raise exception 'Departing member lost their uploaded Source object'; end if;
  if exists(select 1 from storage.objects where bucket_id='sources' and name like '%/shared.pdf') then raise exception 'Departing member retained owner Source object access'; end if;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
delete from public.projects where id='92000000-0000-4000-8000-000000000001';
do $$ begin
  if (select count(*) from public.vault_items vi join public.vaults v on v.id=vi.vault_id where vi.id in ('93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002') and vi.visibility='private' and v.goal_id is null and v.project_id is null and v.user_id=auth.uid()) <> 2 then raise exception 'Project deletion did not preserve owner Sources privately'; end if;
  if (select count(*) from storage.objects where bucket_id='sources') <> 2 then raise exception 'Owner uploaded Source objects were not preserved'; end if;
end $$;

do $$ begin
  begin
    insert into public.vault_items(vault_id,item_type,content_kind,title,metadata,visibility,created_by)
    select id,'link','generic','Unsafe link','{"provider":"link","url":"javascript:alert(1)"}'::jsonb,'private','91000000-0000-4000-8000-000000000001'
    from public.vaults where user_id='91000000-0000-4000-8000-000000000001' and goal_id is null and project_id is null;
    raise exception 'Unsafe Source URL was accepted';
  exception when raise_exception then
    if sqlerrm='Unsafe Source URL was accepted' then raise; end if;
  end;
end $$;

rollback;

select 'Sources V2 private storage, metadata RLS, removal, and parent-deletion preservation assertions passed.' as result;
