import assert from 'node:assert/strict';
import test from 'node:test';
import { getConstellationResponsiveLayout } from './responsive.ts';

test('responsive inspector layout preserves the canvas beside a compact rail and replaces it on tablet/narrow widths', () => {
  assert.deepEqual(getConstellationResponsiveLayout(1_280, false), {
    compact: false,
    narrow: false,
  });
  assert.deepEqual(getConstellationResponsiveLayout(1_000, false), {
    compact: true,
    narrow: true,
  });
  assert.deepEqual(getConstellationResponsiveLayout(1_000, true), {
    compact: true,
    narrow: false,
  });
  assert.deepEqual(getConstellationResponsiveLayout(740, true), {
    compact: true,
    narrow: true,
  });
});
