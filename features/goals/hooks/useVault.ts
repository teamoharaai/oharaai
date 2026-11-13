import { useState, useCallback, useEffect, useRef } from 'react';
import { authedFetch } from '@/lib/api/client';
import type { VaultItem } from '@/types/vault';

type UseVaultResult = {
  vaultId: string | null;
  items: VaultItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addNote: (title: string, content: string) => Promise<void>;
  addLink: (url: string, annotation?: string) => Promise<void>;
  updateItem: (itemId: string, updates: Partial<VaultItem>) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
};

export function useVault(goalId: string): UseVaultResult {
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const scope = useRef(0);
  const parent = useRef<string | null>(goalId);
  useEffect(() => {
    parent.current = goalId;
    setItems([]); setVaultId(null); setError(null); setLoading(false);
    return () => { request.current++; scope.current++; parent.current = null; };
  }, [goalId]);

  function acceptMutation(startedIn: number) {
    if (parent.current !== goalId || scope.current !== startedIn) return false;
    // An older GET must not resurrect a deleted Source or revert an edit.
    request.current++; setLoading(false);
    return true;
  }

  const refresh = useCallback(async () => {
    if (!goalId) return;
    const generation = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(`/api/vaults/${goalId}`);
      if (!res.ok) throw new Error(`Failed to load vault: ${res.status}`);
      const data = await res.json();
      if (generation !== request.current) return;
      setVaultId(data.vault?.id ?? null);
      setItems(data.items ?? []);
    } catch (e) {
      if (generation === request.current) setError(e instanceof Error ? e.message : 'Failed to load vault');
    } finally {
      if (generation === request.current) setLoading(false);
    }
  }, [goalId]);

  const addNote = useCallback(
    async (title: string, content: string) => {
      const startedIn = scope.current;
      if (!vaultId) return;
      const res = await authedFetch(`/api/vaults/${goalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: 'note', contentKind: 'generic', title: title.trim() || null, content }),
      });
      if (!res.ok) throw new Error(`Failed to add note: ${res.status}`);
      const { item } = await res.json();
      if (acceptMutation(startedIn)) setItems((prev) => [item, ...prev.filter((existing) => existing.id !== item.id)]);
    },
    [goalId, vaultId],
  );

  const addLink = useCallback(
    async (url: string, annotation?: string) => {
      const startedIn = scope.current;
      if (!vaultId) return;
      const res = await authedFetch(`/api/vaults/${goalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: 'link', title: null, content: null, metadata: { url, annotation } }),
      });
      if (!res.ok) throw new Error(`Failed to add link: ${res.status}`);
      const { item } = await res.json();
      if (acceptMutation(startedIn)) setItems((prev) => [item, ...prev.filter((existing) => existing.id !== item.id)]);
    },
    [goalId, vaultId],
  );

  const updateItem = useCallback(async (itemId: string, updates: Partial<VaultItem>) => {
    const startedIn = scope.current;
    const res = await authedFetch(`/api/vaults/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`Failed to update item: ${res.status}`);
    const { item: updated } = await res.json();
    if (acceptMutation(startedIn)) setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
  }, [goalId]);

  const removeItem = useCallback(async (itemId: string) => {
    const startedIn = scope.current;
    const res = await authedFetch(`/api/vaults/items/${itemId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to remove item: ${res.status}`);
    if (acceptMutation(startedIn)) setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, [goalId]);

  return { vaultId, items, loading, error, refresh, addNote, addLink, updateItem, removeItem };
}
