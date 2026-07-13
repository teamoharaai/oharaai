import type {
  GoalMeasurableFrequency,
  GoalMeasurableType,
} from '@/lib/goals/schema';

export interface MeasurableInsertInput {
  title: string;
  type: GoalMeasurableType;
  targetValue?: number | null;
  targetUnit?: string | null;
  frequency?: GoalMeasurableFrequency | null;
  isAiSuggested?: boolean;
  sortOrder?: number;
}

export function buildMeasurableInsert(goalId: string, input: MeasurableInsertInput) {
  return {
    goal_id: goalId,
    title: input.title.trim(),
    type: input.type,
    target_value: input.targetValue ?? null,
    target_unit: input.targetUnit?.trim() || null,
    frequency: input.frequency ?? null,
    current_value: 0,
    is_ai_suggested: input.isAiSuggested ?? false,
    sort_order: input.sortOrder ?? 0,
  };
}
