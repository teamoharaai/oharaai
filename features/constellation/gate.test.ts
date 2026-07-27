import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseDashboardSummary,
  toConstellationGateSuccess,
} from './gate.ts';

test('Constellation onboarding access requires both dashboard activity thresholds', () => {
  assert.equal(
    toConstellationGateSuccess({ goalCount: 3, echoCount: 9 }).accessEligible,
    false,
  );
  assert.equal(
    toConstellationGateSuccess({ goalCount: 3, echoCount: 10 }).accessEligible,
    true,
  );
});

test('dashboard onboarding counts never infer graph data', () => {
  assert.equal(
    toConstellationGateSuccess({ goalCount: 99, echoCount: 99 }).hasGraphData,
    null,
  );
});

test('dashboard summary parser rejects invalid count payloads', () => {
  assert.deepEqual(parseDashboardSummary({ goalCount: 2, echoCount: 10 }), {
    goalCount: 2,
    echoCount: 10,
  });
  assert.equal(parseDashboardSummary({ goalCount: -1, echoCount: 10 }), null);
  assert.equal(parseDashboardSummary({ goalCount: 2.5, echoCount: 10 }), null);
  assert.equal(parseDashboardSummary({ goalCount: 2 }), null);
});
