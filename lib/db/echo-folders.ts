import type { SupabaseClient } from '@supabase/supabase-js';
import supabase from './client';
import { createServiceRoleClient } from './service-client';
import type { EchoFolder } from '@/types/echo-folder';

type DbClient = SupabaseClient;

// ── DB row types ──────────────────────────────────────────────────────────────

type DbEchoFolderRow = {
  id: string;
  user_id: string;
  name: string;
  is_general: boolean;
  created_at: string;
  updated_at: string;
};

const FOLDER_COLUMNS = 'id, user_id, name, is_general, created_at, updated_at';

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapFolder(row: DbEchoFolderRow): EchoFolder {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    isGeneral: row.is_general,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function getFoldersForUser(
  userId: string,
  client: DbClient = supabase,
): Promise<EchoFolder[]> {
  const { data, error } = await client
    .from('echo_folders')
    .select(FOLDER_COLUMNS)
    .eq('user_id', userId)
    .order('is_general', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as unknown as DbEchoFolderRow[] ?? []).map(mapFolder);
}

export async function createFolderForUser(
  userId: string,
  name: string,
  client: DbClient = supabase,
): Promise<EchoFolder> {
  const { data, error } = await client
    .from('echo_folders')
    .insert({ user_id: userId, name, is_general: false })
    .select(FOLDER_COLUMNS)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create folder');
  return mapFolder(data as unknown as DbEchoFolderRow);
}

export async function getFolderByIdForUser(
  folderId: string,
  userId: string,
  client: DbClient = supabase,
): Promise<EchoFolder | null> {
  const { data, error } = await client
    .from('echo_folders')
    .select(FOLDER_COLUMNS)
    .eq('id', folderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapFolder(data as unknown as DbEchoFolderRow) : null;
}

export async function renameFolder(
  folderId: string,
  name: string,
  client: DbClient = supabase,
): Promise<EchoFolder> {
  const { data, error } = await client
    .from('echo_folders')
    .update({ name })
    .eq('id', folderId)
    .select(FOLDER_COLUMNS)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to rename folder');
  return mapFolder(data as unknown as DbEchoFolderRow);
}

// Read-only, RLS-scoped lookup of the caller's already-provisioned General
// folder — never creates one. Unlike getOrCreateGeneralFolderId, this is
// safe to call from client-executed code (a plain user-scoped select, same
// "Users can select own echo folders" policy as getFoldersForUser), which is
// exactly why it exists: createEntry()'s container-less save path
// (features/echo/services/echo-service.ts) runs in the browser/app bundle,
// so it cannot call the service-role-only RPC (migration 014) without
// pulling service-client.ts into client-bundled code. Every user's General
// folder is guaranteed to exist by the time they can call createEntry(), via
// the eager profiles-insert trigger (migration 017) — if it's still missing
// (a failed/legacy provisioning), this returns null and the caller should
// skip the container rather than block the save, per the non-blocking
// pattern used elsewhere in this codebase.
export async function getGeneralFolderId(
  userId: string,
  client: DbClient = supabase,
): Promise<string | null> {
  const { data, error } = await client
    .from('echo_folders')
    .select('id')
    .eq('user_id', userId)
    .eq('is_general', true)
    .maybeSingle();

  if (error) throw error;
  return data ? (data as unknown as { id: string }).id : null;
}

// Resolves (lazily creating if needed) the caller's General folder id.
// get_or_create_general_folder() is locked to service_role (migration 014) —
// this always mints its own service-role client rather than accepting one,
// so callers can't accidentally pass an authed/anon client that would just
// fail on the revoked grant. Server-side-only callers (e.g. the folder
// DELETE-reassign route) still use this to guarantee creation; client-side
// callers should use getGeneralFolderId above instead.
export async function getOrCreateGeneralFolderId(userId: string): Promise<string> {
  const serviceDb = createServiceRoleClient();
  const { data, error } = await serviceDb.rpc('get_or_create_general_folder', {
    p_user_id: userId,
  });

  if (error) throw error;
  if (!data) throw new Error('Failed to resolve General folder');
  return data as string;
}

// Wraps delete_folder_reassign() (migration 015): reassigns every entry
// linked to folderId onto generalFolderId, then deletes folderId. Runs as
// one plpgsql transaction — see migration for ownership checks it performs
// internally via auth.uid(). Must be called with an authed (user-session)
// client, not service-role — the function relies on auth.uid().
export async function deleteFolderReassign(
  folderId: string,
  generalFolderId: string,
  client: DbClient,
): Promise<void> {
  const { error } = await client.rpc('delete_folder_reassign', {
    p_folder_id: folderId,
    p_general_folder_id: generalFolderId,
  });

  if (error) throw error;
}

// Wraps delete_folder_with_contents() (migration 015): deletes every entry
// linked to folderId (cascading their links), then deletes folderId. Runs as
// one plpgsql transaction. Must be called with an authed (user-session)
// client — relies on auth.uid().
export async function deleteFolderWithContents(
  folderId: string,
  client: DbClient,
): Promise<void> {
  const { error } = await client.rpc('delete_folder_with_contents', {
    p_folder_id: folderId,
  });

  if (error) throw error;
}
