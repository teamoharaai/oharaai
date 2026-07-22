// Runtime schema for the goal creation finalization response.
// Matches GOAL_CREATION_FINALIZE_PROMPT output: 3 goal templates the user
// chooses from on the review screen.
// See docs/AI_RESPONSE_SCHEMA.md for the full contract.
// TODO: Replace manual validation with Zod once `zod` is installed.

import {
  GOAL_CREATION_CATEGORIES,
  GOAL_SMART_KEYS,
  GOAL_TRACKER_FREQUENCIES,
  GOAL_TRACKER_TYPES,
  type GoalCreationCategory,
  type GoalSmartData,
  type GoalTrackerFrequency,
  type GoalTrackerType,
} from '@/lib/goals/schema';

export interface GoalTemplateMilestone {
  title: string;
  description?: string | null;
  dueDate?: string | null;
}

export interface GoalTemplateTracker {
  title: string;
  type: GoalTrackerType;
  targetValue?: number | null;
  targetUnit?: string | null;
  frequency?: GoalTrackerFrequency | null;
}

export interface GoalTemplateTargetFrequency {
  times: number;
  period: 'day' | 'week' | 'month';
}

export interface GoalTemplateOption {
  strategy_name: string;
  goal: {
    title: string;
    description: string;
    category: GoalCreationCategory;
    deadline: string;
    smart: GoalSmartData;
  };
  milestones: GoalTemplateMilestone[];
  trackers: GoalTemplateTracker[];
  target_frequency: GoalTemplateTargetFrequency | null;
}

export interface GoalTemplateResponse {
  templates: [GoalTemplateOption, GoalTemplateOption, GoalTemplateOption];
  derived_category: GoalCreationCategory;
  reasoning: string;
  assumptions: string[];
}

export type ValidateResult =
  | { success: true; data: GoalTemplateResponse }
  | { success: false; error: string };

const TARGET_FREQUENCY_PERIODS = ['day', 'week', 'month'] as const;

function parseGoalTemplateJson(raw: string): unknown {
  // Strip markdown fences and trim, then parse.
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  if (!cleaned) {
    throw new Error('Goal finalization response is empty');
  }
  return JSON.parse(cleaned);
}

function isFutureDate(value: string): boolean {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  return time > Date.now();
}

