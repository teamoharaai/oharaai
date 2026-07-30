import assert from 'node:assert/strict';
import test from 'node:test';
import type { GoalWithDetails } from './types.ts';
import {
  orderActiveGoals,
  resolveEntryReflectionTimestamps,
  resolveActiveGoalProjectTitles,
  selectActiveGoals,
} from './active-goal-selectors.ts';

function createGoal(
  id: string,
  overrides: Partial<GoalWithDetails> = {},
): GoalWithDetails {
  const createdAt = new Date('2026-07-01T12:00:00.000Z');

  return {
    id,
    userId: 'user-1',
    title: `Goal ${id}`,
    description: null,
    category: 'mind',
    colorTheme: 'ocean',
    deadline: null,
    targetFrequency: null,
    visibility: 'private',
    progress: 0,
    status: 'active',
    aiGenerated: false,
    smartData: null,
    projectId: null,
    createdAt,
    updatedAt: createdAt,
    has_successor: false,
    successor: null,
    previous_goal_id: null,
    prior_phase_summary: null,
    reflection: null,
    reflected_at: null,
    milestones: [],
    trackers: [],
    vaultItemCount: 0,
    echoLinkCount: 0,
    latestBrtTags: null,
    ...overrides,
  };
}

test('selectActiveGoals filters out every non-active status', () => {
  const goals = [
    createGoal('active'),
    createGoal('draft', { status: 'draft' }),
    createGoal('complete', { status: 'complete' }),
    createGoal('archived', { status: 'archived' }),
  ];

  assert.deepEqual(selectActiveGoals(goals).map((goal) => goal.id), ['active']);
});

test('entry reflection rows resolve the latest timestamp for each requested goal', () => {
  assert.deepEqual(
    resolveEntryReflectionTimestamps(['goal-1', 'goal-2', 'goal-3'], [
      { goal_id: 'goal-1', entries: { updated_at: '2026-07-20T12:00:00.000Z' } },
      { goal_id: 'goal-1', entries: [{ updated_at: '2026-07-29T12:00:00.000Z' }] },
      { goal_id: 'goal-2', entries: { updated_at: '2026-07-25T12:00:00.000Z' } },
      { goal_id: 'other-goal', entries: { updated_at: '2026-07-30T12:00:00.000Z' } },
    ]),
    {
      'goal-1': '2026-07-29T12:00:00.000Z',
      'goal-2': '2026-07-25T12:00:00.000Z',
      'goal-3': null,
    },
  );
});

test('orderActiveGoals places the latest reflection first', () => {
  const goals = [
    createGoal('no-reflection'),
    createGoal('older'),
    createGoal('newer'),
  ];

  const ordered = orderActiveGoals(goals, {
    older: '2026-07-20T12:00:00.000Z',
    newer: '2026-07-29T12:00:00.000Z',
  });

  assert.deepEqual(
    ordered.map((goal) => goal.id),
    ['newer', 'older', 'no-reflection'],
  );
});

test('null reflection timestamps use a deterministic created-at and id fallback', () => {
  const goals = [
    createGoal('z-goal', { createdAt: new Date('2026-07-20T12:00:00.000Z') }),
    createGoal('older', { createdAt: new Date('2026-07-10T12:00:00.000Z') }),
    createGoal('a-goal', { createdAt: new Date('2026-07-20T12:00:00.000Z') }),
  ];

  const ordered = orderActiveGoals(goals, {});

  assert.deepEqual(ordered.map((goal) => goal.id), ['a-goal', 'z-goal', 'older']);
});

test('orderActiveGoals does not mutate the input goals array', () => {
  const goals = Object.freeze([
    Object.freeze(createGoal('first')),
    Object.freeze(createGoal('second')),
  ]);

  const ordered = orderActiveGoals(goals, {
    first: '2026-07-20T12:00:00.000Z',
    second: '2026-07-29T12:00:00.000Z',
  });

  assert.deepEqual(goals.map((goal) => goal.id), ['first', 'second']);
  assert.equal('lastReflectionAt' in goals[0], false);
  assert.notEqual(ordered, goals);
});

test('resolveActiveGoalProjectTitles maps known projects and leaves others unset', () => {
  const ordered = orderActiveGoals([
    createGoal('known', { projectId: 'project-1' }),
    createGoal('missing', { projectId: 'project-missing' }),
    createGoal('standalone'),
  ], {});

  const resolved = resolveActiveGoalProjectTitles(ordered, [
    { id: 'project-1', title: 'Project One' },
  ]);

  assert.deepEqual(
    resolved.map(({ id, projectTitle }) => ({ id, projectTitle })),
    [
      { id: 'known', projectTitle: 'Project One' },
      { id: 'missing', projectTitle: undefined },
      { id: 'standalone', projectTitle: undefined },
    ],
  );
});
