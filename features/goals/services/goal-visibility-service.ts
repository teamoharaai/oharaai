import supabase from '@/lib/db/client';
export type GoalVisibilityChoice = 'private' | 'circle' | 'public';

export async function saveGoalVisibility(goalId: string, visibility: GoalVisibilityChoice, audience: string[]) {
  const { error } = await supabase.rpc('set_goal_visibility_v2', {
    p_goal_id: goalId, p_visibility: visibility, p_audience: audience,
  });
  if (error) throw new Error(error.message);
}

export async function goalAudience(goalId: string): Promise<string[]> {
  const { data, error } = await supabase.from('goal_share_invites').select('invitee_id')
    .eq('goal_id', goalId).in('status', ['pending', 'accepted']);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.invitee_id);
}
