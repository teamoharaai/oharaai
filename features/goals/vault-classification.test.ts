import assert from 'node:assert/strict';
import test from 'node:test';
import { isSourceVaultItem, isStickyVaultItem } from './vault-classification.ts';

test('explicit sticky_note content kind identifies a Sticky Note', () => {
  assert.equal(isStickyVaultItem({ contentKind: 'sticky_note' }), true);
});

test('generic Vault notes are never inferred as Sticky Notes', () => {
  assert.equal(isStickyVaultItem({ contentKind: 'generic' }), false);
});

test('Sources contain reference material and exclude every note-like item', () => {
  assert.equal(isSourceVaultItem({ itemType: 'link', contentKind: 'generic' }), true);
  assert.equal(isSourceVaultItem({ itemType: 'document', contentKind: 'generic' }), true);
  assert.equal(isSourceVaultItem({ itemType: 'note', contentKind: 'generic' }), false);
  assert.equal(isSourceVaultItem({ itemType: 'note', contentKind: 'sticky_note' }), false);
});
