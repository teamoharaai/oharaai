import assert from 'node:assert/strict';
import test from 'node:test';
import { APPROVED_MIND_CATEGORIES, PRODUCT_CATEGORIES, productCategory } from '../../lib/goals/product-categories.ts';
import { establishedScoringProfile, legacyScoringProfile, newGoalScoringProfile } from './scoring-profile.ts';

test('four exact product categories and approved new-Goal baselines', () => {
  assert.deepEqual(PRODUCT_CATEGORIES.map(newGoalScoringProfile),
    ['health_fitness', 'finance', 'creative', 'relationships']);
  assert.equal(PRODUCT_CATEGORIES[0], 'Health & Fitness');
});

test('merged existing categories retain distinct scoring profiles', () => {
  for (const [old, category, profile] of [
    ['finance', 'Work & Money', 'finance'], ['career', 'Work & Money', 'career'],
    ['creative', 'Learning & Creativity', 'creative'], ['education', 'Learning & Creativity', 'education'],
    ['relationships', 'Life & Relationships', 'relationships'], ['growth', 'Life & Relationships', 'personal_growth'],
    ['body', 'Health & Fitness', 'health_fitness'], ['create', 'Learning & Creativity', 'creative'],
    ['connect', 'Life & Relationships', 'relationships'], ['contribute', 'Life & Relationships', 'personal_growth'],
    ['money', 'Work & Money', 'finance'], ['health', 'Health & Fitness', 'health_fitness'],
  ]) {
    assert.equal(productCategory(old), category);
    assert.equal(legacyScoringProfile(old), profile);
  }
});

test('all ten approved mind mappings preserve the education scoring profile', () => {
  assert.equal(Object.keys(APPROVED_MIND_CATEGORIES).length, 10);
  for (const [id, category] of Object.entries(APPROVED_MIND_CATEGORIES)) {
    assert.equal(productCategory('mind', id), category);
    assert.equal(legacyScoringProfile('mind'), 'education');
  }
});

test('unknown categories and unreviewed mind Goals cannot silently migrate', () => {
  assert.throws(() => productCategory('mind'));
  assert.throws(() => productCategory('mind', 'unreviewed'));
  assert.throws(() => productCategory('unknown'));
  assert.throws(() => legacyScoringProfile('unknown'));
});

test('category edits never replace the established scoring profile', () => {
  for (const category of PRODUCT_CATEGORIES) {
    assert.equal(establishedScoringProfile({ category, momentum_scoring_profile: 'education' }), 'education');
  }
  assert.throws(() => establishedScoringProfile({ category: 'Work & Money' }));
  assert.throws(() => establishedScoringProfile({ category: 'career', momentum_scoring_profile: 'unknown' }));
});
