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
  // Circles friends-only social layer (Home). Off until the client swap is
  // QA'd against live data (Phase 8). When false, Home renders greeting +
  // Today's Focus + drafts with no feed and no Circles fetches on mount.
  CIRCLES_ENABLED: false,
} as const;

export const AI_FEATURES = {
  GOAL_CREATION_PIPELINE: false,
  ECHO_REFLECT_PIPELINE: false,
  SUMMARIZE_PIPELINE: false,
} as const;
