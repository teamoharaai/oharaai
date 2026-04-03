import type { EchoEntry } from '@/features/echo/types';
import type { Measurable } from '@/features/goals/types';
import type { Goal } from '@/types/global';
import type {
  ActivityItem,
  EchoEntryActivity,
  GoalCreatedActivity,
  MilestoneCompletedActivity,
} from '@/types/activity';

export function mapEchoEntryToActivity(entry: EchoEntry): EchoEntryActivity {
  return {
    kind: 'echo_entry',
    id: entry.id,
    timestamp: entry.createdAt.toISOString(),
    entryId: entry.id,
    preview: entry.content.slice(0, 120),
    emotion: entry.emotion ?? null,
    brt: entry.brt ?? null,
  };
}

export function mapMilestoneToActivity(
  measurable: Measurable,
): MilestoneCompletedActivity {
  return {
    kind: 'milestone_completed',
    id: measurable.id,
    // Measurable has no completed_at; fall back to current time
    timestamp: new Date().toISOString(),
    measurableId: measurable.id,
    label: measurable.title,
  };
}

export function mapGoalCreatedToActivity(
  goal: Pick<Goal, 'id' | 'created_at'>,
): GoalCreatedActivity {
  return {
    kind: 'goal_created',
    id: goal.id,
    timestamp: goal.created_at,
  };
}

export function sortActivityItems(items: ActivityItem[]): ActivityItem[] {
  return [...items].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
