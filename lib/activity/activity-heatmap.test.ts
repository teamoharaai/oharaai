import assert from 'node:assert/strict';
import test from 'node:test';
import { HEATMAP_INTENSITY_LEVELS, heatmapIntensityLevel } from './activity-heatmap.ts';

test('intensity level: empty is 0, positive is never 0, scales against max', () => {
  assert.equal(heatmapIntensityLevel(0, 5), 0);
  assert.equal(heatmapIntensityLevel(1, 1), HEATMAP_INTENSITY_LEVELS); // max<=1 → full
  assert.equal(heatmapIntensityLevel(1, 4), 1);
  assert.equal(heatmapIntensityLevel(2, 4), 2);
  assert.equal(heatmapIntensityLevel(3, 4), 3);
  assert.equal(heatmapIntensityLevel(4, 4), HEATMAP_INTENSITY_LEVELS);
  assert.equal(heatmapIntensityLevel(99, 4), HEATMAP_INTENSITY_LEVELS); // capped
});
