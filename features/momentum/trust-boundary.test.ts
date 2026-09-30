import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiPath = decodeURIComponent(new URL('../../app/api/momentum/index+api.ts', import.meta.url).pathname);
const goalApiPath = decodeURIComponent(new URL('../../app/api/momentum/goals/[goalId]+api.ts', import.meta.url).pathname);
const recalculateApiPath = decodeURIComponent(new URL('../../app/api/momentum/recalculate+api.ts', import.meta.url).pathname);
const servicePath = decodeURIComponent(new URL('./services/momentum-service.ts', import.meta.url).pathname);

test('Momentum reads are projection-only and trusted recalculation derives both V1 metrics', async () => {
  const [api, goalApi, recalculateApi, service] = await Promise.all([
    readFile(apiPath, 'utf8'), readFile(goalApiPath, 'utf8'),
    readFile(recalculateApiPath, 'utf8'), readFile(servicePath, 'utf8'),
  ]);
  for (const route of [api, goalApi]) {
    assert.doesNotMatch(route, /createServiceRoleClient\(\)/);
    assert.doesNotMatch(route, /recalculateMomentumV11Summary/);
    assert.doesNotMatch(route, /request\.json\(\)/);
    assert.doesNotMatch(route, /searchParams\.get\(['"](?:score|hash|reason|userId)/);
  }
  assert.match(api, /getMomentumHomeSummary\(readDb, auth\.userId\)/);
  assert.match(goalApi, /readPublishedMomentumV11Summary\(readDb, auth\.userId\)/);
  assert.match(recalculateApi, /createServiceRoleClient\(\)/);
  assert.match(recalculateApi, /claim_momentum_recalculation_v1/);
  assert.match(recalculateApi, /recalculateMomentumV11Summary\(readDb, writeDb, auth\.userId\)/);
  assert.match(recalculateApi, /publishCurrentMomentumV11Summary/);
  assert.match(recalculateApi, /release_momentum_recalculation_v1/);
  assert.match(service, /calculateGoalMomentum\(normalizedInput\)/);
  assert.match(service, /calculateOharaMomentum\(normalizedInput\)/);
  assert.match(service, /calculationScope: 'provisional'/);
  assert.match(service, /calculationHash\(/);
  assert.match(service, /p_user_id: userId/);
  assert.match(service, /p_reason_codes: result\.reasonCodes/);
  assert.match(service, /\.eq\('user_id', userId\)/);
  assert.doesNotMatch(`${api}\n${recalculateApi}`, /searchParams\.get\(['"]userId/);
});

test('both V1 snapshot publishers remain private service functions', async () => {
  const service = await readFile(servicePath, 'utf8');
  assert.match(service, /async function publishGoalDiagnostic\(/);
  assert.match(service, /async function publishOharaDiagnostic\(/);
  assert.doesNotMatch(service, /export async function publish(?:Goal|Ohara)Diagnostic\(/);
});
