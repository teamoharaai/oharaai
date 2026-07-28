export { GOAL_CATEGORIES } from '@/lib/goals/schema';

export const FEATURES = {
  ECHO_ENABLED: true,
  INTELLIGENCE_ENABLED: true,
  DISCOVERY_ENABLED: false,
  CONSTELLATION_ENABLED: true,
  SOCIAL_ENABLED: true,
  COLLAGE_ENABLED: false,
} as const;

export const AI_FEATURES = {
  GOAL_CREATION_PIPELINE: false,
  ECHO_REFLECT_PIPELINE: false,
  SUMMARIZE_PIPELINE: false,
} as const;
