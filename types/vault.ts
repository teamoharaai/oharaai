export type VaultItemType = 'note' | 'link' | 'document' | 'insight' | 'action_update';

export interface Vault {
  id: string;
  ownerId: string;
  goalId: string;
  spaceId: string | null;
  vaultType: 'personal' | 'shared' | 'institutional';
  createdAt: string;
  updatedAt: string;
}

export interface VaultItem {
  id: string;
  vaultId: string;
  itemType: VaultItemType;
  title: string | null;
  content: string | null;
  metadata: {
    url?: string;
    annotation?: string;
    fileType?: string;
    aiConfidence?: number;
    confirmed?: boolean;
    tags?: string[];
  };
  visibility: 'private' | 'vault_members' | 'public';
  createdBy: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  embedding?: number[] | null;
  embedding_text?: string | null;
  embedding_model?: string | null;
}

export interface CreateVaultItemInput {
  itemType: VaultItemType;
  title: string;
  content?: string | null;
  metadata?: VaultItem['metadata'];
}
