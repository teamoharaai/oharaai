import type { GoalCategory, GoalDbStatus, GoalSmartData } from '@/lib/goals/schema';

export type GoalMode = 'exploration' | 'commitment';
export type GoalStatus = GoalDbStatus;
export type BRTClassification = 'bud' | 'rose' | 'thorn';

export interface Profile {
  id: string;
  display_name: string;
  character_profile: Record<string, unknown>;
  interests: unknown[];
  context: Record<string, unknown>;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: GoalCategory;
  mode: GoalMode;
  status: GoalStatus;
  is_private: boolean;
  community_id: string | null;
  smart_data: Partial<GoalSmartData>;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  due_date: string | null;
  complete: boolean;
  created_at: string;
}

export interface StarlogSession {
  id: string;
  goal_id: string | null;
  user_id: string;
  summary: Record<string, unknown>;
  created_at: string;
}

export interface StarlogEntry {
  id: string;
  user_id: string;
  goal_id: string | null;
  entry_text: string;
  guide_response: Record<string, unknown> | null;
  brt_classification: BRTClassification | null;
  is_public: boolean;
  created_at: string;
}

export interface Interest {
  id: string;
  user_id: string;
  source_thorn_id: string | null;
  promoted_goal_id: string | null;
  name: string;
  status: 'suggested' | 'exploring' | 'promoted' | 'dismissed';
  created_at: string;
}
