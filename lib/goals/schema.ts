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

export const GOAL_TRACKER_TYPES = ['counter', 'habit', 'checklist'] as const;
export type GoalTrackerType = (typeof GOAL_TRACKER_TYPES)[number];

export const GOAL_TRACKER_FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;
export type GoalTrackerFrequency = (typeof GOAL_TRACKER_FREQUENCIES)[number];

export const GOAL_DB_STATUSES = [
  'active',
  'complete',
  'stagnant',
  'discovered',
  'archived',
] as const;
export type GoalDbStatus = (typeof GOAL_DB_STATUSES)[number];

export const GOAL_VISIBILITIES = ['private', 'circle', 'public'] as const;
export type GoalVisibility = (typeof GOAL_VISIBILITIES)[number];
