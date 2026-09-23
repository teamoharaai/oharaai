export type VaultItemType = 'note' | 'link' | 'document' | 'insight' | 'action_update';
export type VaultContentKind = 'generic' | 'sticky_note';

export interface Vault {
  id: string;
  ownerId: string;
  goalId: string | null;
  projectId: string | null;
  spaceId: string | null;
  vaultType: 'personal' | 'shared' | 'institutional';
  createdAt: string;
  updatedAt: string;
}

/** Per-goal (per-Vault) Sticky Note folder (migration 065). Owner-private.
 *  A note-type VaultItem with `folderId == null` is the virtual "General" folder. */
export interface VaultNoteFolder {
  id: string;
  vaultId: string;
  userId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface VaultItem {
  id: string;
  vaultId: string;
  itemType: VaultItemType;
  /** Explicit semantic classification; never infer Sticky Notes from itemType. */
  contentKind: VaultContentKind;
  title: string | null;
  content: string | null;
  /** Sticky Note folder (vault_note_folders, migration 065). `null` = General.
   *  Only note-type items use this; other item types leave it null. */
  folderId?: string | null;
  metadata: {
    url?: string;
    annotation?: string;
    fileType?: string;
    aiConfidence?: number;
    confirmed?: boolean;
    tags?: string[];
    /** Storage path of an attached photo (goal-note-photos bucket). Set on
     *  note items migrated from / created as sticky notes (migration 062). */
    photoUrl?: string;
    /** Provenance for the goal_notes -> vault_items unification (migration 062). */
    migratedFrom?: string;
    legacyId?: string;
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
  contentKind?: VaultContentKind;
  title: string;
  content?: string | null;
  metadata?: VaultItem['metadata'];
}
