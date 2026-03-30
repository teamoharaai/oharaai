import supabase from './client';
import type { GoalTheme } from '@/constants/themes';

export interface AiGoalData {
  goal: {
    title: string;
    description: string;
    category: string;
    deadline: string | null;
    smart: {
      specific: string;
      measurable: string;
      achievable: string;
      relevant: string;
      timeBound: string;
    };
  };
  measurables: Array<{
    title: string;
    type: 'counter' | 'habit' | 'checklist';
    targetValue: number | null;
    targetUnit: string | null;
    frequency: 'daily' | 'weekly' | 'monthly' | 'once';
  }>;
  reasoning: string;
  assumptions?: string[];
}

export interface CreateGoalWithMeasurablesResult {
  goalId: string | null;
  error: string | null;
  warning: string | null;
}

const CATEGORY_THEME: Record<string, GoalTheme> = {
  body: 'ember',
  mind: 'lavender',
  money: 'slate',
  create: 'sunset',
  connect: 'coral',
  contribute: 'forest',
};

/**
 * Inserts a goal + its measurables from an AI finalization result.
 * Returns the new goalId on success, null on failure.
 */
export async function createGoalWithMeasurables(
  userId: string,
  aiData: AiGoalData,
): Promise<CreateGoalWithMeasurablesResult> {
  if (!aiData.goal.title?.trim()) {
    const error = 'AI goal payload is missing a title';
    console.error('[goal-save] validation failed', { userId, error, aiData });
    return { goalId: null, error, warning: null };
  }

  if (!aiData.goal.category?.trim()) {
    const error = 'AI goal payload is missing a category';
    console.error('[goal-save] validation failed', { userId, error, aiData });
    return { goalId: null, error, warning: null };
  }

  const colorTheme: GoalTheme = CATEGORY_THEME[aiData.goal.category] ?? 'ocean';

  console.info('[goal-save] inserting goal', {
    userId,
    title: aiData.goal.title,
    category: aiData.goal.category,
    measurableCount: aiData.measurables.length,
  });

  const { data: goalRow, error: goalError } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      title: aiData.goal.title,
      description: aiData.goal.description,
      category: aiData.goal.category,
      mode: 'commitment',
      status: 'active',
      smart_data: aiData.goal.smart,
      color_theme: colorTheme,
      deadline: aiData.goal.deadline ?? null,
      is_public: false,
      ai_generated: true,
    })
    .select('id')
    .single();

  if (goalError || !goalRow) {
    const error = goalError?.message ?? 'Goal insert returned no row';
    console.error('[goal-save] goal insert failed', {
      userId,
      error,
      code: goalError?.code,
      details: goalError?.details,
      hint: goalError?.hint,
    });
    return { goalId: null, error, warning: null };
  }

  const goalId = goalRow.id as string;
  let warning: string | null = null;

  if (aiData.measurables.length > 0) {
    const { error: measurableError } = await supabase.from('measurables').insert(
      aiData.measurables.map((m, index) => ({
        goal_id: goalId,
        title: m.title,
        type: m.type,
        target_value: m.targetValue ?? null,
        target_unit: m.targetUnit ?? null,
        frequency: m.frequency,
        current_value: 0,
        is_ai_suggested: true,
        sort_order: index,
      })),
    );

    if (measurableError) {
      warning = measurableError.message;
      console.error('[goal-save] measurables insert failed', {
        goalId,
        error: measurableError.message,
        code: measurableError.code,
        details: measurableError.details,
        hint: measurableError.hint,
      });
    } else {
      console.info('[goal-save] measurables inserted', {
        goalId,
        measurableCount: aiData.measurables.length,
      });
    }
  }

  console.info('[goal-save] goal saved', { goalId, warning });
  return { goalId, error: null, warning };
}
