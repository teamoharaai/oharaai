import type { VaultItem } from '@/types/vault';

/** Sticky Note identity is explicit; item_type and metadata are never guessed. */
export function isStickyVaultItem(
  item: Pick<VaultItem, 'contentKind'>,
): boolean {
  return item.contentKind === 'sticky_note';
}
