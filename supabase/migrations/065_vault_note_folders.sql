-- Migration 065: per-goal folders for Sticky Notes.
--
-- Sticky notes are Vault items (item_type='note', migration 062), one Vault per
-- goal. This adds a lightweight grouping layer scoped to a goal's Vault: a note
-- can belong to one folder, and a note with no folder is "General" (the virtual
-- NULL bucket — we do NOT provision a General row, unlike Echo folders,
-- migration 017).
--
-- Design (see design/sticky-notes-folders/stick_notes_implementation.md):
--   * Folders are per-goal (per-Vault), NOT per-user like echo_folders. A folder
--     belongs to exactly one goal's Vault so folder ⊆ note ⊆ goal boundaries line
--     up; the Sticky Notes panel (rendered per goal) only ever shows this goal's
--     folders.
--   * Assignment is a real FK column on vault_items (folder_id) with ON DELETE
--     SET NULL, so deleting a folder atomically reassigns its notes to General
--     (NULL) — notes are never destroyed and no reassign RPC is needed.
--   * Only note-type items use folder_id; other item types leave it NULL.
--
-- Additive + non-destructive: no existing rows are modified. Owner-scoped RLS
-- mirrors goal_notes / milestones (migration 001 / 058).

create table public.vault_note_folders (
  id         uuid primary key default gen_random_uuid(),
  vault_id   uuid not null references public.vaults(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vault_note_folders enable row level security;

-- Owner-scoped CRUD, matching the goal_notes policy shape (migration 058).
create policy "Users can select own note folders" on public.vault_note_folders
  for select using (user_id = auth.uid());
create policy "Users can insert own note folders" on public.vault_note_folders
  for insert with check (user_id = auth.uid());
create policy "Users can update own note folders" on public.vault_note_folders
  for update using (user_id = auth.uid());
create policy "Users can delete own note folders" on public.vault_note_folders
  for delete using (user_id = auth.uid());

-- One folder name per Vault, case-insensitive (moderate guardrail; the API also
-- caps folders/goal and name length).
create unique index vault_note_folders_vault_name_uniq
  on public.vault_note_folders (vault_id, lower(name));

-- Folders are listed by Vault; index the edge.
create index idx_vault_note_folders_vault
  on public.vault_note_folders (vault_id);

create trigger vault_note_folders_updated_at
  before update on public.vault_note_folders
  for each row execute function public.handle_updated_at();

-- Explicit privileges (migration 039 convention: PostgREST relies on these).
grant select, insert, update, delete on table public.vault_note_folders to authenticated;

comment on table public.vault_note_folders is
  'Per-goal (per-Vault) folders for Sticky Notes. Owner-private. A vault_items '
  'note with folder_id NULL is the virtual "General" folder.';

-- Assignment column on the shared items table. Nullable = General/unfiled.
-- ON DELETE SET NULL reassigns a deleted folder''s notes back to General.
alter table public.vault_items
  add column folder_id uuid null
    references public.vault_note_folders(id) on delete set null;

create index idx_vault_items_folder
  on public.vault_items (folder_id);

comment on column public.vault_items.folder_id is
  'Optional Sticky Note folder (vault_note_folders, migration 065). NULL = '
  'General. Only note-type items use this; other item types leave it NULL.';
