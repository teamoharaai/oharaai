import { useState, useCallback, useRef } from 'react';
import supabase from '@/lib/db/client';
import {
  getVaultWithItems,
  createVaultItem,
  updateVaultItem,
  deleteVaultItem,
} from '@/lib/db/vaults';
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
  // userId cached on first refresh; used for all subsequent mutations
  const userIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!goalId) return;
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      userIdRef.current = session?.user?.id ?? null;

      const data = await getVaultWithItems(goalId);
      setVaultId(data?.vault?.id ?? null);
      setItems(data?.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vault');
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  const addNote = useCallback(
    async (title: string, content: string) => {
      if (!vaultId || !userIdRef.current) return;
      const item = await createVaultItem(vaultId, {
        vaultId,
        itemType: 'note',
        title: title.trim() || null,
        content,
        metadata: {},
        visibility: 'private',
        createdBy: userIdRef.current,
        sortOrder: 0,
      });
      setItems((prev) => [item, ...prev]);
    },
    [vaultId],
  );

  const addLink = useCallback(
    async (url: string, annotation?: string) => {
      if (!vaultId || !userIdRef.current) return;
      const item = await createVaultItem(vaultId, {
        vaultId,
        itemType: 'link',
        title: null,
        content: null,
        metadata: { url, annotation },
        visibility: 'private',
        createdBy: userIdRef.current,
        sortOrder: 0,
      });
      setItems((prev) => [item, ...prev]);
    },
    [vaultId],
  );

  const updateItem = useCallback(async (itemId: string, updates: Partial<VaultItem>) => {
    const updated = await updateVaultItem(itemId, updates);
    setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    await deleteVaultItem(itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  return { vaultId, items, loading, error, refresh, addNote, addLink, updateItem, removeItem };
}
