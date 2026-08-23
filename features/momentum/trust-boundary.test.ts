import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiPath = decodeURIComponent(new URL('../../app/api/momentum/index+api.ts', import.meta.url).pathname);
const goalApiPath = decodeURIComponent(new URL('../../app/api/momentum/goals/[goalId]+api.ts', import.meta.url).pathname);
const servicePath = decodeURIComponent(new URL('./services/momentum-service.ts', import.meta.url).pathname);

test('authenticated requests supply identity only and trusted services derive both V1 metrics', async () => {
  const [api, goalApi, service] = await Promise.all([
    readFile(apiPath, 'utf8'), readFile(goalApiPath, 'utf8'), readFile(servicePath, 'utf8'),
  ]);
  for (const route of [api, goalApi]) {
    assert.match(route, /createServiceRoleClient\(\)/);
    assert.doesNotMatch(route, /request\.json\(\)/);
    assert.doesNotMatch(route, /searchParams\.get\(['"](?:score|hash|reason|userId)/);
  }
  assert.match(api, /getMomentumHomeSummary\(readDb, writeDb, auth\.userId\)/);
  assert.match(goalApi, /getMomentumV11Summary\(readDb, writeDb, auth\.userId\)/);
  assert.match(service, /calculateGoalMomentum\(normalizedInput\)/);
  assert.match(service, /calculateOharaMomentum\(normalizedInput\)/);
  assert.match(service, /calculationScope: 'provisional'/);
  assert.match(service, /calculationHash\(/);
  assert.match(service, /p_user_id: userId/);
  assert.match(service, /p_reason_codes: result\.reasonCodes/);
  assert.match(service, /\.eq\('user_id', userId\)/);
  assert.doesNotMatch(api, /searchParams\.get\(['"]userId/);
});

test('both V1 snapshot publishers remain private service functions', async () => {
  const service = await readFile(servicePath, 'utf8');
  assert.match(service, /async function publishGoalDiagnostic\(/);
  assert.match(service, /async function publishOharaDiagnostic\(/);
  assert.doesNotMatch(service, /export async function publish(?:Goal|Ohara)Diagnostic\(/);
});
