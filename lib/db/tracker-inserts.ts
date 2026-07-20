import type {
  GoalTrackerFrequency,
  GoalTrackerType,
} from '@/lib/goals/schema';

export interface TrackerInsertInput {
  title: string;
  type: GoalTrackerType;
  targetValue?: number | null;
  targetUnit?: string | null;
  frequency?: GoalTrackerFrequency | null;
  isAiSuggested?: boolean;
  sortOrder?: number;
}

export function buildTrackerInsert(goalId: string, input: TrackerInsertInput) {
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
