export type GoalCategory = 'body' | 'mind' | 'money' | 'create' | 'connect' | 'contribute';
export type GoalMode = 'exploration' | 'commitment';
export type GoalStatus = 'active' | 'complete' | 'stagnant' | 'discovered';
export type BRTClassification = 'bud' | 'rose' | 'thorn';

export interface Profile {
  id: string;
  display_name: string;
  character_profile: Record<string, unknown>;
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
  smart_data: {
    specific?: string;
    measurable?: string;
    achievable?: string;
    relevant?: string;
    time_bound?: string;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  is_complete: boolean;
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  goal_id: string;
  user_id: string;
  summary: string;
  created_at: string;
}

export interface StarlogEntry {
  id: string;
  user_id: string;
  title: string;
  body: string;
  brt_classification: BRTClassification;
  created_at: string;
}

export interface Interest {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}
