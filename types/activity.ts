import type { EchoBrt } from '@/features/echo/types';
import type { EchoEmotion } from '@/features/echo/types';
import type { VaultItemType } from '@/types/vault';

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
  | GoalCreatedActivity
  | {
      kind: 'vault_item_added';
      id: string;
      itemType: VaultItemType;
      title: string;
      timestamp: string;
    }
  | {
      kind: 'insight_confirmed';
      id: string;
      content: string;
      timestamp: string;
    }
  | {
      kind: 'echo_linked';
      id: string;
      echoEntryId: string;
      preview: string;
      brt: EchoBrt | null;
      timestamp: string;
    };
