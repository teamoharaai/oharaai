import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { selectActiveGoals } from '../../features/goals/active-goal-selectors.ts';
import { getUpcomingGoalSteps } from '../../features/goals/goals-workspace.ts';

const read = (path: string) => readFileSync(path, 'utf8');

test('Home next steps retain the canonical active lifecycle and incomplete milestone selector', () => {
  const goals = ['active', 'expired', 'archived', 'complete', 'stagnant', 'draft'].map((status) => ({
    id: status, title: status, status, deadline: null,
    milestones: [
      { id: `${status}-done`, completedAt: new Date(), parentId: null, sortOrder: 0, dueDate: new Date('2026-10-08T12:00:00Z') },
      { id: `${status}-child`, completedAt: null, parentId: 'parent', sortOrder: 1, dueDate: new Date('2026-10-08T12:00:00Z') },
      { id: `${status}-next`, completedAt: null, parentId: null, sortOrder: 2, dueDate: new Date('2026-10-09T12:00:00Z') },
    ],
  }));
  const next = getUpcomingGoalSteps(selectActiveGoals(goals as never));
  assert.deepEqual(next.map((item) => item.milestone.id), ['active-next']);
});

test('Home presents published Momentum and uses no generation or recalculation on reads', () => {
  const dashboard = read('app/(app)/dashboard.tsx');
  const momentum = read('features/momentum/components/HomeMomentumSnapshot.tsx');
  const echo = read('features/goals/components/home/HomeEchoEntryPoints.tsx');
  assert.match(momentum, /summary\?\.history\.slice\(-6\)/);
  assert.match(momentum, /history\.length > 1/);
  assert.match(momentum, /yDomainMax=\{100\}/);
  assert.doesNotMatch(momentum, /\bfetch\(|authedFetch|Math\.random|\.fill\(/);
  assert.doesNotMatch(dashboard, /reconcile|recalculate|weeklyStreak|CirclesScreen|useCircles/);
  assert.doesNotMatch(echo, /useEffect|authedFetch|\bfetch\(/);
  assert.match(echo, /href: '\/notes', create: 'note'/);
  assert.match(echo, /href: '\/journal', create: 'new'/);
});

test('Home exposes failure and pending states without claiming an empty day or zero progress', () => {
  const calendar = read('features/calendar/components/HomeCalendarPreview.tsx');
  const next = read('features/goals/components/home/NextStepPanel.tsx');
  const hook = read('features/goals/hooks/useGoals.ts');
  assert.match(calendar, /!isLoading && !error/);
  assert.match(calendar, /\)\) : !error \?/);
  assert.match(calendar, /Retry Calendar/);
  assert.match(next, /isLoading && !steps\.length/);
  assert.match(next, /Open Goals to try again/);
  assert.match(hook, /if \(!cancelled\) setError/);
  assert.match(hook, /throwOnError: true/);
  assert.match(read('features/goals/services/goal-service.ts'), /if \(error && options\?\.throwOnError\) throw error/);
});
