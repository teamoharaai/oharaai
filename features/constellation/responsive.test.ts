import assert from 'node:assert/strict';
import test from 'node:test';
import { getConstellationResponsiveLayout } from './responsive.ts';

test('responsive inspector layout uses the full workspace below the application toolbar', () => {
  assert.deepEqual(getConstellationResponsiveLayout(1_280), {
    compact: false,
    narrow: false,
  });
  assert.deepEqual(getConstellationResponsiveLayout(1_000), {
    compact: true,
    narrow: false,
  });
  assert.deepEqual(getConstellationResponsiveLayout(740), {
    compact: true,
    narrow: true,
  });
});
