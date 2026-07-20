import type { EchoBrt } from '@/features/echo/types';
import type { EchoEmotion } from '@/features/echo/types';
import type { VaultItemType } from '@/types/vault';

export type ActivityKind =
  | 'echo_entry'
  | 'milestone_completed'
  | 'tracker_logged'
  | 'goal_created'
  | 'vault_item_added'
  | 'insight_confirmed'
  | 'echo_linked';

interface ActivityBase {
  id: string;
  timestamp: string; // ISO string, used for sorting
}

export interface EchoEntryActivity extends ActivityBase {
  kind: 'echo_entry';
  entryId: string;
  preview: string;      // truncated content, max 120 chars
  aiResponse: string | null;
  emotion: EchoEmotion | null;
  brt: EchoBrt | null;
}

export interface MilestoneCompletedActivity extends ActivityBase {
  kind: 'milestone_completed';
  milestoneId: string;
  label: string;
}

export interface TrackerLoggedActivity extends ActivityBase {
  kind: 'tracker_logged';
  trackerId: string;
  label: string;
  value: number;
  note: string | null;
}

export interface GoalCreatedActivity extends ActivityBase {
  kind: 'goal_created';
}

export interface VaultItemAddedActivity extends ActivityBase {
  kind: 'vault_item_added';
  itemType: VaultItemType;
  title: string;
}

export interface InsightConfirmedActivity extends ActivityBase {
  kind: 'insight_confirmed';
  content: string;
}

export interface EchoLinkedActivity extends ActivityBase {
  kind: 'echo_linked';
  echoEntryId: string;
  preview: string;
  brt: EchoBrt | null;
}

export type ActivityItem =
  | EchoEntryActivity
  | MilestoneCompletedActivity
  | TrackerLoggedActivity
  | GoalCreatedActivity
  | VaultItemAddedActivity
  | InsightConfirmedActivity
  | EchoLinkedActivity;
