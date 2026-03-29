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
): Promise<string | null> {
  const colorTheme: GoalTheme = CATEGORY_THEME[aiData.goal.category] ?? 'ocean';

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
    console.error('Goal insert failed:', goalError?.message);
    return null;
  }

  const goalId = goalRow.id as string;

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
      console.error('Measurables insert failed:', measurableError.message);
      // Goal created — return it even if measurables failed
    }
  }

  return goalId;
}
