import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('Goal and Project deletion are explicit, owner-gated, and fail closed', () => {
  const goalManage = read('features/goals/components/ManageGoalControl.tsx');
  const goalService = read('features/goals/services/goal-service.ts');
  const projectManage = read('features/projects/components/ManageProjectModal.tsx');
  const projectService = read('features/projects/services/project-service.ts');

  assert.match(goalManage, /const isOwner = goal\.userId === currentUserId/);
  assert.match(goalManage, /isOwner \? <View[\s\S]*Delete Goal/);
  assert.match(goalManage, /This cannot be undone\./);
  assert.match(projectManage, /const isOwner = project\.collaboration\.role === 'owner'/);
  assert.match(projectManage, /isOwner \? <View[\s\S]*Delete Project/);
  assert.match(projectManage, /Goals, Notes, and Journal entries remain with their owners and are unlinked/);
  for (const service of [goalService, projectService]) {
    assert.match(service, /\.delete\(\)[\s\S]*\.select\('id'\)[\s\S]*\.maybeSingle\(\)/);
    assert.match(service, /You may not have permission/);
  }
});

test('the shared modal primitive exposes one accessible top-right close control', () => {
  const modal = read('components/ui/Modal.tsx');
  assert.match(modal, /accessibilityLabel="Close"/);
  assert.match(modal, /height: 44/);
  assert.match(modal, /position: 'absolute'/);
  assert.match(modal, /name="close"/);
  assert.doesNotMatch(modal, />\s*Close\s*<\/Typography>/);
});

test('Project Snapshot and Goal execution cards use the finalized compact hierarchy', () => {
  const project = read('app/(app)/projects/[id].tsx');
  const tasks = read('features/tasks/components/TasksPanel.tsx');
  const milestones = read('features/goals/components/MilestonesPanel.tsx');
  const snapshot = project.match(/const snapshotCard = ([^;]+);/)?.[1] ?? '';

  for (const label of ['Active Goals', 'Notes', 'Journal', 'Sources']) assert.match(snapshot, new RegExp(label));
  assert.doesNotMatch(snapshot, /Last Activity|lastActivity/);
  assert.match(tasks, /No Tasks yet\./);
  assert.match(milestones, /No Milestones yet\./);
  assert.match(milestones, /\+ Add Milestone/);
});

test('Home keeps schedule, next-step, and read-only Momentum responsibilities separate', () => {
  const dashboard = read('app/(app)/dashboard.tsx');
  const calendar = read('features/calendar/components/HomeCalendarPreview.tsx');
  const nextStep = read('features/goals/components/home/NextStepPanel.tsx');
  const momentum = read('features/momentum/hooks/useMomentumHomeSummary.ts');

  assert.doesNotMatch(dashboard, /<TodayFocus/);
  assert.match(dashboard, /HomeMomentumSnapshot[\s\S]*NextStepPanel[\s\S]*HomeCalendarPreview/);
  assert.match(dashboard, /HomeCalendarPreview/);
  assert.match(dashboard, /HomeMomentumSnapshot/);
  assert.match(calendar, /Today&apos;s Focus|Today's Focus/);
  assert.match(nextStep, /give it a date/);
  assert.doesNotMatch(nextStep, /or its Goal a date/);
  assert.match(momentum, /authedFetch\('\/api\/momentum'\)/);
  assert.doesNotMatch(dashboard, /recalculate|reconcile/);
});

test('paused Goal routing remains explicit and visible', () => {
  const workspace = read('features/goals/components/GoalsWorkspace.tsx');
  const domain = read('features/goals/goals-workspace.ts');
  assert.match(workspace, /\{ label: 'Paused', value: 'paused' \}/);
  assert.match(workspace, /fetchGoalById\(routeSelected\)/);
  assert.match(domain, /status === 'stagnant'\) return 'paused'/);
  assert.match(domain, /status === 'paused'\) return 'stagnant'/);
});
