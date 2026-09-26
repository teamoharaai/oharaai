import { test } from 'node:test';
import assert from 'node:assert/strict';
import { goalCardHTTP } from './goal-card-v1-http.ts';

const never = async () => assert.fail('RPC must not run');

test('child reads pass typed bounded parameters and stay private/no-store', async () => {
  const data = { ownerId: 'o', goalId: 'g', items: [], hasMore: false, nextCursor: null };
  const response = await goalCardHTTP(new Request('https://example.test/api/goals/card-v1?action=entries&goalId=g&entryType=note&limit=20'), async (a, p) => {
    assert.equal(a, 'entries'); assert.deepEqual(p, { goalId: 'g', entryType: 'note', limit: 20 }); return { ok: true, data };
  });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true, data });
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
});

test('a missing Goal or failed read is an explicit failure, never an empty collection', async () => {
  const missing = await goalCardHTTP(new Request('https://example.test/?action=entries&goalId=g&entryType=note'), async () => ({ ok: false, error: { code: 'GOAL_UNAVAILABLE' } }));
  assert.equal(missing.status, 404); assert.equal((await missing.json()).error.code, 'GOAL_UNAVAILABLE');
  const failed = await goalCardHTTP(new Request('https://example.test/?action=activity&goalId=g'), async () => { throw Error('private DB detail'); });
  assert.equal(failed.status, 503); assert.deepEqual(await failed.json(), { ok: false, error: { code: 'CONTRACT_UNAVAILABLE' } });
  const context = await goalCardHTTP(new Request('https://example.test/?action=activity&goalId=g'), async () => ({ ok: false, error: { code: 'DATE_CONTEXT_UNAVAILABLE' } }));
  assert.equal(context.status, 503);
});

test('reads cannot mutate and writes cannot be issued as GET', async () => {
  assert.equal((await goalCardHTTP(new Request('https://example.test/?action=mutate'), never)).status, 405);
  assert.equal((await goalCardHTTP(new Request('https://example.test/?action=entries', { method: 'POST', body: '{}' }), never)).status, 405);
  // Task and Milestone reads moved to /api/goals/work-v1 (Migration 075).
  assert.equal((await goalCardHTTP(new Request('https://example.test/?action=tasks&goalId=g'), never)).status, 405);
  assert.equal((await goalCardHTTP(new Request('https://example.test/?action=milestones&goalId=g'), never)).status, 405);
  assert.equal((await goalCardHTTP(new Request('https://example.test/?action=mutate', { method: 'DELETE' }), never)).status, 405);
});

test('malformed limits, bodies and change sets are rejected before the RPC', async () => {
  for (const request of [
    new Request('https://example.test/?action=entries&goalId=g&limit=0'),
    new Request('https://example.test/?action=activity&goalId=g&days=7.5'),
    new Request('https://example.test/?action=mutate', { method: 'POST', body: '[]' }),
    new Request('https://example.test/?action=mutate', { method: 'POST', body: '{"changes":["title"]}' }),
    new Request('https://example.test/?action=mutate', { method: 'POST', body: '{not json' }),
  ]) assert.equal((await goalCardHTTP(request, never)).status, 422);
  const large = await goalCardHTTP(new Request('https://example.test/?action=mutate', { method: 'POST', body: JSON.stringify({ changes: { title: 'x'.repeat(20000) } }) }), never);
  assert.equal(large.status, 413);
});

test('terminal non-commit is a successful receipt read; conflicts map to 409', async () => {
  const receipt = { state: 'not_committed', reason: 'VERSION_CONFLICT', operationId: 'op' };
  const ok = await goalCardHTTP(new Request('https://example.test/?action=mutate', { method: 'POST', body: '{"operationId":"op"}' }), async () => ({ ok: true, data: receipt }));
  assert.equal(ok.status, 200); assert.deepEqual((await ok.json()).data, receipt);
  const mismatch = await goalCardHTTP(new Request('https://example.test/?action=mutate', { method: 'POST', body: '{"operationId":"op"}' }), async () => ({ ok: false, error: { code: 'OPERATION_PAYLOAD_MISMATCH' } }));
  assert.equal(mismatch.status, 409);
  const unknown = await goalCardHTTP(new Request('https://example.test/?action=mutation_lookup&operationId=op'), async () => ({ ok: false, error: { code: 'HISTORY_UNAVAILABLE' } }));
  assert.equal(unknown.status, 503);
});
