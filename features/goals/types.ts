import type { GoalTheme } from '@/constants/themes';
import type {
  GoalCategory,
  GoalDbStatus,
  GoalSmartData,
  GoalTrackerFrequency,
  GoalTrackerType,
  GoalVisibility,
} from '@/lib/goals/schema';

export type GoalStatus = GoalDbStatus;
export type TrackerType = GoalTrackerType;
export type TrackerFrequency = GoalTrackerFrequency;

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  colorTheme: GoalTheme;
  deadline: Date | null;
  visibility: GoalVisibility;
  progress: number;
  status: GoalStatus;
  aiGenerated: boolean;
  smartData: GoalSmartData | null;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  embedding?: number[] | null;
  embedding_text?: string | null;
  embedding_model?: string | null;
}

export interface GoalMilestone {
  id: string;
  goalId: string;
  userId: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  sortOrder: number;
  isAiSuggested: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tracker {
  id: string;
  goalId: string;
  title: string;
  type: TrackerType;
  targetValue: number | null;
  targetUnit: string | null;
  frequency: TrackerFrequency | null;
  currentValue: number;
  isAiSuggested: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackerLog {
  id: string;
  trackerId: string;
  value: number;
  note?: string;
  loggedAt: Date;
}

export type PriorPhaseSummaryItem =
  | {
      title: string;
      achieved: number;
      target: number | null;
    }
  | {
      title: string;
      completions: number;
    };

export interface GoalSuccessor {
  id: string;
  reflection: string | null;
  reflectedAt: Date | null;
}

export interface GoalWithDetails extends Goal {
  has_successor: boolean;
  successor: GoalSuccessor | null;
  previous_goal_id: string | null;
  prior_phase_summary: PriorPhaseSummaryItem[] | null;
  reflection: string | null;
  reflected_at: Date | null;
  milestones: GoalMilestone[];
  trackers: Tracker[];
  vaultItemCount: number;
  echoLinkCount: number;
  latestBrtTags: string[] | null;
}

export interface GoalMilestoneInput {
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  sortOrder?: number;
  isAiSuggested?: boolean;
}

export interface GoalMilestoneUpdates {
  title?: string;
  description?: string | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  sortOrder?: number;
}

export interface TrackerInput {
  title: string;
  type: TrackerType;
  targetValue?: number | null;
  targetUnit?: string | null;
  frequency?: TrackerFrequency | null;
  sortOrder?: number;
  isAiSuggested?: boolean;
}

export interface TrackerUpdates {
  title?: string;
  targetValue?: number | null;
  targetUnit?: string | null;
  frequency?: TrackerFrequency | null;
  currentValue?: number;
  sortOrder?: number;
}
