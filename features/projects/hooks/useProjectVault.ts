import { useCallback, useEffect, useRef, useState } from 'react';
import { authedFetch } from '@/lib/api/client';
import type { VaultItem } from '@/types/vault';
import type { ProjectVaultItem } from '../types';

const EMPTY_ITEMS: ProjectVaultItem[] = [];

export function useProjectVault(projectId: string, initialItems: ProjectVaultItem[] = EMPTY_ITEMS) {
  const [items, setItems] = useState<ProjectVaultItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const scope = useRef(0);
  const parent = useRef<string | null>(projectId);
  useEffect(() => { parent.current = projectId; return () => { request.current++; scope.current++; parent.current = null; }; }, [projectId]);
  function acceptMutation(startedIn: number) {
    if (parent.current !== projectId || scope.current !== startedIn) return false;
    request.current++; setLoading(false);
    return true;
  }
  // A fresh parent projection replaces the previous read result, including its
  // local failure. Parent partialErrors still represent failed hydration.
  useEffect(() => { request.current++; setItems(initialItems); setError(null); setLoading(false); }, [initialItems, projectId]);
  const refresh = useCallback(async () => {
    if (!projectId) return;
    const generation = ++request.current;
    setLoading(true); setError(null);
    try {
      const response = await authedFetch(`/api/projects/${projectId}/vault`);
      if (!response.ok) { const payload = await response.json().catch(() => null) as { error?: string } | null; throw new Error(payload?.error ?? `Project Vault could not load (${response.status})`); }
      const body = await response.json() as { items: ProjectVaultItem[] };
      if (generation === request.current) setItems(body.items);
    } catch (caught) { if (generation === request.current) setError(caught instanceof Error ? caught.message : 'Project Vault could not load.'); }
    finally { if (generation === request.current) setLoading(false); }
  }, [projectId]);
  const addItem = useCallback(async (payload: { itemType: 'note' | 'link' | 'document' | 'image'; contentKind?: 'generic' | 'sticky_note'; title?: string; content?: string; metadata?: VaultItem['metadata']; visibility?: 'private' | 'vault_members' }) => {
    const startedIn = scope.current;
    const response = await authedFetch(`/api/projects/${projectId}/vault`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) { const result = await response.json().catch(() => null) as { error?: string } | null; throw new Error(result?.error ?? `Project Vault item could not be saved (${response.status})`); }
    const body = await response.json() as { item: ProjectVaultItem };
    if (acceptMutation(startedIn)) setItems((current) => [body.item, ...current.filter((item) => item.id !== body.item.id)]);
  }, [projectId]);
  const updateItem = useCallback(async (itemId: string, updates: Partial<VaultItem>) => {
    const startedIn = scope.current;
    const response = await authedFetch(`/api/vaults/items/${itemId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    if (!response.ok) throw new Error('Vault item could not be updated.');
    const body = await response.json() as { item: VaultItem };
    if (acceptMutation(startedIn)) setItems((current) => current.map((item) => item.id === itemId ? { ...item, ...body.item } : item));
  }, [projectId]);
  const removeItem = useCallback(async (itemId: string) => {
    const startedIn = scope.current;
    const response = await authedFetch(`/api/vaults/items/${itemId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Vault item could not be removed.');
    if (acceptMutation(startedIn)) setItems((current) => current.filter((item) => item.id !== itemId));
  }, [projectId]);
  return { items, loading, error, refresh, addItem, updateItem, removeItem };
}
