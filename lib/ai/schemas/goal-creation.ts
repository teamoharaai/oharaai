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
}

export function parseGoalFinalizeResponse(raw: string): GoalFinalizeResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Goal finalization response is not valid JSON');
  }

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
  for (const m of obj.measurables as unknown[]) {
    if (typeof m !== 'object' || m === null) throw new Error('each measurable must be an object');
    const mObj = m as Record<string, unknown>;
    if (typeof mObj.title !== 'string') throw new Error('measurable.title must be a string');
    if (!VALID_TYPES.includes(mObj.type as MeasurableType)) {
      throw new Error(`measurable.type must be one of: ${VALID_TYPES.join(', ')}`);
    }
    if (!VALID_FREQUENCIES.includes(mObj.frequency as MeasurableFrequency)) {
      throw new Error(`measurable.frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`);
    }
  }

  return parsed as GoalFinalizeResponse;
}
