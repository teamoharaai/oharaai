import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { goalWorkHTTP } from './goal-work-v1-http.ts';

const never = async () => assert.fail('RPC must not run');
const fixtures = JSON.parse(readFileSync(decodeURIComponent(new URL('./goal-work-v1.fixtures.json', import.meta.url).pathname), 'utf8'));
const post = (body: string) => new Request('https://example.test/api/goals/work-v1?action=mutate', { method: 'POST', body });

test('bounded reads pass typed parameters and stay private/no-store', async () => {
  const data = fixtures.responses.taskPage;
  const response = await goalWorkHTTP(new Request('https://example.test/api/goals/work-v1?action=tasks&goalId=g&limit=20&cursor=c'), async (a, p) => {
    assert.equal(a, 'tasks'); assert.deepEqual(p, { goalId: 'g', limit: 20, cursor: 'c' }); return { ok: true, data };
  });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true, data });
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
});

test('a missing Goal or failed read is an explicit failure, never an empty collection', async () => {
  const missing = await goalWorkHTTP(new Request('https://example.test/?action=milestones&goalId=g'), async () => ({ ok: false, error: { code: 'GOAL_UNAVAILABLE' } }));
  assert.equal(missing.status, 404); assert.equal((await missing.json()).error.code, 'GOAL_UNAVAILABLE');
  const failed = await goalWorkHTTP(new Request('https://example.test/?action=tasks&goalId=g'), async () => { throw Error('private DB detail'); });
  assert.equal(failed.status, 503); assert.deepEqual(await failed.json(), { ok: false, error: { code: 'CONTRACT_UNAVAILABLE' } });
  const expired = await goalWorkHTTP(new Request('https://example.test/?action=tasks&goalId=g&cursor=x'), async () => ({ ok: false, error: { code: 'CURSOR_EXPIRED' } }));
  assert.equal(expired.status, 409);
  const unauthorized = await goalWorkHTTP(new Request('https://example.test/?action=tasks&goalId=g'), async () => ({ ok: false, error: { code: 'UNAUTHORIZED' } }));
  assert.equal(unauthorized.status, 401);
});

test('reads cannot mutate and writes cannot be issued as GET', async () => {
  assert.equal((await goalWorkHTTP(new Request('https://example.test/?action=mutate'), never)).status, 405);
  assert.equal((await goalWorkHTTP(new Request('https://example.test/?action=tasks', { method: 'POST', body: '{}' }), never)).status, 405);
  assert.equal((await goalWorkHTTP(new Request('https://example.test/?action=mutate', { method: 'PATCH', body: '{}' }), never)).status, 405);
  assert.equal((await goalWorkHTTP(new Request('https://example.test/?action=mutation_lookup&operationId=x'), never)).status, 405);
});

test('malformed limits, bodies and nested members are rejected before the RPC', async () => {
  for (const request of [
    new Request('https://example.test/?action=tasks&goalId=g&limit=0'),
    new Request('https://example.test/?action=tasks&goalId=g&limit=100'),
    new Request('https://example.test/?action=tasks&goalId=g&limit=2.5'),
    post('[]'), post('null'), post('{not json'),
    post('{"fields":["title"]}'), post('{"schedule":"daily"}'), post('{"progress":null}'), post('{"changes":[]}'),
  ]) assert.equal((await goalWorkHTTP(request, never)).status, 422, request.url);
  const large = await goalWorkHTTP(post(JSON.stringify({ fields: { title: 'x'.repeat(20000) } })), never);
  assert.equal(large.status, 413);
});

test('every fixture request reaches the RPC unchanged; terminal non-commits are successful receipts', async () => {
  for (const example of fixtures.requests) {
    const body = { operationId: 'op', ...example.body };
    const response = await goalWorkHTTP(post(JSON.stringify(body)), async (a, p) => {
      assert.equal(a, 'mutate'); assert.deepEqual(p, body); return { ok: true, data: fixtures.responses.mutationCommitted };
    });
    assert.equal(response.status, 200, example.name);
  }
  const rejected = await goalWorkHTTP(post('{"operationId":"op"}'), async () => ({ ok: true, data: fixtures.responses.mutationNotCommitted }));
  assert.equal(rejected.status, 200); assert.equal((await rejected.json()).data.reason, 'MILESTONE_COMPLETE');
  const mismatch = await goalWorkHTTP(post('{"operationId":"op"}'), async () => ({ ok: false, error: { code: 'OPERATION_PAYLOAD_MISMATCH' } }));
  assert.equal(mismatch.status, 409);
  const invalid = await goalWorkHTTP(post('{"operationId":"op"}'), async () => ({ ok: false, error: { code: 'INVALID_FIELD' } }));
  assert.equal(invalid.status, 422);
  const unsupported = await goalWorkHTTP(post('{"operationId":"op"}'), async () => ({ ok: false, error: { code: 'UNSUPPORTED_CONTRACT' } }));
  assert.equal(unsupported.status, 422);
});
