-- Migration 066: harden vault_note_folders write policies (migration 065).
--
-- 065's INSERT/UPDATE policies only checked `user_id = auth.uid()`. Because a
-- folder is vault-scoped, that let a user create/repoint a folder row pointing
-- at a vault they do not own (an inert but junk row, reachable via raw PostgREST
-- even though the API never does it). Tighten the write policies to also require
-- ownership of the referenced vault, so a folder can only ever live in a vault
-- the caller owns. SELECT/DELETE stay owner-scoped by user_id (unchanged).

drop policy "Users can insert own note folders" on public.vault_note_folders;
create policy "Users can insert own note folders" on public.vault_note_folders
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.vaults v
      where v.id = vault_id and v.user_id = auth.uid()
    )
  );

drop policy "Users can update own note folders" on public.vault_note_folders;
create policy "Users can update own note folders" on public.vault_note_folders
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.vaults v
      where v.id = vault_id and v.user_id = auth.uid()
    )
  );
