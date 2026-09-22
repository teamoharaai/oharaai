import type { ProductCategory } from '../../lib/goals/product-categories.ts';
import type { GoalMomentumCategory } from './types.ts';

/** Compatibility defaults only: no change to Momentum V1.1 reference constants. */
export const NEW_GOAL_SCORING_PROFILES: Readonly<Record<ProductCategory, GoalMomentumCategory>> = {
  'Health & Fitness': 'health_fitness',
  'Work & Money': 'finance',
  'Learning & Creativity': 'creative',
  'Life & Relationships': 'relationships',
};

const LEGACY_PROFILES: Readonly<Record<string, GoalMomentumCategory>> = {
  body: 'health_fitness', health: 'health_fitness', health_fitness: 'health_fitness',
  money: 'finance', finance: 'finance', career: 'career',
  create: 'creative', creative: 'creative', mind: 'education', education: 'education',
  connect: 'relationships', relationships: 'relationships',
  contribute: 'personal_growth', growth: 'personal_growth', personal_growth: 'personal_growth',
};

/** Backfill from the pre-migration category, never from the new product category. */
export function legacyScoringProfile(category: string): GoalMomentumCategory {
  const profile = LEGACY_PROFILES[category.trim().toLowerCase()];
  if (!profile) throw new Error(`Unmapped legacy Momentum profile: ${category}`);
  return profile;
}

export function newGoalScoringProfile(category: ProductCategory): GoalMomentumCategory {
  return NEW_GOAL_SCORING_PROFILES[category];
}

/** Legacy fixtures may omit the field; migrated product categories may not. */
export function establishedScoringProfile(goal: {
  category: string;
  momentum_scoring_profile?: string | null;
}): GoalMomentumCategory {
  if (goal.momentum_scoring_profile != null) {
    const profile = goal.momentum_scoring_profile;
    if (!['health_fitness', 'finance', 'career', 'creative', 'education', 'relationships', 'personal_growth'].includes(profile)) {
      throw new Error(`Invalid established Momentum profile: ${profile}`);
    }
    return profile as GoalMomentumCategory;
  }
  return legacyScoringProfile(goal.category);
}
