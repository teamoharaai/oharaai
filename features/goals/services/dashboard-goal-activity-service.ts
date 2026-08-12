import supabase from '@/lib/db/client';
import {
  resolveGoalActivityByGoalId,
  type GoalActivityByGoalId,
  type GoalCompletedActionRow,
  type GoalLinkedEntryActivityRow,
} from '../dashboard-goal-activity';

export async function fetchDashboardGoalActivity(
  userId: string,
  goalIds: readonly string[],
): Promise<GoalActivityByGoalId> {
  if (goalIds.length === 0) return {};

  const [entriesResult, actionsResult] = await Promise.all([
    supabase
      .from('entry_goal_links')
      .select('goal_id, entries!inner(entry_type, title, updated_at, archived, user_id)')
      .in('goal_id', [...goalIds])
      .eq('entries.user_id', userId)
      .eq('entries.archived', false),
    supabase
      .from('action_logs')
      .select('goal_id, action_text, completed_at')
      .eq('user_id', userId)
      .in('goal_id', [...goalIds])
      .eq('status', 'complete')
      .not('completed_at', 'is', null),
  ]);

  if (entriesResult.error) throw entriesResult.error;
  if (actionsResult.error) throw actionsResult.error;

  return resolveGoalActivityByGoalId(
    goalIds,
    (entriesResult.data ?? []) as unknown as GoalLinkedEntryActivityRow[],
    (actionsResult.data ?? []) as GoalCompletedActionRow[],
  );
}
