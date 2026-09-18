import assert from 'node:assert/strict';
import test from 'node:test';
import type { GoalMilestone, GoalWithDetails } from './types.ts';
import {
  filterGoalsForWorkspace,
  getGoalCategoryLabel,
  getGoalStatusLabel,
  getNextGoalMilestone,
  getUpcomingGoalSteps,
} from './goals-workspace.ts';

function goal(overrides: Partial<GoalWithDetails> = {}): GoalWithDetails {
  const now = new Date('2026-08-11T12:00:00.000Z');
  return {
    id: 'goal-1',
    userId: 'user-1',
    title: 'Build a reading rhythm',
    description: 'Read and reflect each week',
    category: 'mind',
    colorTheme: 'ocean',
    deadline: null,
    completedAt: null,
    archivedAt: null,
    expiredAt: null,
    targetFrequency: null,
    visibility: 'private',
    progress: 20,
    status: 'active',
    aiGenerated: false,
    smartData: null,
    projectId: null,
    createdAt: now,
    updatedAt: now,
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

function milestone(overrides: Partial<GoalMilestone>): GoalMilestone {
  const now = new Date('2026-08-11T12:00:00.000Z');
  return {
    id: 'milestone-1',
    goalId: 'goal-1',
    userId: 'user-1',
    title: 'First milestone',
    description: null,
    dueDate: null,
    completedAt: null,
    sortOrder: 0,
    isAiSuggested: false,
    kind: 'achievement',
    parentId: null,
    targetCount: null,
    photoUrl: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test('filters by real status mappings, category, and searchable fields', () => {
  const goals = [
    goal(),
    goal({ id: 'goal-2', title: 'Restore energy', category: 'health', status: 'stagnant' }),
    goal({ id: 'goal-3', title: 'Finish portfolio', category: 'creative', status: 'complete' }),
  ];

  assert.deepEqual(filterGoalsForWorkspace(goals, '', 'paused', null).map((item) => item.id), ['goal-2']);
  assert.deepEqual(filterGoalsForWorkspace(goals, '', 'completed', null).map((item) => item.id), ['goal-3']);
  assert.deepEqual(filterGoalsForWorkspace(goals, 'reflect', 'active', 'mind').map((item) => item.id), ['goal-1']);
});

test('returns the first incomplete milestone by canonical sort order', () => {
  const selected = getNextGoalMilestone([
    milestone({ id: 'done', sortOrder: 0, completedAt: new Date('2026-08-10T12:00:00.000Z') }),
    milestone({ id: 'later', sortOrder: 2 }),
    milestone({ id: 'next', sortOrder: 1 }),
  ]);

  assert.equal(selected?.id, 'next');
});

test('does not promote evidence children into the next-step feature', () => {
  const selected = getNextGoalMilestone([
    milestone({ id: 'completed-parent', completedAt: new Date('2026-08-10T12:00:00.000Z') }),
    milestone({ id: 'evidence-child', parentId: 'completed-parent', sortOrder: 0 }),
    milestone({ id: 'next-achievement', sortOrder: 1 }),
  ]);

  assert.equal(selected?.id, 'next-achievement');
});

test('builds dated Home reminders from each active Goals next top-level milestone', () => {
  const steps = getUpcomingGoalSteps([
    goal({
      id: 'goal-later',
      title: 'Later goal',
      deadline: new Date('2026-09-30T12:00:00.000Z'),
      milestones: [milestone({ goalId: 'goal-later', id: 'later-step', sortOrder: 0 })],
    }),
    goal({
      id: 'goal-sooner',
      title: 'Sooner goal',
      milestones: [
        milestone({
          dueDate: new Date('2026-08-15T12:00:00.000Z'),
          goalId: 'goal-sooner',
          id: 'sooner-step',
          sortOrder: 1,
        }),
        milestone({
          dueDate: new Date('2026-08-12T12:00:00.000Z'),
          goalId: 'goal-sooner',
          id: 'later-in-sequence',
          sortOrder: 2,
        }),
      ],
    }),
    goal({
      id: 'goal-undated',
      title: 'Undated goal',
      milestones: [milestone({ goalId: 'goal-undated', id: 'undated-step' })],
    }),
  ]);

  assert.deepEqual(steps.map((step) => step.milestone.id), ['sooner-step', 'later-step']);
  assert.equal(steps[1]?.dueDate.toISOString(), '2026-09-30T12:00:00.000Z');
});

test('formats stored category and status identities without relabeling legacy values', () => {
  assert.equal(getGoalCategoryLabel('mind'), 'Mind');
  assert.equal(getGoalCategoryLabel('health'), 'Health & Fitness');
  assert.equal(getGoalStatusLabel('stagnant'), 'Paused');
  assert.equal(getGoalStatusLabel('complete'), 'Completed');
  assert.equal(getGoalStatusLabel('expired'), 'Expired');
});
