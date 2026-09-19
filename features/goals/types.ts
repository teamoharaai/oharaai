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

export interface GoalTargetFrequency {
  times: number;
  period: 'day' | 'week' | 'month';
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  colorTheme: GoalTheme;
  deadline: Date | null;
  targetFrequency: GoalTargetFrequency | null;
  visibility: GoalVisibility;
  progress: number;
  status: GoalStatus;
  completedAt: Date | null;
  archivedAt: Date | null;
  expiredAt: Date | null;
  aiGenerated: boolean;
  smartData: GoalSmartData | null;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  embedding?: number[] | null;
  embedding_text?: string | null;
  embedding_model?: string | null;
}

/**
 * Milestone kind. Milestones are one-time, story-bearing achievements that can
 * carry a hero photo, a surfaced reflection, and sub-milestones — the substrate
 * the Phase 2 social layer surfaces. The `prep` variant (a lightweight enabling
 * checklist) was retired in the Goal Detail Redesign: recurring/enabling work now
 * lives in Tasks, so `achievement` is the only kind. The DB `kind` column + CHECK
 * still permit `prep` historically, but nothing authors it and migration 055
 * deletes the surviving prep rows.
 */
export type MilestoneKind = 'achievement';

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
  kind: MilestoneKind;
  /** Non-null on a sub-milestone; points at its parent achievement milestone. */
  parentId: string | null;
  /** Optional target for an achievement with sub-milestones (e.g. 3 recipes). */
  targetCount: number | null;
  /** Storage path of the hero evidence photo (milestone-photos bucket). */
  photoUrl: string | null;
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
  kind?: MilestoneKind;
  parentId?: string | null;
  targetCount?: number | null;
  photoUrl?: string | null;
}

export interface GoalMilestoneUpdates {
  title?: string;
  description?: string | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  sortOrder?: number;
  kind?: MilestoneKind;
  targetCount?: number | null;
  photoUrl?: string | null;
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
