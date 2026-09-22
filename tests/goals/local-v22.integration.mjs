// Real signed-in local API checks. No .env load; localhost is mandatory.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve, basename } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { getMomentumHomeSummary } from '../../features/momentum/services/momentum-service.ts';
import { PRODUCT_CATEGORIES } from '../../lib/goals/product-categories.ts';

const workdir = process.argv[2];
assert.ok(workdir && (/^ohara-v22-/.test(basename(workdir)) || (resolve(workdir).startsWith(`${process.cwd()}/`) && /^\.local-v22-api\./.test(basename(workdir)))), 'A disposable V2.2 workdir is required');
const status = spawnSync('supabase', ['status', '--workdir', workdir, '-o', 'json'], { encoding: 'utf8' });
assert.equal(status.status, 0, 'Local stack status failed');
const config = JSON.parse(status.stdout);
const origin = new URL(config.API_URL);
assert.equal(origin.protocol, 'http:');
assert.ok(['127.0.0.1', 'localhost'].includes(origin.hostname));
assert.equal(origin.port, '54321');
assert.ok(config.ANON_KEY && config.SERVICE_ROLE_KEY, 'Local API credentials missing');
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const service = createClient(origin.origin, config.SERVICE_ROLE_KEY, options);
const password = `Local-${crypto.randomUUID()}!`;
const email = `v22.${crypto.randomUUID()}@local.ohara.test`;
const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
assert.equal(created.error, null);
const userId = created.data.user.id;
const client = createClient(origin.origin, config.ANON_KEY, options);
const signedIn = await client.auth.signInWithPassword({ email, password });
assert.equal(signedIn.error, null);
const now = new Date();
const goalIds = [];
try {
  for (const [index, category] of PRODUCT_CATEGORIES.entries()) {
    const goal = await client.from('goals').insert({ user_id: userId, title: `V2.2 local fixture ${index}`, category,
      target_frequency: { period: 'week', times: 4 }, created_at: new Date(now.getTime()-21*86400000).toISOString(),
      deadline: new Date(now.getTime()+90*86400000).toISOString() }).select('id,category,momentum_scoring_profile').single();
    assert.equal(goal.error, null);
    assert.equal(goal.data.category, category);
    assert.equal(goal.data.momentum_scoring_profile, ['health_fitness','finance','creative','relationships'][index]);
    goalIds.push(goal.data.id);
    const completed = await client.rpc('log_completed_task_v1', { p_goal_id: goal.data.id, p_title: 'Local canonical completed Task',
      p_completion_mode: 'binary', p_completed_at: now.toISOString(), p_idempotency_key: `v22-${index}` });
    assert.equal(completed.error, null);
  }
  const before = await getMomentumHomeSummary(client, service, userId, now);
  assert.equal(before.summary.tasksCompletedThisWeek, 4);
  assert.equal(before.goalDiagnostics.length, 4);
  const snapshots = await service.from('goal_momentum_weekly_snapshots').select('*').eq('user_id', userId).order('id');
  assert.equal(snapshots.error, null);
  const changed = await client.from('goals').update({ category: 'Life & Relationships' }).in('id', goalIds);
  assert.equal(changed.error, null);
  const after = await getMomentumHomeSummary(client, service, userId, now);
  for (const diagnostic of before.goalDiagnostics) {
    const updated = after.goalDiagnostics.find((item) => item.normalizedInput.goalId === diagnostic.normalizedInput.goalId);
    assert.ok(updated);
    assert.deepEqual(updated.difficultyProfile, diagnostic.difficultyProfile);
    assert.deepEqual(updated.result, diagnostic.result);
  }
  const afterSnapshots = await service.from('goal_momentum_weekly_snapshots').select('*').eq('user_id', userId).order('id');
  assert.equal(afterSnapshots.error, null);
  assert.deepEqual(afterSnapshots.data, snapshots.data, 'Category-only edits changed persisted Momentum snapshots');
  const forbidden = await client.from('goals').update({ momentum_scoring_profile: 'education' }).eq('id', goalIds[0]);
  assert.ok(forbidden.error, 'Profile recalibration was allowed');
  const successor = await client.rpc('start_goal_new_phase_v1', { p_previous_goal_id: goalIds[0], p_deadline: new Date(now.getTime()+120*86400000).toISOString() });
  assert.equal(successor.error, null);
  const inherited = await client.from('goals').select('category,momentum_scoring_profile').eq('id', successor.data).single();
  assert.equal(inherited.error, null);
  assert.deepEqual(inherited.data, { category: 'Life & Relationships', momentum_scoring_profile: 'health_fitness' });
  console.log('PASS: authenticated four-category defaults, canonical Task scoring, category-edit score/snapshot continuity, immutable profiles, actual New Phase inheritance');
} finally {
  // Snapshot immutability intentionally also prevents cascading account deletion.
  // Keep these fixtures inside the disposable local stack; never bypass triggers.
  await client.auth.signOut();
  console.log('Signed out; synthetic fixtures remain only in the disposable local stack.');
}
