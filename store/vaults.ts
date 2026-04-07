import { create } from 'zustand';
import supabase from '@/lib/db/client';
import type { CreateVaultItemInput, Vault, VaultItem } from '@/types/vault';

interface VaultStore {
  vault: Vault | null;
  items: VaultItem[];
  isLoading: boolean;
  error: string | null;
  fetchVault: (goalId: string) => Promise<void>;
  addItem: (goalId: string, item: CreateVaultItemInput) => Promise<void>;
  updateItem: (itemId: string, updates: Partial<VaultItem>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  confirmInsight: (itemId: string) => Promise<void>;
  dismissInsight: (itemId: string) => Promise<void>;
}

type ApiErrorBody = {
  error?: string;
};

type FetchVaultResponse = {
  vault: Vault;
  items: VaultItem[];
};

type VaultItemResponse = {
  item: VaultItem;
};

type DeleteVaultItemResponse = {
  success: boolean;
};

type UpdateVaultItemRequest = {
  title?: string | null;
  content?: string | null;
  metadata?: VaultItem['metadata'];
};

async function getAuthSession(): Promise<{ accessToken: string; userId: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  const userId = session?.user?.id;

  if (!accessToken || !userId) {
    throw new Error('Not authenticated');
  }

  return { accessToken, userId };
}

async function parseApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  let body: T | ApiErrorBody | null = null;

  try {
    body = (await response.json()) as T | ApiErrorBody;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : fallbackMessage;

    throw new Error(message);
  }

  if (!body) {
    throw new Error(fallbackMessage);
  }

  return body as T;
}

function createTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildOptimisticItem(
  tempId: string,
  vaultId: string | null,
  userId: string,
  item: CreateVaultItemInput,
): VaultItem {
  const timestamp = new Date().toISOString();

  return {
    id: tempId,
    vaultId: vaultId ?? '',
    itemType: item.itemType,
    title: item.title,
    content: item.content ?? null,
    metadata: item.metadata ?? {},
    visibility: 'private',
    createdBy: userId,
    sortOrder: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function mergeVaultItem(currentItem: VaultItem, updates: Partial<VaultItem>): VaultItem {
  return {
    ...currentItem,
    ...(updates.vaultId !== undefined ? { vaultId: updates.vaultId } : {}),
    ...(updates.itemType !== undefined ? { itemType: updates.itemType } : {}),
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.content !== undefined ? { content: updates.content } : {}),
    ...(updates.metadata !== undefined ? { metadata: updates.metadata } : {}),
    ...(updates.visibility !== undefined ? { visibility: updates.visibility } : {}),
    ...(updates.createdBy !== undefined ? { createdBy: updates.createdBy } : {}),
    ...(updates.sortOrder !== undefined ? { sortOrder: updates.sortOrder } : {}),
    ...(updates.createdAt !== undefined ? { createdAt: updates.createdAt } : {}),
    ...(updates.updatedAt !== undefined ? { updatedAt: updates.updatedAt } : {}),
  };
}

function buildUpdateRequest(updates: Partial<VaultItem>): UpdateVaultItemRequest {
  const request: UpdateVaultItemRequest = {};

  if (updates.title !== undefined) {
    request.title = updates.title;
  }

  if (updates.content !== undefined) {
    request.content = updates.content;
  }

  if (updates.metadata !== undefined) {
    request.metadata = updates.metadata;
  }

  return request;
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  vault: null,
  items: [],
  isLoading: false,
  error: null,

  fetchVault: async (goalId) => {
    if (get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const { accessToken } = await getAuthSession();
      const response = await fetch(`/api/vaults/${encodeURIComponent(goalId)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await parseApiResponse<FetchVaultResponse>(response, 'Failed to load vault');

      set({
        vault: data.vault,
        items: data.items,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load vault',
        isLoading: false,
      });
    }
  },

  addItem: async (goalId, item) => {
    const tempId = createTempId();

    try {
      const { accessToken, userId } = await getAuthSession();
      const optimisticItem = buildOptimisticItem(tempId, get().vault?.id ?? null, userId, item);

      set((state) => ({
        error: null,
        items: [optimisticItem, ...state.items],
      }));

      const response = await fetch(`/api/vaults/${encodeURIComponent(goalId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(item),
      });
      const data = await parseApiResponse<VaultItemResponse>(response, 'Failed to add vault item');

      set((state) => ({
        items: state.items.map((existingItem) =>
          existingItem.id === tempId ? data.item : existingItem
        ),
      }));
    } catch (err) {
      set((state) => ({
        error: err instanceof Error ? err.message : 'Failed to add vault item',
        items: state.items.filter((existingItem) => existingItem.id !== tempId),
      }));
    }
  },

  updateItem: async (itemId, updates) => {
    const currentItem = get().items.find((item) => item.id === itemId);

    if (!currentItem) {
      return;
    }

    const optimisticItem = mergeVaultItem(currentItem, updates);

    set((state) => ({
      error: null,
      items: state.items.map((item) => (item.id === itemId ? optimisticItem : item)),
    }));

    try {
      const { accessToken } = await getAuthSession();
      const response = await fetch(`/api/vaults/items/${encodeURIComponent(itemId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(buildUpdateRequest(updates)),
      });
      const data = await parseApiResponse<VaultItemResponse>(
        response,
        'Failed to update vault item',
      );

      set((state) => ({
        items: state.items.map((item) => (item.id === itemId ? data.item : item)),
      }));
    } catch (err) {
      set((state) => ({
        error: err instanceof Error ? err.message : 'Failed to update vault item',
        items: state.items.map((item) => (item.id === itemId ? currentItem : item)),
      }));
    }
  },

  deleteItem: async (itemId) => {
    const index = get().items.findIndex((item) => item.id === itemId);

    if (index === -1) {
      return;
    }

    const removedItem = get().items[index];

    set((state) => ({
      error: null,
      items: state.items.filter((item) => item.id !== itemId),
    }));

    try {
      const { accessToken } = await getAuthSession();
      const response = await fetch(`/api/vaults/items/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      await parseApiResponse<DeleteVaultItemResponse>(response, 'Failed to delete vault item');
    } catch (err) {
      set((state) => {
        const items = [...state.items];
        items.splice(index, 0, removedItem);

        return {
          error: err instanceof Error ? err.message : 'Failed to delete vault item',
          items,
        };
      });
    }
  },

  confirmInsight: async (itemId) => {
    const currentItem = get().items.find((item) => item.id === itemId);

    if (!currentItem) {
      return;
    }

    await get().updateItem(itemId, {
      metadata: {
        ...(currentItem.metadata ?? {}),
        confirmed: true,
      },
    });
  },

  dismissInsight: async (itemId) => {
    await get().deleteItem(itemId);
  },
}));
