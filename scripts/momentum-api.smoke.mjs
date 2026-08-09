import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { verifyLocalTarget } from './momentum-local-target.mjs';

const { origin, values } = verifyLocalTarget();
const webOrigin = process.env.OHARA_LOCAL_WEB_ORIGIN ?? 'http://127.0.0.1:8092';
const client = createClient(origin, values.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: signedIn, error: signInError } = await client.auth.signInWithPassword({
  email: 'momentum.owner@local.ohara.test',
  password: 'LocalMomentum!2026',
});
assert.equal(signInError, null);
assert.ok(signedIn.session?.access_token);

const response = await fetch(`${webOrigin}/api/momentum?diagnostics=1&score=99&hash=${'f'.repeat(64)}`, {
  headers: { Authorization: `Bearer ${signedIn.session.access_token}` },
});
assert.equal(response.status, 200);
const payload = await response.json();
assert.equal(payload.data.algorithmVersion, 'momentum-v1.0');
assert.equal(payload.data.tasksCompletedThisWeek, 1);
assert.equal(payload.data.weeklyStreak, 3);
assert.ok(payload.data.diagnostic.calculationHash);
assert.notEqual(payload.data.diagnostic.calculationHash, 'f'.repeat(64));
assert.notEqual(payload.data.currentValue, 99);

const unauthorized = await fetch(`${webOrigin}/api/momentum`);
assert.equal(unauthorized.status, 401);

console.log(JSON.stringify({
  authenticatedResponse: {
    algorithmVersion: payload.data.algorithmVersion,
    currentValue: payload.data.currentValue,
    diagnostic: {
      calculationVersion: payload.data.diagnostic.algorithmVersion,
      excludedEvents: payload.data.diagnostic.excludedEvents.length,
      includedEvents: payload.data.diagnostic.includedEvents.length,
      reasonCodes: payload.data.diagnostic.reasonCodes,
    },
    status: payload.data.status,
    tasksCompletedThisWeek: payload.data.tasksCompletedThisWeek,
    weeklyChange: payload.data.weeklyChange,
    weeklyStreak: payload.data.weeklyStreak,
  },
  forgedQueryIgnored: true,
  localApi: webOrigin,
  unauthorizedStatus: unauthorized.status,
}));
