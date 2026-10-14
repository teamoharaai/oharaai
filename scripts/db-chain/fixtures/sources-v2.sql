\set ON_ERROR_STOP on

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('91000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sources-owner@example.com','',now(),now(),now()),
  ('91000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sources-member@example.com','',now(),now(),now()),
  ('91000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sources-outsider@example.com','',now(),now(),now());

update public.profiles set username='sourcesowner', display_name='Sources Owner' where id='91000000-0000-4000-8000-000000000001';
update public.profiles set username='sourcesmember', display_name='Sources Member' where id='91000000-0000-4000-8000-000000000002';
update public.profiles set username='sourcesoutsider', display_name='Sources Outsider' where id='91000000-0000-4000-8000-000000000003';

insert into public.projects (id,user_id,title,mode)
values ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','Sources Project','team');
insert into public.project_members(project_id,user_id,role)
values ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','member');

insert into public.vault_items(id,vault_id,item_type,content_kind,title,metadata,visibility,created_by)
select '93000000-0000-4000-8000-000000000001',id,'document','generic','Private owner file',
  '{"provider":"web_upload","storagePath":"91000000-0000-4000-8000-000000000001/93000000-0000-4000-8000-000000000001/private.pdf","fileName":"private.pdf","mimeType":"application/pdf","fileSize":120}'::jsonb,
  'private','91000000-0000-4000-8000-000000000001'
from public.vaults where project_id='92000000-0000-4000-8000-000000000001';

insert into public.vault_items(id,vault_id,item_type,content_kind,title,metadata,visibility,created_by)
select '93000000-0000-4000-8000-000000000002',id,'document','generic','Shared owner file',
  '{"provider":"web_upload","storagePath":"91000000-0000-4000-8000-000000000001/93000000-0000-4000-8000-000000000002/shared.pdf","fileName":"shared.pdf","mimeType":"application/pdf","fileSize":240}'::jsonb,
  'vault_members','91000000-0000-4000-8000-000000000001'
from public.vaults where project_id='92000000-0000-4000-8000-000000000001';
