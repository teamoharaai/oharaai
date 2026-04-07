import supabase from './client';

export interface VaultItem {
  id: string;
  item_type: string;
  title: string | null;
  content: string | null;
  created_at: string;
}

/**
 * Returns the vault id for a goal, creating the vault if it does not exist.
 * Lookup chain: goal_id → vaults.goal_id → vaults.id
 */
export async function getOrCreateVault(goalId: string, userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('vaults')
    .select('id')
    .eq('goal_id', goalId)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from('vaults')
    .insert({ goal_id: goalId, user_id: userId, vault_type: 'personal' })
    .select('id')
    .single();

  if (error || !created) throw new Error(error?.message ?? 'Failed to create vault');
  return created.id as string;
}

/**
 * Fetches vault items ordered newest-first.
 * Lookup chain: vaults.id → vault_items.vault_id
 */
export async function getVaultItems(vaultId: string): Promise<VaultItem[]> {
  const { data, error } = await supabase
    .from('vault_items')
    .select('id, item_type, title, content, created_at')
    .eq('vault_id', vaultId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as VaultItem[];
}

/**
 * Counts vault items for a goal by following goal_id → vaults.id → vault_items.vault_id.
 */
export async function getVaultItemCount(goalId: string): Promise<number> {
  const { data: vault, error: vaultError } = await supabase
    .from('vaults')
    .select('id')
    .eq('goal_id', goalId)
    .maybeSingle();

  if (vaultError) throw new Error(vaultError.message);
  if (!vault) return 0;

  const { count, error } = await supabase
    .from('vault_items')
    .select('id', { count: 'exact', head: true })
    .eq('vault_id', vault.id);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Inserts a note-type vault item.
 */
export async function addVaultItem(
  vaultId: string,
  userId: string,
  content: string,
): Promise<void> {
  const { error } = await supabase.from('vault_items').insert({
    vault_id: vaultId,
    item_type: 'note',
    content,
    created_by: userId,
    visibility: 'private',
    sort_order: 0,
  });

  if (error) throw new Error(error.message);
}
