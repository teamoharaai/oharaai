import type { EchoBrt, EchoEmotion } from '@/features/echo/types';

export type ActivityKind = 'echo_entry' | 'milestone_completed' | 'goal_created';

interface ActivityBase {
  id: string;
  timestamp: string; // ISO string, used for sorting
}

export interface EchoEntryActivity extends ActivityBase {
  kind: 'echo_entry';
  entryId: string;
  preview: string;      // truncated content, max 120 chars
  emotion: EchoEmotion | null;
  brt: EchoBrt | null;
}

export interface MilestoneCompletedActivity extends ActivityBase {
  kind: 'milestone_completed';
  measurableId: string;
  label: string;
}

export interface GoalCreatedActivity extends ActivityBase {
  kind: 'goal_created';
}

export type ActivityItem =
  | EchoEntryActivity
  | MilestoneCompletedActivity
  | GoalCreatedActivity;
