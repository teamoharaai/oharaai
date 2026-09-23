create role anon nologin;
create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table public.vaults (
  id uuid primary key,
  user_id uuid not null,
  goal_id uuid not null unique
);

create table public.vault_items (
  id uuid primary key,
  vault_id uuid not null references public.vaults(id),
  item_type text not null,
  title text,
  content text,
  metadata jsonb not null default '{}'::jsonb,
  visibility text not null default 'private',
  created_by uuid not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vaults enable row level security;
alter table public.vault_items enable row level security;
grant select, insert, update, delete on public.vaults, public.vault_items to authenticated;

create policy vault_owner_select on public.vaults for select to authenticated
using (user_id = auth.uid());
create policy vault_item_owner_select on public.vault_items for select to authenticated
using (exists (select 1 from public.vaults v where v.id = vault_id and v.user_id = auth.uid()));
create policy vault_item_owner_write on public.vault_items for all to authenticated
using (created_by = auth.uid()) with check (
  created_by = auth.uid()
  and exists (select 1 from public.vaults v where v.id = vault_id and v.user_id = auth.uid())
);

insert into public.vaults(id,user_id,goal_id) values
('10000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','20000000-0000-4000-8000-000000000001'),
('10000000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','20000000-0000-4000-8000-000000000002');

insert into public.vault_items(id,vault_id,item_type,title,metadata,created_by) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','note','Migrated sticky','{"migratedFrom":"goal_notes","legacyId":"legacy-1","photoUrl":"owner/photo.jpg"}','11111111-1111-4111-8111-111111111111'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','note','Generic note','{}','11111111-1111-4111-8111-111111111111'),
('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','note','Ambiguous provenance','{"migratedFrom":"goal_notes"}','11111111-1111-4111-8111-111111111111'),
('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','note','Other owner private','{"migratedFrom":"goal_notes","legacyId":"legacy-2"}','22222222-2222-4222-8222-222222222222');
