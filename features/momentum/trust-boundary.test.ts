import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiPath = decodeURIComponent(
  new URL('../../app/api/momentum/index+api.ts', import.meta.url).pathname,
);
const servicePath = decodeURIComponent(
  new URL('./services/momentum-service.ts', import.meta.url).pathname,
);

test('authenticated request supplies identity only and trusted server persists derived output', async () => {
  const [api, service] = await Promise.all([
    readFile(apiPath, 'utf8'),
    readFile(servicePath, 'utf8'),
  ]);
  assert.match(api, /createServiceRoleClient\(\)/);
  assert.match(api, /getMomentumHomeSummary\(readDb, writeDb, auth\.userId\)/);
  assert.doesNotMatch(api, /request\.json\(\)/);
  assert.doesNotMatch(api, /searchParams\.get\(['"](?:score|hash|reason|userId)/);
  assert.match(service, /calculationHash\(hashInput\)/);
  assert.match(service, /p_user_id: userId/);
  assert.match(service, /p_reason_codes: diagnostic\.reasonCodes/);
  assert.match(service, /p_raw_aggregates: diagnostic\.weeklyAggregates/);
  assert.match(service, /\.eq\('user_id', userId\)/);
  assert.match(service, /latestMomentumHistory/);
  assert.doesNotMatch(api, /searchParams\.get\(['"]userId/);
});

test('snapshot publisher is private to the service and cannot be imported by a client', async () => {
  const service = await readFile(servicePath, 'utf8');
  assert.match(service, /async function publishDiagnostic\(/);
  assert.doesNotMatch(service, /export async function publishDiagnostic\(/);
});
