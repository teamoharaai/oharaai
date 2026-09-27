import { test } from 'node:test';
import assert from 'node:assert/strict';
import { goalRouteAuthResponses, privateNoStore } from './goal-route-http.ts';

test('auth failures use the Goal envelope; unavailable stays a retryable 503', async () => {
  const unauthorized = goalRouteAuthResponses.onUnauthorized();
  assert.equal(unauthorized.status, 401);
  assert.deepEqual(await unauthorized.json(), { ok: false, error: { code: 'UNAUTHORIZED' } });
  const unavailable = goalRouteAuthResponses.onUnavailable();
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('Retry-After'), '2');
  assert.deepEqual(await unavailable.json(), { ok: false, error: { code: 'AUTH_UNAVAILABLE' } });
});

test('every response leaves private/no-store, including auth failures and overrides', async () => {
  for (const make of [
    goalRouteAuthResponses.onUnauthorized,
    goalRouteAuthResponses.onUnavailable,
    () => Response.json({ ok: true }, { headers: { 'Cache-Control': 'public, max-age=60' } }),
  ]) {
    const response = await privateNoStore(async () => make())(new Request('https://example.test/'));
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  }
});

test('request and params reach the wrapped handler unchanged', async () => {
  const request = new Request('https://example.test/?action=tasks');
  await privateNoStore(async (r, p) => {
    assert.equal(r, request); assert.deepEqual(p, { id: 'g' }); return new Response(null, { status: 204 });
  })(request, { id: 'g' });
});
