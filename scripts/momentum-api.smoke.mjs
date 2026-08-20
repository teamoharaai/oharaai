import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { verifyLocalTarget } from './momentum-local-target.mjs';

const { origin, values } = verifyLocalTarget({
  envPath: process.env.OHARA_LOCAL_ENV_PATH ?? '.env.local',
});
const webOrigin = process.env.OHARA_LOCAL_WEB_ORIGIN ?? 'http://127.0.0.1:8092';
const fixtureEmail = process.env.OHARA_MOMENTUM_FIXTURE_EMAIL ?? 'momentum.owner@local.ohara.test';
const client = createClient(origin, values.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: signedIn, error: signInError } = await client.auth.signInWithPassword({
  email: fixtureEmail,
  password: 'LocalMomentum!2026',
});
assert.equal(signInError, null);
assert.ok(signedIn.session?.access_token);

const response = await fetch(`${webOrigin}/api/momentum?diagnostics=1&score=99&hash=${'f'.repeat(64)}`, {
  headers: { Authorization: `Bearer ${signedIn.session.access_token}` },
});
assert.equal(response.status, 200);
const payload = await response.json();
assert.equal(payload.data.algorithmVersion, 'ohara-momentum-v1.0');
assert.equal(payload.data.tasksCompletedThisWeek, 1);
assert.equal(payload.data.weeklyStreak, 3);
assert.ok(payload.data.diagnostic.calculationHash);
assert.notEqual(payload.data.diagnostic.calculationHash, 'f'.repeat(64));
assert.notEqual(payload.data.currentValue, 99);
assert.ok(payload.data.goals[0]?.goalId);

const goalResponse = await fetch(
  `${webOrigin}/api/momentum/goals/${encodeURIComponent(payload.data.goals[0].goalId)}?diagnostics=1`,
  { headers: { Authorization: `Bearer ${signedIn.session.access_token}` } },
);
assert.equal(goalResponse.status, 200);
const goalPayload = await goalResponse.json();
assert.equal(goalPayload.data.algorithmVersion, 'goal-momentum-v1.0');
assert.equal(goalPayload.data.goalId, payload.data.goals[0].goalId);
assert.equal(goalPayload.data.diagnostic.result.algorithmVersion, 'goal-momentum-v1.0');

const missingGoal = await fetch(
  `${webOrigin}/api/momentum/goals/00000000-0000-0000-0000-000000000000`,
  { headers: { Authorization: `Bearer ${signedIn.session.access_token}` } },
);
assert.equal(missingGoal.status, 404);

const unauthorized = await fetch(`${webOrigin}/api/momentum`);
assert.equal(unauthorized.status, 401);
const unauthorizedGoal = await fetch(
  `${webOrigin}/api/momentum/goals/${encodeURIComponent(payload.data.goals[0].goalId)}`,
);
assert.equal(unauthorizedGoal.status, 401);

console.log(JSON.stringify({
  authenticatedResponse: {
    algorithmVersion: payload.data.algorithmVersion,
    currentValue: payload.data.currentValue,
    diagnostic: {
      calculationVersion: payload.data.diagnostic.result.algorithmVersion,
      reasonCodes: payload.data.diagnostic.result.reasonCodes,
    },
    status: payload.data.status,
    tasksCompletedThisWeek: payload.data.tasksCompletedThisWeek,
    weeklyChange: payload.data.weeklyChange,
    weeklyStreak: payload.data.weeklyStreak,
  },
  forgedQueryIgnored: true,
  goalResponse: {
    algorithmVersion: goalPayload.data.algorithmVersion,
    status: goalPayload.data.status,
  },
  localApi: webOrigin,
  missingGoalStatus: missingGoal.status,
  unauthorizedGoalStatus: unauthorizedGoal.status,
  unauthorizedStatus: unauthorized.status,
}));
