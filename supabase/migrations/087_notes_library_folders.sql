-- Notes Library prelaunch redesign: personal, viewer-specific Note folders.
-- Migration 087 follows the production Echo mirror migration at 086.
--
-- A folder assignment is organization metadata owned by the viewer. It never
-- changes the canonical Entry, its Project/Goal relationships, or its sharing.
-- No assignment row means Unfiled. Deleting a folder cascades only assignment
-- rows, so every affected Note safely returns to Unfiled.

begin;

create table public.note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index note_folders_user_name_unique_idx
  on public.note_folders (user_id, lower(btrim(name)));
create index note_folders_user_sort_idx
  on public.note_folders (user_id, sort_order, created_at);

create trigger note_folders_updated_at
  before update on public.note_folders
  for each row execute function public.handle_updated_at();

create table public.note_folder_assignments (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null references public.entries(id) on delete cascade,
  folder_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_id),
  foreign key (folder_id, user_id)
    references public.note_folders(id, user_id) on delete cascade
);

create index note_folder_assignments_folder_idx
  on public.note_folder_assignments (user_id, folder_id, updated_at desc);

create trigger note_folder_assignments_updated_at
  before update on public.note_folder_assignments
  for each row execute function public.handle_updated_at();

create or replace function public.validate_note_folder_assignment_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.user_id <> auth.uid() then
    raise exception 'Folder assignment owner must be the current user';
  end if;
  if not exists (
    select 1
    from public.entries entry
    where entry.id = new.entry_id
      and entry.entry_type = 'note'
      and entry.archived = false
  ) then
    raise exception 'Accessible active Note not found';
  end if;
  return new;
end;
$$;

create trigger note_folder_assignments_validate_v1
  before insert or update of user_id, entry_id, folder_id
  on public.note_folder_assignments
  for each row execute function public.validate_note_folder_assignment_v1();

alter table public.note_folders enable row level security;
alter table public.note_folder_assignments enable row level security;

create policy "Users can read own Note folders" on public.note_folders
  for select to authenticated using (user_id = auth.uid());
create policy "Users can create own Note folders" on public.note_folders
  for insert to authenticated with check (user_id = auth.uid());
create policy "Users can update own Note folders" on public.note_folders
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can delete own Note folders" on public.note_folders
  for delete to authenticated using (user_id = auth.uid());

create policy "Users can read own visible Note assignments" on public.note_folder_assignments
  for select to authenticated using (
    user_id = auth.uid()
    and exists (
      select 1 from public.entries entry
      where entry.id = note_folder_assignments.entry_id
        and entry.entry_type = 'note'
        and entry.archived = false
    )
  );
create policy "Users can create own visible Note assignments" on public.note_folder_assignments
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.entries entry
      where entry.id = note_folder_assignments.entry_id
        and entry.entry_type = 'note'
        and entry.archived = false
    )
  );
create policy "Users can update own visible Note assignments" on public.note_folder_assignments
  for update to authenticated using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.entries entry
      where entry.id = note_folder_assignments.entry_id
        and entry.entry_type = 'note'
        and entry.archived = false
    )
  );
create policy "Users can delete own Note assignments" on public.note_folder_assignments
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.note_folders, public.note_folder_assignments from anon;
grant select, insert, update, delete on public.note_folders to authenticated;
grant select, insert, update, delete on public.note_folder_assignments to authenticated;
grant select, insert, update, delete on public.note_folders, public.note_folder_assignments to service_role;

revoke all on function public.validate_note_folder_assignment_v1() from public, anon, authenticated;

comment on table public.note_folders is
  'Viewer-owned personal organization for canonical Notes; never grants content access.';
comment on table public.note_folder_assignments is
  'At most one personal folder per viewer and accessible canonical Note; absence means Unfiled.';

commit;
