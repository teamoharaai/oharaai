import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file: string) => readFileSync(file, 'utf8');
const detail = read('app/(app)/projects/[id].tsx');
const library = read('app/(app)/projects/index.tsx');
const vault = read('features/projects/components/ProjectVaultWorkspace.tsx');
const service = read('features/projects/services/project-service.ts');

test('Project web sections preserve native layout, deep links and published Goal Momentum', () => {
  assert.match(detail, /web \? webContent : mode === 'vault'/);
  assert.match(detail, /\['overview', 'goals', 'vault'\]/);
  assert.match(detail, /router\.push\(\{ pathname: '\/\(app\)\/projects\/\[id\]'/);
  assert.match(detail, /aria-pressed=\{mode === section\}/);
  assert.match(detail, /available && delta != null/);
  assert.doesNotMatch(detail, /weeklyChange \?\? 0/);
  assert.doesNotMatch(detail, /recalculate|publishMomentum|reconcile_goal_expiration|reconcile_task_occurrences/);
});

test('Project reads expose failures while retaining existing consumers and Vault authorization scope', () => {
  assert.match(service, /fetchProjects\(userId, \{ throwOnError: true \}\)/);
  assert.match(service, /if \(error && options.throwOnError\) throw error/);
  assert.match(library, /Promise.allSettled/);
  assert.match(library, /setInviteError/);
  for (const copy of ['No matching Projects', 'No shared Projects', 'No pending invitations.']) assert.ok(library.includes(copy));
  assert.match(vault, /partialErrors.includes\('shared Entries'\)/);
  assert.match(vault, /entriesLoading=\{!project.secondaryLoaded\}/);
  assert.match(vault, /onRetryEntries=\{onRetry\}/);
  assert.match(service, /\.eq\('project_id', projectId\)/);
  assert.doesNotMatch(vault, /service_role|fetchEntries\(/);
});

test('Project conversation mounts only after expansion; lifecycle filters and owner association controls remain', () => {
  assert.match(detail, /chatVisited \? <View style=\{\{ display: chatOpen/);
  const goals = read('features/projects/components/ProjectGoalsPanel.tsx');
  for (const status of ['active', 'complete', 'expired', 'archived', 'stagnant']) assert.ok(goals.includes(`'${status}'`));
  assert.match(goals, /project.collaboration.role === 'owner'/);
  assert.match(goals, /capabilities.has\('create_goal'\)/);
  assert.match(detail, /assignGoalsToProject\(project.id, selectedGoalIds, confirmMove\)/);
  assert.match(detail, /generation !== loadGeneration.current/);
});
