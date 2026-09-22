import assert from 'node:assert/strict';
import test from 'node:test';
import { planSuggestions } from './plan-suggestions.ts';

test('suggestions require a title and return only explicit draft candidates', () => {
  assert.deepEqual(planSuggestions('', 'Health & Fitness', '', ''), { tasks: [], milestones: [] });
  const result = planSuggestions('Learn Spanish', 'Learning & Creativity', '2027-01-01', 'Read novels');
  assert.equal(result.tasks.length, 3);
  assert.equal(result.milestones.length, 3);
  assert.ok(result.tasks.some((title) => title.includes('Learn Spanish')));
  assert.ok(result.milestones.some((title) => title.includes('2027-01-01')));
});

test('title and reason inform suggestions, not category alone', () => {
  const run = planSuggestions('Run a 5K', 'Health & Fitness', '', '');
  const meditate = planSuggestions('Build a calm routine', 'Health & Fitness', '', 'Meditation for stress');
  const work = planSuggestions('Launch portfolio', 'Work & Money', '', '');
  assert.notDeepEqual(run, meditate);
  assert.ok(meditate.tasks.some((title) => /meditation/.test(title)));
  assert.ok(work.tasks.every((title) => !/run|meditation/.test(title)));
  assert.deepEqual(work, planSuggestions('Launch portfolio', 'Work & Money', '', ''));
});
