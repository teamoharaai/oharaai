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
  projectLeadId?: string | null;
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
  responsibleUserId?: string | null;
  assignedBy?: string | null;
  createdBy?: string | null;
}

/**
 * Sticky note: an owner-private, goal-bound freeform note authored inline on the
 * goal detail "Notes" tab. Modeled on milestones (own table, hero photo via the
 * goal-note-photos bucket) but with no completion/hierarchy — just a title, body,
 * and optional photo. Not a Momentum signal and not surfaced in Circles.
 */
export interface GoalNote {
  id: string;
  goalId: string;
  userId: string;
  title: string;
  body: string | null;
  /** Storage path of the hero photo (goal-note-photos bucket). */
  photoUrl: string | null;
  /** Sticky Note folder (vault_note_folders, migration 065). `null` = General. */
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalNoteInput {
  title: string;
  body?: string | null;
  /** Create the note directly into this folder. Omit/`null` = General. */
  folderId?: string | null;
}

export interface GoalNoteUpdates {
  title?: string;
  body?: string | null;
  photoUrl?: string | null;
  /** Move the note to this folder. `null` = General. */
  folderId?: string | null;
}

/** A per-goal Sticky Note folder (client-facing shape of vault_note_folders). */
export interface GoalNoteFolder {
  id: string;
  goalId: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
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
  notes: GoalNote[];
  /** Sticky Note folders for this goal (migration 065). Loaded on the detail
   *  path alongside notes; General is the virtual null bucket, not a member. */
  noteFolders: GoalNoteFolder[];
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
