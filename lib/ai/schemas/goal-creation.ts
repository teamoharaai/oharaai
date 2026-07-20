// Runtime schema for the goal creation finalization response.
// Matches GOAL_CREATION_FINALIZE_PROMPT output.
// See docs/AI_RESPONSE_SCHEMA.md for the full contract.
// TODO: Replace manual validation with Zod once `zod` is installed.

import {
  GOAL_CATEGORIES,
  GOAL_SMART_KEYS,
  GOAL_TRACKER_FREQUENCIES,
  GOAL_TRACKER_TYPES,
  type GoalCategory,
  type GoalSmartData,
  type GoalTrackerFrequency,
  type GoalTrackerType,
} from '@/lib/goals/schema';

export interface GoalFinalizeMilestone {
  title: string;
  description: string | null;
  dueDate: string | null;
}

export interface GoalFinalizeTracker {
  title: string;
  type: GoalTrackerType;
  targetValue: number | null;
  targetUnit: string | null;
  frequency: GoalTrackerFrequency;
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
  milestones: GoalFinalizeMilestone[];
  trackers: GoalFinalizeTracker[];
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

  if (!Array.isArray(obj.milestones)) {
    throw new Error('milestones must be an array');
  }
  for (const [index, m] of (obj.milestones as unknown[]).entries()) {
    if (typeof m !== 'object' || m === null) throw new Error('each milestone must be an object');
    const mObj = m as Record<string, unknown>;
    if (typeof mObj.title !== 'string' || mObj.title.trim() === '') {
      throw new Error(`milestone[${index}].title must be a non-empty string`);
    }
    if (mObj.description !== null && typeof mObj.description !== 'string') {
      throw new Error(`milestone[${index}].description must be a string or null`);
    }
    if (mObj.dueDate !== null && typeof mObj.dueDate !== 'string') {
      throw new Error(`milestone[${index}].dueDate must be a string or null`);
    }
    if (
      typeof mObj.dueDate === 'string'
      && (mObj.dueDate.trim() === '' || Number.isNaN(new Date(mObj.dueDate).getTime()))
    ) {
      throw new Error(`milestone[${index}].dueDate must be a parseable date or null`);
    }
  }

  if (!Array.isArray(obj.trackers)) {
    throw new Error('trackers must be an array');
  }
  for (const [index, tracker] of (obj.trackers as unknown[]).entries()) {
    if (typeof tracker !== 'object' || tracker === null) {
      throw new Error('each tracker must be an object');
    }
    const trackerObj = tracker as Record<string, unknown>;
    if (typeof trackerObj.title !== 'string' || trackerObj.title.trim() === '') {
      throw new Error(`tracker[${index}].title must be a non-empty string`);
    }
    if (!GOAL_TRACKER_TYPES.includes(trackerObj.type as GoalTrackerType)) {
      throw new Error(`tracker[${index}].type must be one of: ${GOAL_TRACKER_TYPES.join(', ')}`);
    }
    if (!GOAL_TRACKER_FREQUENCIES.includes(trackerObj.frequency as GoalTrackerFrequency)) {
      throw new Error(
        `tracker[${index}].frequency must be one of: ${GOAL_TRACKER_FREQUENCIES.join(', ')}`,
      );
    }
    if (trackerObj.targetValue !== null && typeof trackerObj.targetValue !== 'number') {
      throw new Error(`tracker[${index}].targetValue must be a number or null`);
    }
    if (trackerObj.targetUnit !== null && typeof trackerObj.targetUnit !== 'string') {
      throw new Error(`tracker[${index}].targetUnit must be a string or null`);
    }

    if (trackerObj.type === 'counter') {
      if (
        typeof trackerObj.targetValue !== 'number'
        || !Number.isFinite(trackerObj.targetValue)
        || trackerObj.targetValue <= 0
      ) {
        throw new Error(
          `tracker[${index}].targetValue must be greater than 0 for counter trackers`,
        );
      }
      if (typeof trackerObj.targetUnit !== 'string' || trackerObj.targetUnit.trim() === '') {
        throw new Error(`tracker[${index}].targetUnit is required for counter trackers`);
      }
    }

    if (trackerObj.type === 'checklist') {
      if (trackerObj.targetValue !== null) {
        throw new Error(`tracker[${index}].targetValue must be null for checklist trackers`);
      }
      if (trackerObj.targetUnit !== null) {
        throw new Error(`tracker[${index}].targetUnit must be null for checklist trackers`);
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
    milestones: (obj.milestones as unknown[]).map((milestone) => {
      const milestoneObj = milestone as Record<string, unknown>;
      return {
        title: String(milestoneObj.title).trim(),
        description:
          typeof milestoneObj.description === 'string'
            ? milestoneObj.description.trim() || null
            : null,
        dueDate: typeof milestoneObj.dueDate === 'string' ? milestoneObj.dueDate.trim() : null,
      };
    }),
    trackers: (obj.trackers as unknown[]).map((tracker) => {
      const trackerObj = tracker as Record<string, unknown>;
      return {
        title: String(trackerObj.title).trim(),
        type: trackerObj.type as GoalTrackerType,
        targetValue: trackerObj.targetValue as number | null,
        targetUnit:
          typeof trackerObj.targetUnit === 'string' ? trackerObj.targetUnit.trim() : null,
        frequency: trackerObj.frequency as GoalTrackerFrequency,
      };
    }),
    reasoning: obj.reasoning.trim(),
    assumptions: (assumptions as string[] | undefined)?.map((item) => item.trim()).filter(Boolean) ?? [],
  };
}

export function parseGoalFinalizeResponse(raw: string): GoalFinalizeResponse {
  return validateGoalFinalizeResponse(parseGoalFinalizeJson(raw));
}
