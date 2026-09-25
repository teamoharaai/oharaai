import { useCallback, useEffect, useState } from 'react';
import { authedFetch } from '@/lib/api/client';
import type { VaultItem } from '@/types/vault';
import type { ProjectVaultItem } from '../types';

export function useProjectVault(projectId: string, initialItems: ProjectVaultItem[] = []) {
  const [items, setItems] = useState<ProjectVaultItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setItems(initialItems), [initialItems]);
  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true); setError(null);
    try {
      const response = await authedFetch(`/api/projects/${projectId}/vault`);
      if (!response.ok) throw new Error('Project Vault could not load');
      const body = await response.json() as { items: ProjectVaultItem[] };
      setItems(body.items);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Project Vault could not load'); }
    finally { setLoading(false); }
  }, [projectId]);
  const addItem = useCallback(async (payload: { itemType: 'note' | 'link'; contentKind?: 'generic' | 'sticky_note'; title?: string; content?: string; metadata?: VaultItem['metadata']; visibility?: 'private' | 'vault_members' }) => {
    const response = await authedFetch(`/api/projects/${projectId}/vault`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error('Project Vault item could not be saved');
    const body = await response.json() as { item: ProjectVaultItem };
    setItems((current) => [body.item, ...current]);
  }, [projectId]);
  const updateItem = useCallback(async (itemId: string, updates: Partial<VaultItem>) => {
    const response = await authedFetch(`/api/vaults/items/${itemId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    if (!response.ok) throw new Error('Vault item could not be updated');
    const body = await response.json() as { item: VaultItem };
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, ...body.item } : item));
  }, []);
  const removeItem = useCallback(async (itemId: string) => {
    const response = await authedFetch(`/api/vaults/items/${itemId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Vault item could not be removed');
    setItems((current) => current.filter((item) => item.id !== itemId));
  }, []);
  return { items, loading, error, refresh, addItem, updateItem, removeItem };
}
