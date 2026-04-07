import type { SupabaseClient } from '@supabase/supabase-js';
import supabase from './client';
import type { Vault, VaultItem, VaultItemType } from '@/types/vault';

// Re-export canonical type so existing imports of `VaultItem` from this module still resolve.
export type { VaultItem };

type DbClient = SupabaseClient;

// ── DB row types ──────────────────────────────────────────────────────────────

type DbVaultRow = {
  id: string;
  user_id: string;
  goal_id: string;
  space_id: string | null;
  vault_type: 'personal' | 'shared' | 'institutional';
  created_at: string;
  updated_at: string;
};

type DbVaultItemRow = {
  id: string;
  vault_id: string;
  item_type: string;
  title: string | null;
  content: string | null;
  metadata: Record<string, unknown>;
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
    spaceId: row.space_id,
    vaultType: row.vault_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVaultItem(row: DbVaultItemRow): VaultItem {
  return {
    id: row.id,
    vaultId: row.vault_id,
    itemType: row.item_type as VaultItemType,
    title: row.title,
    content: row.content,
    metadata: row.metadata as VaultItem['metadata'],
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
    .select('id, user_id, goal_id, space_id, vault_type, created_at, updated_at')
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
    .select('id, user_id, goal_id, space_id, vault_type, created_at, updated_at')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapVault(data as unknown as DbVaultRow);
}

export async function getVaultItems(
  vaultId: string,
  client: DbClient = supabase,
): Promise<VaultItem[]> {
  const { data, error } = await client
    .from('vault_items')
    .select('id, vault_id, item_type, title, content, metadata, visibility, created_by, sort_order, created_at, updated_at')
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
    .select('id, vault_id, item_type, title, content, metadata, visibility, created_by, sort_order, created_at, updated_at')
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
  const { data, error } = await client
    .from('vault_items')
    .insert({
      vault_id: vaultId,
      item_type: item.itemType,
      title: item.title,
      content: item.content,
      metadata: item.metadata,
      visibility: item.visibility,
      created_by: item.createdBy,
      sort_order: item.sortOrder,
    })
    .select('id, vault_id, item_type, title, content, metadata, visibility, created_by, sort_order, created_at, updated_at')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create vault item');
  return mapVaultItem(data as unknown as DbVaultItemRow);
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
    .select('id, vault_id, item_type, title, content, metadata, visibility, created_by, sort_order, created_at, updated_at')
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
    .select('id, vault_id, item_type, title, content, metadata, visibility, created_by, sort_order, created_at, updated_at')
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

// ── Legacy helpers (used by app/goals/[id]/vault.tsx and index.tsx) ───────────

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
  const { error } = await client.from('vault_items').insert({
    vault_id: vaultId,
    item_type: 'note',
    content,
    created_by: userId,
    visibility: 'private',
    sort_order: 0,
    metadata: {},
  });

  if (error) throw new Error(error.message);
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
