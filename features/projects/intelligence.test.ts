import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProjectIntelligence } from './intelligence.ts';

const now = new Date('2026-09-24T12:00:00Z');

test('returns a truthful empty state without fabricated interpretation', () => {
  assert.equal(buildProjectIntelligence({ goals: [], tasks: [], milestones: [], latestActivityAt: null, now }).kind, 'empty');
});

test('Personal Projects compare active Goal movement before a single Goal detail', () => {
  const insight = buildProjectIntelligence({ goals: [{ id: 'g', title: 'Run a 5K', momentum: 72, weeklyDelta: 6 }], tasks: [{ timing: 'overdue' }], milestones: [], latestActivityAt: now.toISOString(), now });
  assert.equal(insight.kind, 'project_goal_comparison');
  assert.match(insight.primary, /1 of 1 active Goal gained Momentum/);
  assert.match(insight.secondary ?? '', /overdue/);
});

test('ranks upcoming milestones above overdue work and handles no Momentum delta', () => {
  const insight = buildProjectIntelligence({ goals: [{ id: 'g', title: 'Launch', momentum: 50, weeklyDelta: null }], tasks: [{ timing: 'overdue' }], milestones: [{ title: 'Beta ready', dueDate: new Date('2026-09-26T12:00:00Z'), completedAt: null }], latestActivityAt: now.toISOString(), now });
  assert.equal(insight.kind, 'milestone_upcoming');
  assert.equal(insight.primary, 'Beta ready is due in 2 days.');
});

test('reports meaningful inactivity deterministically', () => {
  const insight = buildProjectIntelligence({ goals: [], tasks: [], milestones: [], latestActivityAt: '2026-09-14T12:00:00Z', now });
  assert.equal(insight.kind, 'goal_inactivity');
  assert.equal(insight.primary, 'Project has had no recorded activity for 10 days.');
});
