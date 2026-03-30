export const GOAL_CATEGORIES = [
  'body',
  'mind',
  'money',
  'create',
  'connect',
  'contribute',
] as const;

export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

export const GOAL_SMART_KEYS = [
  'specific',
  'measurable',
  'achievable',
  'relevant',
  'timeBound',
] as const;

export type GoalSmartKey = (typeof GOAL_SMART_KEYS)[number];

export interface GoalSmartData {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}

export const GOAL_MEASURABLE_TYPES = ['counter', 'habit', 'checklist'] as const;
export type GoalMeasurableType = (typeof GOAL_MEASURABLE_TYPES)[number];

export const GOAL_MEASURABLE_FREQUENCIES = ['daily', 'weekly', 'monthly', 'once'] as const;
export type GoalMeasurableFrequency = (typeof GOAL_MEASURABLE_FREQUENCIES)[number];

export const GOAL_DB_STATUSES = ['active', 'complete', 'stagnant', 'discovered'] as const;
export type GoalDbStatus = (typeof GOAL_DB_STATUSES)[number];