function validateTemplate(raw: unknown, index: number): GoalTemplateOption | string {
  if (typeof raw !== 'object' || raw === null) {
    return `templates[${index}] must be an object`;
  }
  const t = raw as Record<string, unknown>;

  if (typeof t.strategy_name !== 'string' || t.strategy_name.trim() === '') {
    return `templates[${index}].strategy_name must be a non-empty string`;
  }

  if (typeof t.goal !== 'object' || t.goal === null) {
    return `templates[${index}].goal must be an object`;
  }
  const g = t.goal as Record<string, unknown>;

  if (typeof g.title !== 'string' || g.title.trim() === '') {
    return `templates[${index}].goal.title must be a non-empty string`;
  }
  if (typeof g.description !== 'string') {
    return `templates[${index}].goal.description must be a string`;
  }
  if (!GOAL_CREATION_CATEGORIES.includes(g.category as GoalCreationCategory)) {
    return `templates[${index}].goal.category must be one of: ${GOAL_CREATION_CATEGORIES.join(', ')}`;
  }
  if (typeof g.deadline !== 'string' || g.deadline.trim() === '') {
    return `templates[${index}].goal.deadline must be a non-empty ISO date string`;
  }
  if (!isFutureDate(g.deadline)) {
    return `templates[${index}].goal.deadline must be a valid ISO date in the future`;
  }
  if (typeof g.smart !== 'object' || g.smart === null) {
    return `templates[${index}].goal.smart must be an object`;
  }
  const smart = g.smart as Record<string, unknown>;
  for (const key of GOAL_SMART_KEYS) {
    if (typeof smart[key] !== 'string' || smart[key].trim() === '') {
      return `templates[${index}].goal.smart.${key} must be a non-empty string`;
    }
  }

  if (!Array.isArray(t.milestones)) {
    return `templates[${index}].milestones must be an array`;
  }
  for (const [mIndex, m] of (t.milestones as unknown[]).entries()) {
    if (typeof m !== 'object' || m === null) {
      return `templates[${index}].milestones[${mIndex}] must be an object`;
    }
    const mObj = m as Record<string, unknown>;
    if (typeof mObj.title !== 'string' || mObj.title.trim() === '') {
      return `templates[${index}].milestones[${mIndex}].title must be a non-empty string`;
    }
    if (
      mObj.description !== undefined
      && mObj.description !== null
      && typeof mObj.description !== 'string'
    ) {
      return `templates[${index}].milestones[${mIndex}].description must be a string or null`;
    }
    if (mObj.dueDate !== undefined && mObj.dueDate !== null && typeof mObj.dueDate !== 'string') {
      return `templates[${index}].milestones[${mIndex}].dueDate must be a string or null`;
    }
    if (
      typeof mObj.dueDate === 'string'
      && (mObj.dueDate.trim() === '' || Number.isNaN(new Date(mObj.dueDate).getTime()))
    ) {
      return `templates[${index}].milestones[${mIndex}].dueDate must be a parseable date or null`;
    }
  }

  if (!Array.isArray(t.trackers)) {
    return `templates[${index}].trackers must be an array`;
  }
  for (const [trIndex, tracker] of (t.trackers as unknown[]).entries()) {
    if (typeof tracker !== 'object' || tracker === null) {
      return `templates[${index}].trackers[${trIndex}] must be an object`;
    }
    const tr = tracker as Record<string, unknown>;
    if (typeof tr.title !== 'string' || tr.title.trim() === '') {
      return `templates[${index}].trackers[${trIndex}].title must be a non-empty string`;
    }
    if (!GOAL_TRACKER_TYPES.includes(tr.type as GoalTrackerType)) {
      return `templates[${index}].trackers[${trIndex}].type must be one of: ${GOAL_TRACKER_TYPES.join(', ')}`;
    }
    if (
      tr.frequency !== undefined
      && tr.frequency !== null
      && !GOAL_TRACKER_FREQUENCIES.includes(tr.frequency as GoalTrackerFrequency)
    ) {
      return `templates[${index}].trackers[${trIndex}].frequency must be one of: ${GOAL_TRACKER_FREQUENCIES.join(', ')} or null`;
    }
    if (
      tr.targetValue !== undefined
      && tr.targetValue !== null
      && typeof tr.targetValue !== 'number'
    ) {
      return `templates[${index}].trackers[${trIndex}].targetValue must be a number or null`;
    }
    if (
      tr.targetUnit !== undefined
      && tr.targetUnit !== null
      && typeof tr.targetUnit !== 'string'
    ) {
      return `templates[${index}].trackers[${trIndex}].targetUnit must be a string or null`;
    }

    if (tr.type === 'counter') {
      if (
        typeof tr.targetValue !== 'number'
        || !Number.isFinite(tr.targetValue)
        || tr.targetValue <= 0
      ) {
        return `templates[${index}].trackers[${trIndex}].targetValue must be greater than 0 for counter trackers`;
      }
      if (typeof tr.targetUnit !== 'string' || tr.targetUnit.trim() === '') {
        return `templates[${index}].trackers[${trIndex}].targetUnit is required for counter trackers`;
      }
    }

    if (tr.type === 'checklist') {
      if (tr.targetValue !== undefined && tr.targetValue !== null) {
        return `templates[${index}].trackers[${trIndex}].targetValue must be null for checklist trackers`;
      }
      if (tr.targetUnit !== undefined && tr.targetUnit !== null) {
        return `templates[${index}].trackers[${trIndex}].targetUnit must be null for checklist trackers`;
      }
    }
  }

  let targetFrequency: GoalTemplateTargetFrequency | null = null;
  if (t.target_frequency !== undefined && t.target_frequency !== null) {
    if (typeof t.target_frequency !== 'object') {
      return `templates[${index}].target_frequency must be an object or null`;
    }
    const tf = t.target_frequency as Record<string, unknown>;
    if (typeof tf.times !== 'number' || !Number.isFinite(tf.times) || tf.times <= 0) {
      return `templates[${index}].target_frequency.times must be a number greater than 0`;
    }
    if (!TARGET_FREQUENCY_PERIODS.includes(tf.period as GoalTemplateTargetFrequency['period'])) {
      return `templates[${index}].target_frequency.period must be one of: ${TARGET_FREQUENCY_PERIODS.join(', ')}`;
    }
    targetFrequency = {
      times: tf.times,
      period: tf.period as GoalTemplateTargetFrequency['period'],
    };
  }

  return {
    strategy_name: t.strategy_name.trim(),
    goal: {
      title: g.title.trim(),
      description: g.description.trim(),
      category: g.category as GoalCreationCategory,
      deadline: g.deadline.trim(),
      smart: {
        specific: String(smart.specific).trim(),
        measurable: String(smart.measurable).trim(),
        achievable: String(smart.achievable).trim(),
        relevant: String(smart.relevant).trim(),
        timeBound: String(smart.timeBound).trim(),
      },
    },
    milestones: (t.milestones as unknown[]).map((milestone) => {
      const mObj = milestone as Record<string, unknown>;
      return {
        title: String(mObj.title).trim(),
        description:
          typeof mObj.description === 'string' ? mObj.description.trim() || null : null,
        dueDate: typeof mObj.dueDate === 'string' ? mObj.dueDate.trim() : null,
      };
    }),
    trackers: (t.trackers as unknown[]).map((tracker) => {
      const tr = tracker as Record<string, unknown>;
      return {
        title: String(tr.title).trim(),
        type: tr.type as GoalTrackerType,
        targetValue: typeof tr.targetValue === 'number' ? tr.targetValue : null,
        targetUnit: typeof tr.targetUnit === 'string' ? tr.targetUnit.trim() || null : null,
        frequency: GOAL_TRACKER_FREQUENCIES.includes(tr.frequency as GoalTrackerFrequency)
          ? (tr.frequency as GoalTrackerFrequency)
          : null,
      };
    }),
    target_frequency: targetFrequency,
  };
}

