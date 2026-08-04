import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { verifyLocalTarget } from './momentum-local-target.mjs';

const { origin, values } = verifyLocalTarget();
for (const [key, value] of Object.entries(values)) process.env[key] = value;

const { getMomentumHomeSummary } = await import('../features/momentum/services/momentum-service.ts');

const anonKey = values.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = values.SUPABASE_SERVICE_ROLE_KEY;
const service = createClient(origin, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const now = new Date('2026-08-03T16:00:00.000Z');
const password = 'LocalMomentum!2026';

async function resetUser(email, timezone) {
  const { data: listed, error: listError } = await service.auth.admin.listUsers({ perPage: 1000 });
  assert.equal(listError, null);
  const existing = listed.users.find((user) => user.email === email);
  if (existing) {
    const { error } = await service.auth.admin.deleteUser(existing.id);
    assert.equal(error, null);
  }
  const { data, error } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  });
  assert.equal(error, null);
  assert.ok(data.user);
  const userId = data.user.id;
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .update({ timezone })
    .eq('id', userId)
    .select('id')
    .single();
  assert.equal(profileError, null);
  assert.equal(profile.id, userId);
  const client = createClient(origin, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signedIn, error: signInError } = await client.auth.signInWithPassword({ email, password });
  assert.equal(signInError, null);
  assert.ok(signedIn.session?.access_token);
  return { client, email, token: signedIn.session.access_token, userId };
}

async function createGoal(userId, title) {
  const { data, error } = await service
    .from('goals')
    .insert({ category: 'mind', status: 'active', title, user_id: userId })
    .select('id')
    .single();
  assert.equal(error, null);
  return data.id;
}

async function createAction({ completedAt, dueDate, goalId, id, userId }) {
  const { error } = await service.from('action_logs').insert({
    action_text: `Local validation ${id}`,
    completed_at: completedAt,
    created_at: new Date(new Date(completedAt).getTime() - 3_600_000).toISOString(),
    due_date: dueDate,
    goal_id: goalId,
    id,
    status: 'complete',
    user_id: userId,
  });
  assert.equal(error, null);
}

async function snapshotRows(userId) {
  const { data, error } = await service
    .from('momentum_weekly_snapshots')
    .select('id, calculation_hash, revision, supersedes_snapshot_id')
    .eq('user_id', userId)
    .eq('week_start', '2026-07-27')
    .order('revision', { ascending: true });
  assert.equal(error, null);
  return data;
}

console.log(`Verified isolated Supabase API target: ${origin}`);

const owner = await resetUser('momentum.owner@local.ohara.test', 'America/New_York');
const ownerGoal = await createGoal(owner.userId, 'Owner validation goal');

const empty = await getMomentumHomeSummary(owner.client, service, owner.userId, now);
assert.equal(empty.summary.tasksCompletedThisWeek, 0);
assert.equal(empty.summary.weeklyStreak, 0);
assert.equal(empty.summary.currentValue, 0);

await createAction({
  completedAt: '2026-08-03T14:00:00.000Z',
  dueDate: '2026-08-03',
  goalId: ownerGoal,
  id: 'a1000000-0000-0000-0000-000000000001',
  userId: owner.userId,
});
const current = await getMomentumHomeSummary(owner.client, service, owner.userId, now);
assert.equal(current.summary.tasksCompletedThisWeek, 1);
assert.equal(current.summary.weeklyStreak, 1);

await createAction({
  completedAt: '2026-07-30T15:00:00.000Z',
  dueDate: '2026-07-30',
  goalId: ownerGoal,
  id: 'a1000000-0000-0000-0000-000000000002',
  userId: owner.userId,
});
await createAction({
  completedAt: '2026-07-31T15:00:00.000Z',
  dueDate: '2026-08-10',
  goalId: ownerGoal,
  id: 'a1000000-0000-0000-0000-000000000003',
  userId: owner.userId,
});
await createAction({
  completedAt: '2026-07-21T15:00:00.000Z',
  dueDate: '2026-07-21',
  goalId: ownerGoal,
  id: 'a1000000-0000-0000-0000-000000000004',
  userId: owner.userId,
});

const populated = await getMomentumHomeSummary(owner.client, service, owner.userId, now);
assert.equal(populated.summary.tasksCompletedThisWeek, 1);
assert.equal(populated.summary.weeklyStreak, 3);
assert.equal(populated.diagnostic.weeklyAggregates.eligiblePlannedActions, 1);
assert.equal(populated.diagnostic.weeklyAggregates.completedPlannedActions, 1);
assert.ok(populated.diagnostic.weeklyAggregates.completedPlannedActions <= populated.diagnostic.weeklyAggregates.eligiblePlannedActions);

const afterFirstPopulated = await snapshotRows(owner.userId);
assert.equal(afterFirstPopulated.length, 2);
const replay = await getMomentumHomeSummary(owner.client, service, owner.userId, now);
const afterReplay = await snapshotRows(owner.userId);
assert.equal(afterReplay.length, afterFirstPopulated.length);
assert.equal(replay.diagnostic.calculationHash, populated.diagnostic.calculationHash);
assert.equal(afterReplay.at(-1).calculation_hash, afterFirstPopulated.at(-1).calculation_hash);

