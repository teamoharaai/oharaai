import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMomentumInsightFacts,
  selectContextualInsight,
  type InsightFact,
} from './contextual-insights.ts';

function authorizedFact(overrides: Partial<InsightFact> & Pick<InsightFact, 'id' | 'type'>): InsightFact {
  return {
    subjectType: 'goal',
    subjectId: 'goal-1',
    subjectName: 'Run a 5K',
    timeWindow: 'week',
    currentValue: 68,
    previousValue: 62,
    delta: 6,
    metadata: {},
    priorityHint: 0,
    authorization: 'authorized',
    ...overrides,
  };
}

test('the same Momentum fact uses Goal and Project-specific wording', () => {
  const momentum = authorizedFact({ id: 'momentum', type: 'goal_momentum_change' });
  const goal = selectContextualInsight([momentum], 'goal');
  const project = selectContextualInsight([momentum], 'project_personal');
  assert.equal(goal.primary, 'Goal Momentum increased by 6 points this week.');
  assert.equal(project.primary, 'Run a 5K had the strongest Momentum improvement in this Project (+6).');
  assert.notEqual(goal.primary, project.primary);
});

test('Team context prioritizes assignment completion without ranking people', () => {
  const facts = [
    authorizedFact({ id: 'momentum', type: 'goal_momentum_change' }),
    authorizedFact({ id: 'assigned', type: 'team_assignment_completion', subjectType: 'project', subjectId: 'project-1', subjectName: 'Project', currentValue: 8, previousValue: null, delta: null }),
  ];
  const insight = selectContextualInsight(facts, 'project_team');
  assert.equal(insight.kind, 'team_assignment_completion');
  assert.equal(insight.primary, '8 assigned Tasks were completed this week.');
  assert.doesNotMatch(insight.primary, /best|worst|performer/i);
});

test('Guide context prioritizes adherence and then an upcoming deadline', () => {
  const facts = [
    authorizedFact({ id: 'adherence', type: 'guide_client_adherence', subjectType: 'member', subjectId: 'client-1', subjectName: 'Arthur', currentValue: 3, previousValue: null, delta: null, metadata: { completed: 3, due: 4 } }),
    authorizedFact({ id: 'deadline', type: 'milestone_upcoming', subjectType: 'milestone', subjectId: 'milestone-1', subjectName: 'Practice 5K', currentValue: null, previousValue: null, delta: null, metadata: { days: 4 } }),
  ];
  const insight = selectContextualInsight(facts, 'project_guide');
  assert.equal(insight.primary, 'Arthur completed 3 of 4 scheduled Tasks this week.');
  assert.equal(insight.secondary, 'Practice 5K is due in 4 days.');
});

test('Momentum Weekly prioritizes a dimension change over generic activity', () => {
  const facts = buildMomentumInsightFacts({
    currentValue: 68,
    weeklyChange: 5,
    dimensions: [
      { id: 'consistency', name: 'Consistency', currentValue: 80, previousValue: 70 },
      { id: 'reflection', name: 'Reflection', currentValue: 60, previousValue: 60 },
    ],
    history: [{ value: 60 }, { value: 63 }, { value: 68 }],
  });
  facts.push(authorizedFact({ id: 'activity', type: 'team_member_activity', currentValue: 12, previousValue: null, delta: null }));
  const insight = selectContextualInsight(facts, 'momentum_weekly');
  assert.equal(insight.kind, 'momentum_dimension_change');
  assert.match(insight.primary, /Consistency increased most this week/);
});

test('unauthorized Reflection facts never enter Team or Guide output', () => {
  const privateReflection = authorizedFact({
    id: 'private-reflection',
    type: 'reflection_count_change',
    subjectType: 'reflection',
    subjectId: 'private',
    subjectName: 'Private Reflection',
    currentValue: 4,
    previousValue: null,
    delta: null,
    authorization: 'unauthorized',
  });
  for (const context of ['project_team', 'project_guide'] as const) {
    const insight = selectContextualInsight([privateReflection], context);
    assert.equal(insight.selectedFactIds.length, 0);
    assert.doesNotMatch(insight.primary, /Reflection|4/);
  }
});

test('sparse data uses a truthful fallback', () => {
  const insight = selectContextualInsight([], 'project_personal');
  assert.equal(insight.kind, 'empty');
  assert.equal(insight.primary, 'No major Project trends yet. Activity across your Goals will appear here over time.');
});

test('stable Momentum never fabricates improvement or decline', () => {
  const facts = buildMomentumInsightFacts({ currentValue: 70, weeklyChange: 0, dimensions: [], history: [] });
  const insight = selectContextualInsight(facts, 'momentum_weekly');
  assert.equal(insight.primary, 'Momentum stayed relatively steady this week.');
  assert.doesNotMatch(insight.primary, /improv|declin|increas|decreas/i);
});

test('selection returns one primary and at most one non-repetitive secondary fact', () => {
  const facts = [
    authorizedFact({ id: 'momentum-1', type: 'goal_momentum_change' }),
    authorizedFact({ id: 'comparison', type: 'project_goal_comparison', subjectType: 'project', subjectId: 'project-1', subjectName: 'Project', currentValue: 2, previousValue: null, delta: null, metadata: { total: 3 } }),
    authorizedFact({ id: 'milestone', type: 'milestone_upcoming', subjectType: 'milestone', subjectId: 'm1', subjectName: 'Practice 5K', currentValue: null, previousValue: null, delta: null, metadata: { days: 3 } }),
    authorizedFact({ id: 'notes', type: 'note_activity', subjectType: 'note', subjectId: 'project-1', subjectName: 'Notes', currentValue: 5, previousValue: null, delta: null }),
  ];
  const insight = selectContextualInsight(facts, 'project_personal');
  assert.equal(insight.selectedFactIds.length, 2);
  assert.equal(insight.selectedFactIds[0], 'comparison');
  assert.equal(insight.selectedFactIds[1], 'milestone');
});

test('monthly selection deterministically summarizes multi-week direction', () => {
  const facts = buildMomentumInsightFacts({
    currentValue: 70,
    weeklyChange: 2,
    dimensions: [],
    history: [{ value: 60 }, { value: 63 }, { value: 62 }, { value: 68 }, { value: 70 }],
  });
  const insight = selectContextualInsight(facts, 'momentum_monthly');
  assert.equal(insight.kind, 'momentum_monthly_trend');
  assert.equal(insight.primary, 'Momentum trended upward in 3 of the last 4 weeks.');
});
