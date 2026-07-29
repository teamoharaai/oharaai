import {
  GOAL_CATEGORIES,
  type GoalCategory,
} from '../../lib/goals/schema.ts';

export interface GoalCategoryPresentation {
  category: GoalCategory;
  label: string;
  symbol: string;
}

export const GOAL_CATEGORY_PRESENTATION: Readonly<
  Record<GoalCategory, GoalCategoryPresentation>
> = {
  body: { category: 'body', label: 'Body', symbol: '◐' },
  mind: { category: 'mind', label: 'Mind', symbol: '◈' },
  money: { category: 'money', label: 'Money', symbol: '$' },
  create: { category: 'create', label: 'Create', symbol: '✦' },
  connect: { category: 'connect', label: 'Connect', symbol: '♡' },
  contribute: { category: 'contribute', label: 'Contribute', symbol: '❋' },
  health: { category: 'health', label: 'Health & Fitness', symbol: '◐' },
  finance: { category: 'finance', label: 'Finance', symbol: '$' },
  career: { category: 'career', label: 'Career', symbol: '↗' },
  creative: { category: 'creative', label: 'Creative', symbol: '✦' },
  education: { category: 'education', label: 'Education', symbol: '◈' },
  relationships: {
    category: 'relationships',
    label: 'Relationships',
    symbol: '♡',
  },
  growth: { category: 'growth', label: 'Personal Growth', symbol: '❋' },
};

export function isGoalCategory(value: unknown): value is GoalCategory {
  return (
    typeof value === 'string'
    && (GOAL_CATEGORIES as readonly string[]).includes(value)
  );
}

export function goalCategoryPresentation(
  category: GoalCategory,
): GoalCategoryPresentation {
  return GOAL_CATEGORY_PRESENTATION[category];
}
