import { CATEGORY_ACCENT_THEME } from '@/constants/themes';
import {
  GOAL_CREATION_CATEGORIES,
  type GoalCategory,
  type GoalCreationCategory,
} from '@/lib/goals/schema';
import { GOAL_CREATION_TEMPLATES } from '@/lib/goals/templates';
import { productCategory } from './product-categories';


export const GOAL_CATEGORY_CATALOG = GOAL_CREATION_CATEGORIES.map((id) => {
  const template = GOAL_CREATION_TEMPLATES[id];
  return {
    id,
    label: template.label,
    icon: template.icon,
    description: template.description,
    accent: CATEGORY_ACCENT_THEME[id],
  };
});

export const GOAL_CATEGORY_LABELS = Object.fromEntries(
  GOAL_CATEGORY_CATALOG.map((category) => [category.id, category.label]),
) as Record<GoalCreationCategory, string>;

export function normalizeGoalCategoryForEntries(
  category: GoalCategory | string | null | undefined,
  goalId?: string,
): GoalCreationCategory {
  return productCategory(category ?? '', goalId);
}
