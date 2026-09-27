import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { goalOperationsHTTP } from './goal-operations-v1-http.ts';

const never = async () => assert.fail('RPC must not run');
const fixtures = JSON.parse(readFileSync(decodeURIComponent(new URL('./goal-operations-v1.fixtures.json', import.meta.url).pathname), 'utf8'));
const request = (r: { method: string; query?: Record<string, string>; action?: string; body?: unknown }) => r.method === 'GET'
  ? new Request(`https://example.test/api/goals/operations-v1?${new URLSearchParams(r.query)}`)
  : new Request(`https://example.test/api/goals/operations-v1?action=${r.action}`, { method: 'POST', body: JSON.stringify(r.body) });

test('every fixture request reaches the RPC unchanged, typed, and stays private/no-store', async () => {
  for (const fixture of fixtures.requests) {
    const response = await goalOperationsHTTP(request(fixture), async (action, payload) => {
      const expected = fixture.method === 'GET' ? Object.fromEntries(Object.entries(fixture.query).filter(([key]) => key !== 'action')) : fixture.body;
      if ('limit' in expected) expected.limit = Number(expected.limit);
      assert.equal(action, fixture.method === 'GET' ? fixture.query.action : fixture.action, fixture.name);
      assert.deepEqual(payload, expected, fixture.name);
      return { ok: true, data: fixtures.responses.workCommitted };
    });
    assert.equal(response.status, 200, fixture.name);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  }
});

test('unknown identities, stale revisions and expired cursors are explicit, never success-shaped', async () => {
  const cases: Array<[string, number]> = [['HISTORY_UNAVAILABLE', 503], ['RECEIPT_REVISION_MISMATCH', 409], ['CURSOR_EXPIRED', 409],
    ['UNAUTHORIZED', 401], ['INVALID_FIELD', 422]];
  for (const [code, status] of cases) {
    const response = await goalOperationsHTTP(request(fixtures.requests[0]), async () => ({ ok: false, error: { code } }));
    assert.equal(response.status, status, code); assert.deepEqual(await response.json(), { ok: false, error: { code } });
  }
  const failed = await goalOperationsHTTP(request(fixtures.requests[0]), async () => { throw Error('private DB detail'); });
  assert.equal(failed.status, 503); assert.deepEqual(await failed.json(), { ok: false, error: { code: 'CONTRACT_UNAVAILABLE' } });
});

test('reads cannot write, writes cannot be GET, and malformed input never reaches the RPC', async () => {
  for (const r of [new Request('https://example.test/?action=close'), new Request('https://example.test/?action=ack'),
    new Request('https://example.test/?action=lookup', { method: 'POST', body: '{}' }), new Request('https://example.test/?action=discover', { method: 'DELETE' })]) {
    assert.equal((await goalOperationsHTTP(r, never)).status, 405);
  }
  for (const r of [new Request('https://example.test/?action=discover&limit=0'), new Request('https://example.test/?action=discover&limit=500'),
    new Request('https://example.test/?action=close', { method: 'POST', body: '[]' }), new Request('https://example.test/?action=ack', { method: 'POST', body: '{nope' })]) {
    assert.equal((await goalOperationsHTTP(r, never)).status, 422);
  }
  const large = await goalOperationsHTTP(new Request('https://example.test/?action=close', { method: 'POST', body: JSON.stringify({ operationId: 'x'.repeat(5000) }) }), never);
  assert.equal(large.status, 413);
});
