import type { VaultItem } from '@/types/vault';

/** Sticky Note identity is explicit; item_type and metadata are never guessed. */
export function isStickyVaultItem(
  item: Pick<VaultItem, 'contentKind'>,
): boolean {
  return item.contentKind === 'sticky_note';
}

/** Sources are reference material, never note-like Vault content. */
export function isSourceVaultItem(
  item: Pick<VaultItem, 'itemType' | 'contentKind'>,
): boolean {
  return item.contentKind !== 'sticky_note'
    && (item.itemType === 'link' || item.itemType === 'document');
}
