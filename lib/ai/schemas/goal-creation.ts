// Runtime schema for the goal creation finalization response.
// Matches GOAL_CREATION_FINALIZE_PROMPT output.
// See docs/AI_RESPONSE_SCHEMA.md for the full contract.
// TODO: Replace manual validation with Zod once `zod` is installed.

import type { GoalCategory } from '../prompts/goal-creation';

const VALID_CATEGORIES: ReadonlyArray<GoalCategory> = [
  'body', 'mind', 'money', 'create', 'connect', 'contribute',
];
const VALID_TYPES = ['counter', 'habit', 'checklist'] as const;
const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly', 'once'] as const;

export type MeasurableType = (typeof VALID_TYPES)[number];
export type MeasurableFrequency = (typeof VALID_FREQUENCIES)[number];

export interface GoalFinalizeMeasurable {
  title: string;
  type: MeasurableType;
  targetValue: number | null;
  targetUnit: string | null;
  frequency: MeasurableFrequency;
}

export interface GoalFinalizeResponse {
  goal: {
    title: string;
    description: string;
    category: GoalCategory;
    deadline: string | null;
    smart: {
      specific: string;
      measurable: string;
      achievable: string;
      relevant: string;
      timeBound: string;
    };
  };
  measurables: GoalFinalizeMeasurable[];
  reasoning: string;
  assumptions?: string[];
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
  if (!VALID_CATEGORIES.includes(g.category as GoalCategory)) {
    throw new Error(`goal.category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (g.deadline !== null && typeof g.deadline !== 'string') {
    throw new Error('goal.deadline must be a string or null');
  }
  if (typeof g.smart !== 'object' || g.smart === null) {
    throw new Error('goal.smart must be an object');
  }
  const smart = g.smart as Record<string, unknown>;
  for (const key of ['specific', 'measurable', 'achievable', 'relevant', 'timeBound']) {
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
    if (!VALID_TYPES.includes(mObj.type as MeasurableType)) {
      throw new Error(`measurable[${index}].type must be one of: ${VALID_TYPES.join(', ')}`);
    }
    if (!VALID_FREQUENCIES.includes(mObj.frequency as MeasurableFrequency)) {
      throw new Error(`measurable[${index}].frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`);
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

  if (obj.assumptions !== undefined) {
    if (!Array.isArray(obj.assumptions) || obj.assumptions.some((item) => typeof item !== 'string')) {
      throw new Error('assumptions must be an array of strings');
    }
  }

  return parsed as GoalFinalizeResponse;
}

export function parseGoalFinalizeResponse(raw: string): GoalFinalizeResponse {
  return validateGoalFinalizeResponse(parseGoalFinalizeJson(raw));
}
