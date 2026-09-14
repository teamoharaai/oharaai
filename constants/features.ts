export { GOAL_CATEGORIES } from '@/lib/goals/schema';

export const FEATURES = {
  ECHO_ENABLED: true,
  INTELLIGENCE_ENABLED: true,
  DISCOVERY_ENABLED: false,
  CONSTELLATION_ENABLED: true,
  SOCIAL_ENABLED: true,
  COLLAGE_ENABLED: false,
  TASKS_V2_ENABLED: true,
  TASKS_V2_COMPARE_LEGACY: true,
} as const;

export const AI_FEATURES = {
  GOAL_CREATION_PIPELINE: false,
  ECHO_REFLECT_PIPELINE: false,
  SUMMARIZE_PIPELINE: false,
} as const;
