import type { SupabaseClient } from '@supabase/supabase-js';
import {
  resolveEntryReflectionTimestamps,
  type EntryReflectionTimestampRow,
  type ReflectionTimestampsByGoalId,
} from '@/features/goals/active-goal-selectors';

/**
 * Latest reflection-entry timestamp per active goal for `userId`, server-side.
 *
 * Mirrors the former client query in
 * `features/goals/services/active-goal-reflection-service.ts`, but the server
 * resolves the caller's own active goal ids so the client no longer has to load
 * goals first — that client-side dependency was a waterfall on Home. Own goals
 * only (RLS scopes the rows; the explicit user_id filter narrows the goal set).
 */
export async function fetchActiveGoalReflectionTimestamps(
  db: SupabaseClient,
  userId: string,
): Promise<ReflectionTimestampsByGoalId> {
  const { data: activeGoals, error: goalsError } = await db
    .from('goals')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (goalsError) throw goalsError;

  const goalIds = (activeGoals ?? []).map((goal) => (goal as { id: string }).id);
  if (goalIds.length === 0) return {};

  const { data, error } = await db
    .from('entry_goal_links')
    .select('goal_id, entries!inner(updated_at, entry_type, archived)')
    .in('goal_id', goalIds)
    .eq('entries.entry_type', 'reflection')
    .eq('entries.archived', false);
  if (error) throw error;

  return resolveEntryReflectionTimestamps(
    goalIds,
    (data ?? []) as unknown as EntryReflectionTimestampRow[],
  );
}
