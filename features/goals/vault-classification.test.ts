import assert from 'node:assert/strict';
import test from 'node:test';
import { isStickyVaultItem } from './vault-classification.ts';

test('explicit sticky_note content kind identifies a Sticky Note', () => {
  assert.equal(isStickyVaultItem({ contentKind: 'sticky_note' }), true);
});

test('generic Vault notes are never inferred as Sticky Notes', () => {
  assert.equal(isStickyVaultItem({ contentKind: 'generic' }), false);
});
