import assert from 'node:assert/strict';
import test from 'node:test';
import { createConstellationGradientIds } from './svg-ids.ts';

test('each canvas paint-server namespace is unique and safe for SVG URL references', () => {
  const first = createConstellationGradientIds(':R1:');
  const second = createConstellationGradientIds(':R2:');

  assert.notEqual(first.mixedEdge, second.mixedEdge);
  assert.equal(first.mixedEdge, 'constellation-R1-edge-mixed');
  assert.ok(Object.values(first).every((id) => /^[a-zA-Z0-9_-]+$/.test(id)));
});
