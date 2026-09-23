import type { SupabaseClient } from '@supabase/supabase-js';
import supabase from './client';
import type { Vault, VaultContentKind, VaultItem, VaultItemType } from '@/types/vault';
import { buildVaultItemEmbeddingText } from '@/lib/ai/embedding-text';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { EMBEDDING_MODEL } from '@/lib/ai/constants';

// Re-export canonical type so existing imports of `VaultItem` from this module still resolve.
export type { VaultItem };

type DbClient = SupabaseClient;

// ── DB row types ──────────────────────────────────────────────────────────────

type DbVaultRow = {
  id: string;
  user_id: string;
  goal_id: string | null;
  project_id: string | null;
  space_id: string | null;
  vault_type: 'personal' | 'shared' | 'institutional';
  created_at: string;
  updated_at: string;
};

type DbVaultItemRow = {
  id: string;
  vault_id: string;
  item_type: string;
  content_kind: string;
  title: string | null;
  content: string | null;
  metadata: Record<string, unknown>;
  folder_id: string | null;
  visibility: 'private' | 'vault_members' | 'public';
  created_by: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapVault(row: DbVaultRow): Vault {
  return {
    id: row.id,
    ownerId: row.user_id,
    goalId: row.goal_id,
    projectId: row.project_id,
    spaceId: row.space_id,
    vaultType: row.vault_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapVaultItem(row: DbVaultItemRow): VaultItem {
  return {
    id: row.id,
    vaultId: row.vault_id,
    itemType: row.item_type as VaultItemType,
    contentKind: row.content_kind as VaultContentKind,
    title: row.title,
    content: row.content,
    metadata: row.metadata as VaultItem['metadata'],
    folderId: row.folder_id,
    visibility: row.visibility,
    createdBy: row.created_by,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildVaultItemUpdate(updates: Partial<VaultItem>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (updates.itemType !== undefined) result.item_type = updates.itemType;
  if (updates.title !== undefined) result.title = updates.title;
  if (updates.content !== undefined) result.content = updates.content;
  if (updates.metadata !== undefined) result.metadata = updates.metadata;
  if (updates.folderId !== undefined) result.folder_id = updates.folderId;
  if (updates.visibility !== undefined) result.visibility = updates.visibility;
  if (updates.sortOrder !== undefined) result.sort_order = updates.sortOrder;
  return result;
}

// ── Canonical functions (new service API) ─────────────────────────────────────

export async function getVaultByGoalId(
  goalId: string,
  client: DbClient = supabase,
): Promise<Vault | null> {
  const { data, error } = await client
    .from('vaults')
    .select('id, user_id, goal_id, project_id, space_id, vault_type, created_at, updated_at')
    .eq('goal_id', goalId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapVault(data as unknown as DbVaultRow);
}

export async function getVaultByGoalIdForUser(
  goalId: string,
  userId: string,
  client: DbClient = supabase,
): Promise<Vault | null> {
  const { data, error } = await client
    .from('vaults')
    .select('id, user_id, goal_id, project_id, space_id, vault_type, created_at, updated_at')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapVault(data as unknown as DbVaultRow);
}

/**
 * Returns the user's vault for a goal, creating it on first access if missing.
 *
 * Vaults are auto-created at goal creation only when a `vaultContext` is
 * supplied (see lib/db/goals.ts), so goals created through the normal flow —
 * and every goal predating the Vault feature — have no vault row. This lazily
 * mints the singleton vault so the "one vault per goal" contract holds on read.
 *
 * Returns `null` only when the goal does not belong to the user (a genuine
 * 404), never merely because the vault row was absent.
 */
export async function getOrCreateVaultForUser(
  goalId: string,
  userId: string,
  client: DbClient = supabase,
): Promise<Vault | null> {
  const existing = await getVaultByGoalIdForUser(goalId, userId, client);
  if (existing) return existing;

  // No vault yet — confirm the goal is the user's before minting one, so a
  // caller can't create a vault against a goal they don't own.
  const { data: goal, error: goalError } = await client
    .from('goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', userId)
    .maybeSingle();

  if (goalError) throw goalError;
  if (!goal) return null;

  const { data: created, error } = await client
    .from('vaults')
    .insert({ goal_id: goalId, user_id: userId, vault_type: 'personal' })
    .select('id, user_id, goal_id, project_id, space_id, vault_type, created_at, updated_at')
    .single();

  if (created) return mapVault(created as unknown as DbVaultRow);

  // A concurrent request (e.g. two focus-effect refreshes) may have inserted
  // first — unique(goal_id) rejects the loser with 23505. That's not an error
  // for us: re-read the row the winner created.
  if (error?.code === '23505') {
    const raced = await getVaultByGoalIdForUser(goalId, userId, client);
    if (raced) return raced;
  }

  throw new Error(error?.message ?? 'Failed to create vault');
}

export async function getOrCreateProjectVaultForUser(
  projectId: string,
  userId: string,
  client: DbClient = supabase,
): Promise<Vault | null> {
  const selection = 'id, user_id, goal_id, project_id, space_id, vault_type, created_at, updated_at';
  const { data: existing, error: existingError } = await client
    .from('vaults')
    .select(selection)
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return mapVault(existing as unknown as DbVaultRow);

  const { data: project, error: projectError } = await client
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) return null;

  const { data: created, error } = await client
    .from('vaults')
    .insert({ project_id: projectId, user_id: userId, vault_type: 'personal' })
    .select(selection)
    .single();
  if (created) return mapVault(created as unknown as DbVaultRow);
  if (error?.code === '23505') {
    const { data: raced } = await client.from('vaults').select(selection)
      .eq('project_id', projectId).eq('user_id', userId).maybeSingle();
    if (raced) return mapVault(raced as unknown as DbVaultRow);
  }
  throw new Error(error?.message ?? 'Failed to create Project Vault');
}

export async function getVaultItems(
  vaultId: string,
  client: DbClient = supabase,
): Promise<VaultItem[]> {
  const { data, error } = await client
    .from('vault_items')
    .select('id, vault_id, item_type, content_kind, title, content, metadata, folder_id, visibility, created_by, sort_order, created_at, updated_at')
    .eq('vault_id', vaultId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as unknown as DbVaultItemRow[] ?? []).map(mapVaultItem);
}

export async function getVaultItemsByType(
  vaultId: string,
  itemType: VaultItemType,
  client: DbClient = supabase,
): Promise<VaultItem[]> {
  const { data, error } = await client
    .from('vault_items')
    .select('id, vault_id, item_type, content_kind, title, content, metadata, folder_id, visibility, created_by, sort_order, created_at, updated_at')
    .eq('vault_id', vaultId)
    .eq('item_type', itemType)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as unknown as DbVaultItemRow[] ?? []).map(mapVaultItem);
}

export async function createVaultItem(
  vaultId: string,
  item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>,
  client: DbClient = supabase,
): Promise<VaultItem> {
  const embeddingText = buildVaultItemEmbeddingText(item.content);

  const { data, error } = await client
    .from('vault_items')
    .insert({
      vault_id: vaultId,
      item_type: item.itemType,
      content_kind: item.contentKind,
      title: item.title,
      content: item.content,
      metadata: item.metadata,
      folder_id: item.folderId ?? null,
      visibility: item.visibility,
      created_by: item.createdBy,
      sort_order: item.sortOrder,
      embedding_text: embeddingText,
    })
    .select('id, vault_id, item_type, content_kind, title, content, metadata, folder_id, visibility, created_by, sort_order, created_at, updated_at')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create vault item');
  const vaultItem = mapVaultItem(data as unknown as DbVaultItemRow);

  // Fire-and-forget embedding (non-blocking)
  if (embeddingText) {
    void generateEmbedding(embeddingText, 'document')
      .then(async (vector) => {
        if (vector) {
          await client
            .from('vault_items')
            .update({
              embedding: vector as any, // pgvector accepts number[]
              embedding_model: EMBEDDING_MODEL,
            })
            .eq('id', vaultItem.id);
        }
      })
      .catch((err) => {
        console.error(JSON.stringify({
          event: 'embedding_write_failed',
          table: 'vault_items',
          record_id: vaultItem.id,
          error: err instanceof Error ? err.message : 'unknown',
          timestamp: new Date().toISOString(),
        }));
      });
  }

  return vaultItem;
}

export async function updateVaultItem(
  itemId: string,
  updates: Partial<VaultItem>,
  client: DbClient = supabase,
): Promise<VaultItem> {
  const payload = buildVaultItemUpdate(updates);

  const { data, error } = await client
    .from('vault_items')
    .update(payload)
    .eq('id', itemId)
    .select('id, vault_id, item_type, content_kind, title, content, metadata, folder_id, visibility, created_by, sort_order, created_at, updated_at')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to update vault item');
  return mapVaultItem(data as unknown as DbVaultItemRow);
}

export async function deleteVaultItem(
  itemId: string,
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await client
    .from('vault_items')
    .delete()
    .eq('id', itemId);

  if (error) throw new Error(error.message);
}

export async function getVaultItemByIdForUser(
  itemId: string,
  userId: string,
  client: DbClient = supabase,
): Promise<VaultItem | null> {
  const { data: itemRow, error: itemError } = await client
    .from('vault_items')
    .select('id, vault_id, item_type, content_kind, title, content, metadata, folder_id, visibility, created_by, sort_order, created_at, updated_at')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError) throw itemError;
  if (!itemRow) return null;

  const row = itemRow as unknown as DbVaultItemRow;
  const { data: vaultRow, error: vaultError } = await client
    .from('vaults')
    .select('id')
    .eq('id', row.vault_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (vaultError) throw vaultError;
  if (!vaultRow) return null;

  return mapVaultItem(row);
}

export async function getVaultWithItems(
  goalId: string,
  client: DbClient = supabase,
): Promise<{ vault: Vault; items: VaultItem[] } | null> {
  const vault = await getVaultByGoalId(goalId, client);
  if (!vault) return null;
  const items = await getVaultItems(vault.id, client);
  return { vault, items };
}

// ── Legacy helpers (used by app/(app)/goals/[id]/vault.tsx and index.tsx) ───────────

/**
 * Returns the vault id for a goal, creating the vault if it does not exist.
 * Lookup chain: goal_id → vaults.goal_id → vaults.id
 */
export async function getOrCreateVault(
  goalId: string,
  userId: string,
  client: DbClient = supabase,
): Promise<string> {
  const { data: existing } = await client
    .from('vaults')
    .select('id')
    .eq('goal_id', goalId)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await client
    .from('vaults')
    .insert({ goal_id: goalId, user_id: userId, vault_type: 'personal' })
    .select('id')
    .single();

  if (error || !created) throw new Error(error?.message ?? 'Failed to create vault');
  return created.id as string;
}

/**
 * Inserts a note-type vault item.
 */
export async function addVaultItem(
  vaultId: string,
  userId: string,
  content: string,
  client: DbClient = supabase,
): Promise<void> {
  const embeddingText = buildVaultItemEmbeddingText(content);

  const { data: insertedItem, error } = await client
    .from('vault_items')
    .insert({
      vault_id: vaultId,
      item_type: 'note',
      content,
      created_by: userId,
      visibility: 'private',
      sort_order: 0,
      metadata: {},
      embedding_text: embeddingText,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  // Fire-and-forget embedding (non-blocking)
  if (embeddingText && insertedItem) {
    const itemId = (insertedItem as { id: string }).id;
    void generateEmbedding(embeddingText, 'document')
      .then(async (vector) => {
        if (vector) {
          await client
            .from('vault_items')
            .update({
              embedding: vector as any, // pgvector accepts number[]
              embedding_model: EMBEDDING_MODEL,
            })
            .eq('id', itemId);
        }
      })
      .catch((err) => {
        console.error(JSON.stringify({
          event: 'embedding_write_failed',
          table: 'vault_items',
          record_id: itemId,
          error: err instanceof Error ? err.message : 'unknown',
          timestamp: new Date().toISOString(),
        }));
      });
  }
}

/**
 * Counts vault items for a goal by following goal_id → vaults.id → vault_items.vault_id.
 */
export async function getVaultItemCount(
  goalId: string,
  client: DbClient = supabase,
): Promise<number> {
  const { data: vault, error: vaultError } = await client
    .from('vaults')
    .select('id')
    .eq('goal_id', goalId)
    .maybeSingle();

  if (vaultError) throw new Error(vaultError.message);
  if (!vault) return 0;

  const { count, error } = await client
    .from('vault_items')
    .select('id', { count: 'exact', head: true })
    .eq('vault_id', vault.id);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
