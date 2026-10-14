-- Sources V2.0: first-class private files, images, and links on the canonical
-- Vault item model. Uploaded bytes live in a private bucket and are readable
-- only when the corresponding Vault item is visible to the current viewer.

begin;

alter table public.vault_items
  drop constraint if exists vault_items_item_type_check;

alter table public.vault_items
  add constraint vault_items_item_type_check
  check (item_type in ('note','link','document','image','insight','action_update'));

-- A parentless personal Vault is the durable landing zone for Sources when a
-- Goal or Project container is deleted. Goal and Project Vaults remain
-- mutually exclusive and keep their existing unique indexes.
alter table public.vaults
  drop constraint if exists vaults_exactly_one_parent_check;
alter table public.vaults
  add constraint vaults_at_most_one_parent_check
  check ((goal_id is not null)::integer + (project_id is not null)::integer <= 1);

create unique index if not exists vaults_personal_unlinked_user_unique_idx
  on public.vaults (user_id)
  where goal_id is null and project_id is null;

create or replace function public.validate_vault_parent_owner_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_parent_owner uuid;
begin
  if new.goal_id is not null and new.project_id is not null then
    raise exception 'Vault cannot belong to both a Goal and Project';
  end if;
  if new.goal_id is null and new.project_id is null then
    if new.vault_type <> 'personal' then raise exception 'An unlinked Vault must be personal'; end if;
    return new;
  end if;
  if new.goal_id is not null then
    select g.user_id into v_parent_owner from public.goals g where g.id = new.goal_id;
  else
    select p.user_id into v_parent_owner from public.projects p where p.id = new.project_id;
  end if;
  if v_parent_owner is null or v_parent_owner <> new.user_id then
    raise exception 'Vault owner must match its parent owner';
  end if;
  return new;
end;
$$;

create or replace function public.preserve_sources_before_vault_delete_v2()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_creator uuid;
  v_personal_vault uuid;
begin
  for v_creator in
    select distinct created_by from public.vault_items
    where vault_id = old.id
      and item_type in ('link','document','image')
  loop
    insert into public.vaults (user_id, goal_id, project_id, vault_type)
    values (v_creator, null, null, 'personal')
    on conflict (user_id) where goal_id is null and project_id is null do nothing;
    select id into v_personal_vault from public.vaults
      where user_id = v_creator and goal_id is null and project_id is null;
    update public.vault_items
      set vault_id = v_personal_vault, visibility = 'private'
      where vault_id = old.id and created_by = v_creator
        and item_type in ('link','document','image');
  end loop;
  return old;
end;
$$;

drop trigger if exists vaults_preserve_sources_v2 on public.vaults;
create trigger vaults_preserve_sources_v2
before delete on public.vaults
for each row execute function public.preserve_sources_before_vault_delete_v2();

revoke all on function public.preserve_sources_before_vault_delete_v2() from public, anon, authenticated;

create or replace function public.preserve_departing_member_sources_v2()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_personal_vault uuid;
begin
  if old.role = 'owner' then return old; end if;
  if not exists (
    select 1 from public.vault_items vi
    join public.vaults v on v.id = vi.vault_id
    left join public.goals g on g.id = v.goal_id
    where vi.created_by = old.user_id
      and vi.item_type in ('link','document','image')
      and coalesce(v.project_id, g.project_id) = old.project_id
  ) then return old; end if;

  insert into public.vaults (user_id, goal_id, project_id, vault_type)
  values (old.user_id, null, null, 'personal')
  on conflict (user_id) where goal_id is null and project_id is null do nothing;
  select id into v_personal_vault from public.vaults
    where user_id = old.user_id and goal_id is null and project_id is null;
  update public.vault_items vi
    set vault_id = v_personal_vault, visibility = 'private'
    from public.vaults v left join public.goals g on g.id = v.goal_id
    where vi.vault_id = v.id
      and vi.created_by = old.user_id
      and vi.item_type in ('link','document','image')
      and coalesce(v.project_id, g.project_id) = old.project_id;
  return old;
end;
$$;

drop trigger if exists project_members_preserve_sources_v2 on public.project_members;
create trigger project_members_preserve_sources_v2
before delete on public.project_members
for each row execute function public.preserve_departing_member_sources_v2();

revoke all on function public.preserve_departing_member_sources_v2() from public, anon, authenticated;

create or replace function public.validate_source_v2_metadata()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_path text := nullif(btrim(new.metadata->>'storagePath'), '');
  v_provider text := nullif(btrim(new.metadata->>'provider'), '');
  v_url text := nullif(btrim(new.metadata->>'url'), '');
begin
  if new.item_type not in ('link', 'document', 'image') then
    return new;
  end if;

  if v_provider is not null and v_provider not in ('upload','web_upload','ios_files','ios_photos','link') then
    raise exception 'Invalid Source provider';
  end if;

  if new.item_type = 'link' then
    if v_url is null or v_url !~* '^https?://' then
      raise exception 'Source link must use http or https';
    end if;
    if v_path is not null then
      raise exception 'Link Sources cannot reference uploaded storage';
    end if;
  elsif v_path is not null then
    if split_part(v_path, '/', 1) <> new.created_by::text then
      raise exception 'Source storage path must be owned by its creator';
    end if;
    if v_path ~* '\.(exe|dll|dmg|pkg|app|apk|bat|cmd|com|msi|scr|sh|ps1|jar)$' then
      raise exception 'Unsafe Source file type';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists vault_items_validate_source_v2 on public.vault_items;
create trigger vault_items_validate_source_v2
before insert or update of item_type, metadata, created_by on public.vault_items
for each row execute function public.validate_source_v2_metadata();

revoke all on function public.validate_source_v2_metadata() from public, anon, authenticated;

create index if not exists vault_items_source_storage_path_idx
  on public.vault_items ((metadata->>'storagePath'))
  where item_type in ('document','image') and metadata ? 'storagePath';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sources',
  'sources',
  false,
  26214400,
  array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authorized viewers can read Source files" on storage.objects;
create policy "Authorized viewers can read Source files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'sources'
    and exists (
      select 1
      from public.vault_items vi
      join public.vaults v on v.id = vi.vault_id
      left join public.goals g on g.id = v.goal_id
      where vi.item_type in ('document','image')
        and vi.metadata->>'storagePath' = storage.objects.name
        and (
          vi.created_by = auth.uid()
          or v.user_id = auth.uid()
          or (
            vi.visibility = 'vault_members'
            and public.is_project_member_v11(coalesce(v.project_id, g.project_id), auth.uid())
          )
        )
    )
  );

drop policy if exists "Users can upload own Source files" on storage.objects;
create policy "Users can upload own Source files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name !~* '\.(exe|dll|dmg|pkg|app|apk|bat|cmd|com|msi|scr|sh|ps1|jar)$'
  );

drop policy if exists "Users can delete own Source files" on storage.objects;
create policy "Users can delete own Source files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

comment on column public.vault_items.metadata is
  'Source V2 metadata may include provider, storagePath, fileName, mimeType, fileSize, width, height, url, and annotation. Uploaded Source paths are creator-scoped and private.';

commit;
