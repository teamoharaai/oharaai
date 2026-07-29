import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ENTRY_CONTENT_MAX_LENGTH,
  ENTRY_TITLE_MAX_LENGTH,
  canSubmitEntry,
  isPersistedEntryStatus,
  migrateEchoDraftsByContext,
  normalizeEntrySubmission,
} from './composer-state.ts';

test('entry submission requires both a title and content', () => {
  assert.equal(canSubmitEntry({ title: '', content: 'Body' }), false);
  assert.equal(canSubmitEntry({ title: 'Title', content: '' }), false);
  assert.equal(canSubmitEntry({ title: '   ', content: 'Body' }), false);
  assert.equal(canSubmitEntry({ title: 'Title', content: '   ' }), false);
  assert.equal(canSubmitEntry({ title: 'Title', content: 'Body' }), true);
});

test('entry submission enforces client length bounds and saving lock', () => {
  assert.equal(
    canSubmitEntry({ title: 'T'.repeat(ENTRY_TITLE_MAX_LENGTH + 1), content: 'Body' }),
    false,
  );
  assert.equal(
    canSubmitEntry({ title: 'Title', content: 'B'.repeat(ENTRY_CONTENT_MAX_LENGTH + 1) }),
    false,
  );
  assert.equal(canSubmitEntry({ title: 'Title', content: 'Body' }, true), false);
});

test('entry submission trims both required fields', () => {
  assert.deepEqual(
    normalizeEntrySubmission({ title: '  A title  ', content: '\n  Body text  \n' }),
    { title: 'A title', content: 'Body text' },
  );
});

test('only confirmed persistence outcomes close and clear the composer', () => {
  assert.equal(isPersistedEntryStatus('saved'), true);
  assert.equal(isPersistedEntryStatus('saved_without_summary'), true);
  assert.equal(isPersistedEntryStatus('rate_limited'), true);
  assert.equal(isPersistedEntryStatus('offline'), false);
  assert.equal(isPersistedEntryStatus('unconfirmed'), false);
});

test('legacy body-only drafts migrate without losing content', () => {
  assert.deepEqual(
    migrateEchoDraftsByContext({
      global: 'Legacy body',
      'goal:123': { title: 'Goal title', content: 'Goal body' },
      invalid: 42,
    }),
    {
      global: { title: '', content: 'Legacy body' },
      'goal:123': { title: 'Goal title', content: 'Goal body' },
    },
  );
});
