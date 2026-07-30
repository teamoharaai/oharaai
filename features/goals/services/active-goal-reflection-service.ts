import supabase from '@/lib/db/client';
import {
  resolveEntryReflectionTimestamps,
  type EntryReflectionTimestampRow,
  type ReflectionTimestampsByGoalId,
} from '../active-goal-selectors';

export async function fetchActiveGoalReflectionTimestamps(
  activeGoalIds: readonly string[],
): Promise<ReflectionTimestampsByGoalId> {
  if (activeGoalIds.length === 0) return {};

  const { data, error } = await supabase
    .from('entry_goal_links')
    .select('goal_id, entries!inner(updated_at, entry_type, archived)')
    .in('goal_id', [...activeGoalIds])
    .eq('entries.entry_type', 'reflection')
    .eq('entries.archived', false);

  if (error) throw error;
  return resolveEntryReflectionTimestamps(
    activeGoalIds,
    (data ?? []) as unknown as EntryReflectionTimestampRow[],
  );
}
