import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');
const web = read('features/goals/components/GoalsExperience.web.tsx');
const workspace = read('features/goals/components/GoalsWorkspace.tsx');

test('web library and native routing remain separate without replacing domain controls', () => {
  assert.match(read('features/goals/components/GoalsExperience.tsx'), /GoalsWorkspace/);
  assert.match(web, /useGoals\(\{ status: 'all' \}\)/);
  assert.match(web, /<SharedGoalsPreview/);
  assert.match(workspace, /<TasksPanel/);
  assert.match(workspace, /<MilestonesPanel/);
  assert.match(workspace, /onComplete=\{goalDetail.onCompleteMilestone\}/);
  assert.match(read('features/goals/components/GoalDetailHeader.tsx'), /<ExtendGoalModal/);
});

test('Entry reads are deferred to Vault and canonical IDs are deduplicated', () => {
  assert.match(web, /if \(tab !== 'vault'\) return;/);
  assert.match(web, /readContextVaultEntries\(supabase, \{ type: 'goal', id \}\)/);
  assert.match(web, /setEntries\(result.entries\)/);
  assert.match(web, /onRetryEntries=/);
  assert.doesNotMatch(web, /reconcile|recalculate|supabase\.from|serviceRole/);
});

test('requested Goal resolves before mutation hooks and cannot fall back to the first Goal', () => {
  assert.match(web, /fetchGoalById\(id\)/);
  assert.match(web, /if \(!goal\) \{ setState\('error'\); return; \}/);
  assert.doesNotMatch(web, /goals\[0\]/);
});

test('Goals V2 does not promote the stored percentage or elapsed time as outcome completion', () => {
  assert.doesNotMatch(web, /goal\.progress/);
  assert.match(web, /milestones reached/);
  assert.doesNotMatch(workspace, /GOAL PROGRESS|accessibilityLabel="Goal Progress"/);
  assert.match(workspace, /MomentumDelta change=\{summary\?\.weeklyChange\}/);
  assert.match(read('features/goals/components/GoalDetailHeader.tsx'), /!redesigned \? <Button[\s\S]*?Open Vault/);
});
