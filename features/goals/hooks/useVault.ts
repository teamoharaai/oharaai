import { useState, useCallback } from 'react';
import supabase from '@/lib/db/client';
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

  const refresh = useCallback(async () => {
    if (!goalId) return;
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Unauthorized');
        return;
      }
      const res = await fetch(`/api/vaults/${goalId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`Failed to load vault: ${res.status}`);
      const data = await res.json();
      setVaultId(data.vault?.id ?? null);
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vault');
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  const addNote = useCallback(
    async (title: string, content: string) => {
      if (!vaultId) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`/api/vaults/${goalId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ itemType: 'note', title: title.trim() || null, content }),
      });
      if (!res.ok) throw new Error(`Failed to add note: ${res.status}`);
      const { item } = await res.json();
      setItems((prev) => [item, ...prev]);
    },
    [goalId, vaultId],
  );

  const addLink = useCallback(
    async (url: string, annotation?: string) => {
      if (!vaultId) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`/api/vaults/${goalId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ itemType: 'link', title: null, content: null, metadata: { url, annotation } }),
      });
      if (!res.ok) throw new Error(`Failed to add link: ${res.status}`);
      const { item } = await res.json();
      setItems((prev) => [item, ...prev]);
    },
    [goalId, vaultId],
  );

  const updateItem = useCallback(async (itemId: string, updates: Partial<VaultItem>) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch(`/api/vaults/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`Failed to update item: ${res.status}`);
    const { item: updated } = await res.json();
    setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch(`/api/vaults/items/${itemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) throw new Error(`Failed to remove item: ${res.status}`);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  return { vaultId, items, loading, error, refresh, addNote, addLink, updateItem, removeItem };
}
