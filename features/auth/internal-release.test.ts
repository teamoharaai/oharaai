import assert from 'node:assert/strict';
import test from 'node:test';
import {
  internalReleaseSessionKey,
  shouldShowInternalReleaseForAuthEvent,
  type SessionStorageLike,
} from './internal-release.ts';

function memoryStorage(): SessionStorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

test('shows once for SIGNED_IN and ignores refresh, route, focus, and token events', () => {
  const storage = memoryStorage();
  const releaseId = 'notes-v1';
  assert.equal(shouldShowInternalReleaseForAuthEvent('INITIAL_SESSION', releaseId, true, storage), false);
  assert.equal(shouldShowInternalReleaseForAuthEvent('SIGNED_IN', releaseId, true, storage), true);
  assert.equal(shouldShowInternalReleaseForAuthEvent('SIGNED_IN', releaseId, true, storage), false);
  assert.equal(shouldShowInternalReleaseForAuthEvent('TOKEN_REFRESHED', releaseId, true, storage), false);
  assert.equal(shouldShowInternalReleaseForAuthEvent('USER_UPDATED', releaseId, true, storage), false);
  assert.equal(storage.getItem(internalReleaseSessionKey(releaseId)), 'shown');
});

test('logout clears the session guard so an explicit login shows again', () => {
  const storage = memoryStorage();
  assert.equal(shouldShowInternalReleaseForAuthEvent('SIGNED_IN', 'notes-v1', true, storage), true);
  assert.equal(shouldShowInternalReleaseForAuthEvent('SIGNED_OUT', 'notes-v1', true, storage), false);
  assert.equal(shouldShowInternalReleaseForAuthEvent('SIGNED_IN', 'notes-v1', true, storage), true);
});

test('feature flag disables the modal without leaving stale logout state', () => {
  const storage = memoryStorage();
  assert.equal(shouldShowInternalReleaseForAuthEvent('SIGNED_IN', 'notes-v1', false, storage), false);
  storage.setItem(internalReleaseSessionKey('notes-v1'), 'shown');
  shouldShowInternalReleaseForAuthEvent('SIGNED_OUT', 'notes-v1', false, storage);
  assert.equal(storage.getItem(internalReleaseSessionKey('notes-v1')), null);
});
