// Goal-activity L1 reader — resolves raw rows to normalized GoalActivityEvent[]
// (each carrying a LOCAL 'YYYY-MM-DD' date). The single bucketing timezone is the
// user's profiles.timezone (TD-006); per-schedule timezones are NOT used because
// the Phase C union sources (Entries, milestones) carry none. All local-date
// resolution happens here so the pure buildActivityWindow stays tz-agnostic.
//
// Phase B ships the `task_completed` source only (task_occurrences reaching
// status='completed'), so the visual renders against data that already exists.
// Phase C will add `entry_created` + `milestone_completed` behind the same
// signature — no contract change. This reader only READS; it never touches the
// frozen trackers / tracker_logs.

import type { SupabaseClient } from '@supabase/supabase-js';
import supabase from './client';
import type { GoalActivityEvent, GoalActivityKind } from '@/lib/activity/goal-activity';
import { localDateForInstant, normalizeTimezone } from '@/lib/time/zoned-calendar';

type Row = Record<string, any>;

export interface GoalActivityQuery {
  sinceLocalDate: string;   // inclusive lower bound in the profile tz ('YYYY-MM-DD')
  profileTimezone: string;  // IANA tz; already normalized or normalizable
  sources: readonly GoalActivityKind[];
}

/** Resolve the user's bucketing timezone; defaults to 'UTC' when unset/invalid. */
export async function fetchProfileTimezone(
  db: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await db
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return normalizeTimezone((data as { timezone?: string | null } | null)?.timezone ?? null);
}

async function fetchTaskCompletedEvents(
  db: SupabaseClient,
  userId: string,
  goalId: string,
  query: GoalActivityQuery,
): Promise<GoalActivityEvent[]> {
  const tz = normalizeTimezone(query.profileTimezone);

  // Scope to the goal's own tasks (owner-checked), then read their completed
  // occurrences. Never selects from trackers / tracker_logs.
  const { data: taskRows, error: taskError } = await db
    .from('tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('goal_id', goalId);
  if (taskError) throw taskError;

  const taskIds = (taskRows ?? []).map((row: Row) => row.id);
  if (taskIds.length === 0) return [];

  const { data: occurrenceRows, error: occurrenceError } = await db
    .from('task_occurrences')
    .select('id, completed_at')
    .in('task_id', taskIds)
    .eq('status', 'completed')
    .not('completed_at', 'is', null);
  if (occurrenceError) throw occurrenceError;

  const events: GoalActivityEvent[] = [];
  for (const row of (occurrenceRows ?? []) as Row[]) {
    if (!row.completed_at) continue;
    // The engagement day is when the occurrence was actually completed, not its
    // scheduled_local_date.
    const localDate = localDateForInstant(row.completed_at, tz);
    if (localDate < query.sinceLocalDate) continue;
    events.push({ goalId, kind: 'task_completed', localDate });
  }
  return events;
}

/**
 * Reads goal-activity events for one goal across the requested sources, each
 * resolved to a local calendar date. Feed the result to buildActivityWindow.
 */
export async function fetchGoalActivityEvents(
  db: SupabaseClient = supabase,
  userId: string,
  goalId: string,
  query: GoalActivityQuery,
): Promise<GoalActivityEvent[]> {
  const events: GoalActivityEvent[] = [];
  if (query.sources.includes('task_completed')) {
    events.push(...await fetchTaskCompletedEvents(db, userId, goalId, query));
  }
  // Phase C sources (entry_created, milestone_completed) attach here — same shape.
  return events;
}
