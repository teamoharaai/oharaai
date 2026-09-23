import assert from 'node:assert/strict';
import test from 'node:test';
import {
  internalReleaseSessionKey,
  markFeaturePatchesSeen,
  PATCH_LIFETIME_MS,
  selectActiveFeaturePatches,
  unseenFeaturePatches,
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

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-09-23T12:00:00.000Z');
const patch = (id: string, category: string, ageMs: number) => ({ id, category, releasedAt: new Date(now - ageMs).toISOString() });

test('shows one active release for a category', () => {
  assert.deepEqual(selectActiveFeaturePatches([patch('goals-1', 'Goals', DAY)], now).map((item) => item.id), ['goals-1']);
});

test('newest release replaces older release in the same extensible feature category', () => {
  const active = selectActiveFeaturePatches([
    patch('roots-1', 'Roots', 2 * DAY),
    patch('roots-2', 'Roots', DAY),
  ], now);
  assert.deepEqual(active.map((item) => item.id), ['roots-2']);
});

test('expired newest release suppresses its category without falling back', () => {
  const active = selectActiveFeaturePatches([
    patch('home-old', 'Home', 9 * DAY),
    patch('home-newest', 'Home', 8 * DAY),
  ], now);
  assert.deepEqual(active, []);
});

test('selects the newest active release independently for multiple categories', () => {
  const active = selectActiveFeaturePatches([
    patch('goals-1', 'Goals', 3 * DAY),
    patch('goals-2', 'Goals', DAY),
    patch('momentum-1', 'Momentum', 2 * DAY),
    patch('future-1', 'Future Feature', 4 * DAY),
  ], now);
  assert.deepEqual(active.map((item) => item.id), ['goals-2', 'momentum-1', 'future-1']);
});

test('seven-day boundary is active and one millisecond later is expired', () => {
  assert.equal(selectActiveFeaturePatches([patch('boundary', 'Vault', PATCH_LIFETIME_MS)], now).length, 1);
  assert.equal(selectActiveFeaturePatches([patch('expired', 'Vault', PATCH_LIFETIME_MS + 1)], now).length, 0);
});

test('dismissal is per patch ID and a later category release remains eligible', () => {
  const storage = memoryStorage();
  const oldPatch = patch('notes-v1', 'Notes', DAY);
  markFeaturePatchesSeen([oldPatch], storage);
  assert.equal(storage.getItem(internalReleaseSessionKey(oldPatch.id)), 'seen');
  assert.deepEqual(unseenFeaturePatches([oldPatch], storage), []);
  assert.deepEqual(unseenFeaturePatches([patch('notes-v2', 'Notes', 0)], storage).map((item) => item.id), ['notes-v2']);
});
