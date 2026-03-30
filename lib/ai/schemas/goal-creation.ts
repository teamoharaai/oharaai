// Runtime schema for the goal creation finalization response.
// Matches GOAL_CREATION_FINALIZE_PROMPT output.
// See docs/AI_RESPONSE_SCHEMA.md for the full contract.
// TODO: Replace manual validation with Zod once `zod` is installed.

import {
  GOAL_CATEGORIES,
  GOAL_MEASURABLE_FREQUENCIES,
  GOAL_MEASURABLE_TYPES,
  GOAL_SMART_KEYS,
  type GoalCategory,
  type GoalMeasurableFrequency,
  type GoalMeasurableType,
  type GoalSmartData,
} from '@/lib/goals/schema';

export interface GoalFinalizeMeasurable {
  title: string;
  type: GoalMeasurableType;
  targetValue: number | null;
  targetUnit: string | null;
  frequency: GoalMeasurableFrequency;
}

export interface GoalFinalizeGoal {
  title: string;
  description: string;
  category: GoalCategory;
  deadline: string | null;
  smart: GoalSmartData;
}

export interface GoalFinalizeResponse {
  goal: GoalFinalizeGoal;
  measurables: GoalFinalizeMeasurable[];
  reasoning: string;
  assumptions: string[];
}

function parseGoalFinalizeJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Goal finalization response is empty');
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error('Goal finalization response is not valid JSON');
  }
}

export function validateGoalFinalizeResponse(parsed: unknown): GoalFinalizeResponse {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Goal finalization response must be a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.goal !== 'object' || obj.goal === null) {
    throw new Error('goal must be an object');
  }

  const g = obj.goal as Record<string, unknown>;
  if (typeof g.title !== 'string' || g.title.trim() === '') {
    throw new Error('goal.title must be a non-empty string');
  }
  if (typeof g.description !== 'string') {
    throw new Error('goal.description must be a string');
  }
  if (!GOAL_CATEGORIES.includes(g.category as GoalCategory)) {
    throw new Error(`goal.category must be one of: ${GOAL_CATEGORIES.join(', ')}`);
  }
  if (g.deadline !== null && typeof g.deadline !== 'string') {
    throw new Error('goal.deadline must be a string or null');
  }
  if (typeof g.smart !== 'object' || g.smart === null) {
    throw new Error('goal.smart must be an object');
  }
  const smart = g.smart as Record<string, unknown>;
  for (const key of GOAL_SMART_KEYS) {
    if (typeof smart[key] !== 'string') {
      throw new Error(`goal.smart.${key} must be a string`);
    }
  }

  if (!Array.isArray(obj.measurables)) {
    throw new Error('measurables must be an array');
  }
  for (const [index, m] of (obj.measurables as unknown[]).entries()) {
    if (typeof m !== 'object' || m === null) throw new Error('each measurable must be an object');
    const mObj = m as Record<string, unknown>;
    if (typeof mObj.title !== 'string' || mObj.title.trim() === '') {
      throw new Error(`measurable[${index}].title must be a non-empty string`);
    }
    if (!GOAL_MEASURABLE_TYPES.includes(mObj.type as GoalMeasurableType)) {
      throw new Error(`measurable[${index}].type must be one of: ${GOAL_MEASURABLE_TYPES.join(', ')}`);
    }
    if (!GOAL_MEASURABLE_FREQUENCIES.includes(mObj.frequency as GoalMeasurableFrequency)) {
      throw new Error(`measurable[${index}].frequency must be one of: ${GOAL_MEASURABLE_FREQUENCIES.join(', ')}`);
    }
    if (mObj.targetValue !== null && typeof mObj.targetValue !== 'number') {
      throw new Error(`measurable[${index}].targetValue must be a number or null`);
    }
    if (mObj.targetUnit !== null && typeof mObj.targetUnit !== 'string') {
      throw new Error(`measurable[${index}].targetUnit must be a string or null`);
    }

    if (mObj.type === 'counter') {
      if (typeof mObj.targetValue !== 'number' || !Number.isFinite(mObj.targetValue)) {
        throw new Error(`measurable[${index}].targetValue is required for counter measurables`);
      }
      if (typeof mObj.targetUnit !== 'string' || mObj.targetUnit.trim() === '') {
        throw new Error(`measurable[${index}].targetUnit is required for counter measurables`);
      }
    }

    if (mObj.type === 'checklist') {
      if (mObj.targetValue !== null) {
        throw new Error(`measurable[${index}].targetValue must be null for checklist measurables`);
      }
      if (mObj.targetUnit !== null) {
        throw new Error(`measurable[${index}].targetUnit must be null for checklist measurables`);
      }
    }
  }

  if (typeof obj.reasoning !== 'string') {
    throw new Error('reasoning must be a string');
  }

  const assumptions = obj.assumptions;
  if (assumptions !== undefined && (!Array.isArray(assumptions) || assumptions.some((item) => typeof item !== 'string'))) {
    throw new Error('assumptions must be an array of strings');
  }

  return {
    goal: {
      title: g.title.trim(),
      description: g.description.trim(),
      category: g.category as GoalCategory,
      deadline: g.deadline,
      smart: {
        specific: String(smart.specific).trim(),
        measurable: String(smart.measurable).trim(),
        achievable: String(smart.achievable).trim(),
        relevant: String(smart.relevant).trim(),
        timeBound: String(smart.timeBound).trim(),
      },
    },
    measurables: (obj.measurables as unknown[]).map((m) => {
      const mObj = m as Record<string, unknown>;
      return {
        title: String(mObj.title).trim(),
        type: mObj.type as GoalMeasurableType,
        targetValue: mObj.targetValue as number | null,
        targetUnit: typeof mObj.targetUnit === 'string' ? mObj.targetUnit.trim() : null,
        frequency: mObj.frequency as GoalMeasurableFrequency,
      };
    }),
    reasoning: obj.reasoning.trim(),
    assumptions: (assumptions as string[] | undefined)?.map((item) => item.trim()).filter(Boolean) ?? [],
  };
}

export function parseGoalFinalizeResponse(raw: string): GoalFinalizeResponse {
  return validateGoalFinalizeResponse(parseGoalFinalizeJson(raw));
}