export function validateGoalTemplateResponse(parsed: unknown): ValidateResult {
  if (typeof parsed !== 'object' || parsed === null) {
    return { success: false, error: 'Goal finalization response must be a JSON object' };
  }

  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.templates)) {
    return { success: false, error: 'templates must be an array' };
  }
  if (obj.templates.length !== 3) {
    return { success: false, error: 'templates must contain exactly 3 items' };
  }

  const validated: GoalTemplateOption[] = [];
  for (const [index, template] of obj.templates.entries()) {
    const result = validateTemplate(template, index);
    if (typeof result === 'string') {
      return { success: false, error: result };
    }
    validated.push(result);
  }

  if (!GOAL_CREATION_CATEGORIES.includes(obj.derived_category as GoalCreationCategory)) {
    return {
      success: false,
      error: `derived_category must be one of: ${GOAL_CREATION_CATEGORIES.join(', ')}`,
    };
  }

  if (typeof obj.reasoning !== 'string') {
    return { success: false, error: 'reasoning must be a string' };
  }

  const assumptions = obj.assumptions;
  if (
    assumptions !== undefined
    && (!Array.isArray(assumptions) || assumptions.some((item) => typeof item !== 'string'))
  ) {
    return { success: false, error: 'assumptions must be an array of strings' };
  }

  return {
    success: true,
    data: {
      templates: validated as [GoalTemplateOption, GoalTemplateOption, GoalTemplateOption],
      derived_category: obj.derived_category as GoalCreationCategory,
      reasoning: obj.reasoning.trim(),
      assumptions:
        (assumptions as string[] | undefined)?.map((item) => item.trim()).filter(Boolean) ?? [],
    },
  };
}

export function parseGoalTemplateResponse(raw: string): ValidateResult {
  let parsed: unknown;
  try {
    parsed = parseGoalTemplateJson(raw);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Goal finalization response is not valid JSON',
    };
  }
  return validateGoalTemplateResponse(parsed);
}
