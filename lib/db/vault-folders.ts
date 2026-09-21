import type { SupabaseClient } from '@supabase/supabase-js';
import supabase from './client';
import type { VaultNoteFolder } from '@/types/vault';

type DbClient = SupabaseClient;

// Moderate guardrails (not a product cap; raise here if needed). The DB also
// enforces one folder name per vault (case-insensitive, migration 065).
export const MAX_FOLDERS_PER_VAULT = 30;
export const MAX_FOLDER_NAME_LENGTH = 40;
export const MAX_BULK_MOVE_NOTES = 100;

// ── DB row types ──────────────────────────────────────────────────────────────

type DbVaultNoteFolderRow = {
  id: string;
  vault_id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const FOLDER_COLUMNS = 'id, vault_id, user_id, name, sort_order, created_at, updated_at';

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapFolder(row: DbVaultNoteFolderRow): VaultNoteFolder {
  return {
    id: row.id,
    vaultId: row.vault_id,
    userId: row.user_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Service functions ─────────────────────────────────────────────────────────

/** Lists a vault's Sticky Note folders (General is the virtual NULL bucket, not
 *  a row, so it is never returned here). Ordered by sort_order then name. */
export async function getFoldersForVault(
  vaultId: string,
  client: DbClient = supabase,
): Promise<VaultNoteFolder[]> {
  const { data, error } = await client
    .from('vault_note_folders')
    .select(FOLDER_COLUMNS)
    .eq('vault_id', vaultId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as unknown as DbVaultNoteFolderRow[] ?? []).map(mapFolder);
}

export async function countFoldersForVault(
  vaultId: string,
  client: DbClient = supabase,
): Promise<number> {
  const { count, error } = await client
    .from('vault_note_folders')
    .select('id', { count: 'exact', head: true })
    .eq('vault_id', vaultId);

  if (error) throw error;
  return count ?? 0;
}

export async function createFolder(
  vaultId: string,
  userId: string,
  name: string,
  client: DbClient = supabase,
): Promise<VaultNoteFolder> {
  const { data, error } = await client
    .from('vault_note_folders')
    .insert({ vault_id: vaultId, user_id: userId, name })
    .select(FOLDER_COLUMNS)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create folder');
  return mapFolder(data as unknown as DbVaultNoteFolderRow);
}

export async function getFolderByIdForVault(
  folderId: string,
  vaultId: string,
  client: DbClient = supabase,
): Promise<VaultNoteFolder | null> {
  const { data, error } = await client
    .from('vault_note_folders')
    .select(FOLDER_COLUMNS)
    .eq('id', folderId)
    .eq('vault_id', vaultId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapFolder(data as unknown as DbVaultNoteFolderRow) : null;
}

export async function renameFolder(
  folderId: string,
  name: string,
  client: DbClient = supabase,
): Promise<VaultNoteFolder> {
  const { data, error } = await client
    .from('vault_note_folders')
    .update({ name })
    .eq('id', folderId)
    .select(FOLDER_COLUMNS)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to rename folder');
  return mapFolder(data as unknown as DbVaultNoteFolderRow);
}

// Persists a new folder ordering by writing each folder's index to sort_order.
// Scoped to the vault so a caller can only reorder folders in a vault they own
// (RLS also enforces ownership). Silently ignores ids not in this vault.
export async function reorderFolders(
  vaultId: string,
  orderedIds: readonly string[],
  client: DbClient = supabase,
): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      client
        .from('vault_note_folders')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('vault_id', vaultId),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

// Plain delete. The vault_items.folder_id FK is ON DELETE SET NULL (migration
// 065), so the folder's notes atomically fall back to General — no reassign RPC.
export async function deleteFolder(
  folderId: string,
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await client
    .from('vault_note_folders')
    .delete()
    .eq('id', folderId);

  if (error) throw error;
}

// Reassigns a set of note items to a folder (or General when folderId is null).
// Scoped to the vault + note item_type so a caller can only touch their own
// vault's notes; the target folder is validated to belong to the same vault by
// the API layer before this runs. Returns the number of rows moved.
export async function moveNotesToFolder(
  vaultId: string,
  noteIds: readonly string[],
  folderId: string | null,
  client: DbClient = supabase,
): Promise<number> {
  if (noteIds.length === 0) return 0;
  const { data, error } = await client
    .from('vault_items')
    .update({ folder_id: folderId })
    .eq('vault_id', vaultId)
    .eq('item_type', 'note')
    .in('id', noteIds as string[])
    .select('id');

  if (error) throw error;
  return (data as unknown as { id: string }[] ?? []).length;
}
