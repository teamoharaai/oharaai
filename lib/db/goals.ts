import supabase from './client';
import type { GoalTheme } from '@/constants/themes';
import type { GoalFinalizeResponse } from '@/lib/ai/schemas/goal-creation';

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

function normalizeDeadlineForPersistence(deadline: string | null): string | null {
  if (!deadline) return null;

  const trimmed = deadline.trim();
  if (!trimmed) return null;

  const directDate = new Date(trimmed);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate.toISOString();
  }

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const normalized = new Date(`${trimmed}T00:00:00.000Z`);
    if (!Number.isNaN(normalized.getTime())) {
      return normalized.toISOString();
    }
  }

  return null;
}

function mapAiGoalDataToDbInserts(aiData: GoalFinalizeResponse, userId: string) {
  const colorTheme: GoalTheme = CATEGORY_THEME[aiData.goal.category] ?? 'ocean';
  const normalizedDeadline = normalizeDeadlineForPersistence(aiData.goal.deadline);

  return {
    goalInsert: {
      user_id: userId,
      title: aiData.goal.title,
      description: aiData.goal.description,
      category: aiData.goal.category,
      mode: 'commitment' as const,
      status: 'active' as const,
      smart_data: aiData.goal.smart,
      color_theme: colorTheme,
      deadline: normalizedDeadline,
      is_public: false,
      ai_generated: true,
    },
    measurableInserts: aiData.measurables.map((m, index) => ({
      title: m.title,
      type: m.type,
      target_value: m.targetValue ?? null,
      target_unit: m.targetUnit ?? null,
      frequency: m.frequency,
      current_value: 0,
      is_ai_suggested: true,
      sort_order: index,
    })),
    normalizationWarnings: aiData.goal.deadline && !normalizedDeadline
      ? [`Invalid deadline "${aiData.goal.deadline}" was normalized to null before persistence`]
      : [],
  };
}

/**
 * Inserts a goal + its measurables from an AI finalization result.
 * Returns the new goalId on success, null on failure.
 */
export async function createGoalWithMeasurables(
  userId: string,
  aiData: GoalFinalizeResponse,
  options?: { requestId?: string },
): Promise<CreateGoalWithMeasurablesResult> {
  const requestId = options?.requestId ?? null;

  if (!aiData.goal.title?.trim()) {
    const error = 'AI goal payload is missing a title';
    console.error('[goal-finalize] persistence failed', {
      requestId,
      stage: 'persistence',
      userId,
      error,
    });
    return { goalId: null, error, warning: null };
  }

  if (!aiData.goal.category?.trim()) {
    const error = 'AI goal payload is missing a category';
    console.error('[goal-finalize] persistence failed', {
      requestId,
      stage: 'persistence',
      userId,
      error,
    });
    return { goalId: null, error, warning: null };
  }

  const { goalInsert, measurableInserts, normalizationWarnings } = mapAiGoalDataToDbInserts(aiData, userId);
  let warning: string | null = normalizationWarnings[0] ?? null;

  console.info('[goal-finalize] persistence started', {
    requestId,
    stage: 'persistence',
    userId,
    title: aiData.goal.title,
    category: aiData.goal.category,
    measurableCount: aiData.measurables.length,
  });

  if (normalizationWarnings.length > 0) {
    console.warn('[goal-finalize] persistence normalization adjusted payload', {
      requestId,
      stage: 'persistence',
      userId,
      warnings: normalizationWarnings,
    });
  }

  const { data: goalRow, error: goalError } = await supabase
    .from('goals')
    .insert(goalInsert)
    .select('id')
    .single();

  if (goalError || !goalRow) {
    const error = goalError?.message ?? 'Goal insert returned no row';
    console.error('[goal-finalize] persistence failed', {
      requestId,
      stage: 'persistence',
      userId,
      error,
      code: goalError?.code,
      details: goalError?.details,
      hint: goalError?.hint,
    });
    return { goalId: null, error, warning: null };
  }

  const goalId = goalRow.id as string;

  if (measurableInserts.length > 0) {
    const { error: measurableError } = await supabase.from('measurables').insert(
      measurableInserts.map((row) => ({
        goal_id: goalId,
        ...row,
      })),
    );

    if (measurableError) {
      warning = [warning, measurableError.message].filter(Boolean).join(' | ');
      console.error('[goal-finalize] persistence failed', {
        requestId,
        stage: 'persistence',
        goalId,
        error: measurableError.message,
        code: measurableError.code,
        details: measurableError.details,
        hint: measurableError.hint,
      });
    } else {
      console.info('[goal-finalize] persistence measurables saved', {
        requestId,
        stage: 'persistence',
        goalId,
        measurableCount: aiData.measurables.length,
      });
    }
  }

  console.info('[goal-finalize] persistence succeeded', {
    requestId,
    stage: 'persistence',
    goalId,
    warning,
  });
  return { goalId, error: null, warning };
}
