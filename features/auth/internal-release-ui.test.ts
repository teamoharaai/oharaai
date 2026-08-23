import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  INTERNAL_RELEASE_NOTES,
  SHOW_INTERNAL_RELEASE_NOTES,
} from '../../config/internal-release.ts';

const rootLayout = readFileSync(resolve(process.cwd(), 'app/_layout.tsx'), 'utf8');
const modal = readFileSync(
  resolve(process.cwd(), 'components/layout/InternalReleaseNotesModal.tsx'),
  'utf8',
);

test('keeps the internal release concise, versioned, and controlled by one flag', () => {
  assert.equal(SHOW_INTERNAL_RELEASE_NOTES, true);
  assert.equal(INTERNAL_RELEASE_NOTES.version, 'OHARA Momentum Version 1.1');
  assert.equal(INTERNAL_RELEASE_NOTES.sections.flatMap((section) => section.updates).length, 8);
  assert.match(rootLayout, /SHOW_INTERNAL_RELEASE_NOTES/);
  assert.equal((rootLayout.match(/<InternalReleaseNotesModal/g) ?? []).length, 1);
});

test('release dialog exposes X, Escape, backdrop, focus trap, and title semantics', () => {
  assert.match(modal, /Close what's new/);
  assert.match(modal, /event\.key === 'Escape'/);
  assert.match(modal, /event\.key !== 'Tab'/);
  assert.match(modal, /previousFocus\?\.focus\(\)/);
  assert.match(modal, /closeOnBackdropPress/);
  assert.match(modal, /'aria-modal': true/);
  assert.match(modal, /role: 'dialog'/);
  assert.match(modal, /'aria-labelledby': titleId/);
});