const { error: duplicateError } = await service.from('action_logs').insert({
  action_text: 'Duplicate attempt',
  completed_at: '2026-07-30T15:00:00.000Z',
  created_at: '2026-07-30T14:00:00.000Z',
  due_date: '2026-07-30',
  goal_id: ownerGoal,
  id: 'a1000000-0000-0000-0000-000000000002',
  status: 'complete',
  user_id: owner.userId,
});
assert.ok(duplicateError, 'duplicate authoritative action id must be rejected');

await createAction({
  completedAt: '2026-08-01T15:00:00.000Z',
  dueDate: '2026-08-01',
  goalId: ownerGoal,
  id: 'a1000000-0000-0000-0000-000000000005',
  userId: owner.userId,
});
const late = await getMomentumHomeSummary(owner.client, service, owner.userId, now);
const afterLate = await snapshotRows(owner.userId);
assert.equal(afterLate.length, 3);
assert.notEqual(late.diagnostic.calculationHash, replay.diagnostic.calculationHash);
assert.equal(afterLate.at(-1).supersedes_snapshot_id, afterLate.at(-2).id);

const other = await resetUser('momentum.other@local.ohara.test', 'America/New_York');
const otherGoal = await createGoal(other.userId, 'Gap-week validation goal');
await createAction({
  completedAt: '2026-08-03T15:00:00.000Z',
  dueDate: '2026-08-03',
  goalId: otherGoal,
  id: 'b1000000-0000-0000-0000-000000000001',
  userId: other.userId,
});
await createAction({
  completedAt: '2026-07-21T15:00:00.000Z',
  dueDate: '2026-07-21',
  goalId: otherGoal,
  id: 'b1000000-0000-0000-0000-000000000002',
  userId: other.userId,
});
const gap = await getMomentumHomeSummary(other.client, service, other.userId, now);
assert.equal(gap.summary.weeklyStreak, 1);

const boundaryUser = await resetUser('momentum.timezone@local.ohara.test', 'Pacific/Kiritimati');
const boundaryGoal = await createGoal(boundaryUser.userId, 'Timezone validation goal');
await createAction({
  completedAt: '2026-08-02T10:30:00.000Z',
  dueDate: '2026-08-03',
  goalId: boundaryGoal,
  id: 'c1000000-0000-0000-0000-000000000001',
  userId: boundaryUser.userId,
});
await createAction({
  completedAt: '2026-08-02T09:30:00.000Z',
  dueDate: '2026-08-02',
  goalId: boundaryGoal,
  id: 'c1000000-0000-0000-0000-000000000002',
  userId: boundaryUser.userId,
});
const timezone = await getMomentumHomeSummary(boundaryUser.client, service, boundaryUser.userId, now);
assert.equal(timezone.summary.tasksCompletedThisWeek, 1);
assert.equal(timezone.summary.weeklyStreak, 2);

const { data: leakedRows, error: leakError } = await other.client
  .from('momentum_weekly_snapshots')
  .select('id')
  .eq('user_id', owner.userId);
assert.equal(leakError, null);
assert.deepEqual(leakedRows, []);

const { error: insertError } = await owner.client.from('momentum_profiles').insert({
  current_value: 99,
  current_version: 'forged',
  user_id: owner.userId,
});
assert.ok(insertError, 'authenticated direct insert must fail');
const { error: updateError } = await owner.client
  .from('momentum_profiles')
  .update({ current_value: 99 })
  .eq('user_id', owner.userId);
assert.ok(updateError, 'authenticated direct update must fail');
const { error: deleteError } = await owner.client
  .from('momentum_weekly_snapshots')
  .delete()
  .eq('user_id', owner.userId);
assert.ok(deleteError, 'authenticated direct delete must fail');

const { error: forgedRpcError } = await owner.client.rpc('publish_momentum_snapshot', {
  p_algorithm_version: 'momentum-v1.0',
  p_calculation_hash: 'f'.repeat(64),
  p_difficulty_multiplier: 1,
  p_effective_weights: {},
  p_events: [],
  p_growth_quality_score: 100,
  p_input_actions: [],
  p_input_events: [],
  p_next_value: 100,
  p_pillar_scores: {},
  p_previous_value: 0,
  p_raw_aggregates: {},
  p_reason_codes: ['FORGED'],
  p_timezone: 'America/New_York',
  p_user_id: other.userId,
  p_week_end: '2026-08-02',
  p_week_start: '2026-07-27',
  p_weekly_drag: 0,
  p_weekly_gain: 100,
});
assert.ok(forgedRpcError, 'authenticated forged publication must fail');

console.log(JSON.stringify({
  apiFixture: { email: owner.email, password },
  authoritativeSummary: {
    algorithmVersion: late.summary.algorithmVersion,
    status: late.summary.status,
    tasksCompletedThisWeek: late.summary.tasksCompletedThisWeek,
    weeklyStreak: late.summary.weeklyStreak,
  },
  local: true,
  scenarios: 10,
  securityAssertions: 5,
  snapshotRevisions: afterLate.map((row) => row.revision),
  target: origin,
}));
