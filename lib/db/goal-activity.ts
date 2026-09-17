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
import {
  taskOccurrenceRowsToEvents,
  entryLinkRowsToEvents,
  milestoneRowsToEvents,
  type EntryLinkRow,
  type MilestoneRow,
  type TaskOccurrenceRow,
} from '@/lib/activity/goal-activity-sources';
import { normalizeTimezone } from '@/lib/time/zoned-calendar';

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

  return taskOccurrenceRowsToEvents((occurrenceRows ?? []) as TaskOccurrenceRow[], {
    goalId,
    profileTimezone: query.profileTimezone,
    sinceLocalDate: query.sinceLocalDate,
  });
}

async function fetchEntryCreatedEvents(
  db: SupabaseClient,
  goalId: string,
  query: GoalActivityQuery,
): Promise<GoalActivityEvent[]> {
  // Goal-linked Entries: the confirmed container rows for this goal joined to
  // their Entry's created_at (the engagement day). Mirrors the confirmed-link
  // scoping used by fetchLatestReflectionTimestamps / the Constellation Entry
  // count — unconfirmed ai_suggested links are advisory, not engagement.
  const { data, error } = await db
    .from('echo_entry_links')
    .select('echo_entries!inner(created_at)')
    .eq('goal_id', goalId)
    .eq('container_type', 'goal')
    .eq('confirmed', true);
  if (error) throw error;

  return entryLinkRowsToEvents((data ?? []) as unknown as EntryLinkRow[], {
    goalId,
    profileTimezone: query.profileTimezone,
    sinceLocalDate: query.sinceLocalDate,
  });
}

async function fetchMilestoneCompletedEvents(
  db: SupabaseClient,
  userId: string,
  goalId: string,
  query: GoalActivityQuery,
): Promise<GoalActivityEvent[]> {
  // Completed milestones for this goal; completed_at NULL = pending (skipped by
  // the mapper). Goal + owner scoped.
  const { data, error } = await db
    .from('milestones')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .not('completed_at', 'is', null);
  if (error) throw error;

  return milestoneRowsToEvents((data ?? []) as unknown as MilestoneRow[], {
    goalId,
    profileTimezone: query.profileTimezone,
    sinceLocalDate: query.sinceLocalDate,
  });
}

/**
 * Reads goal-activity events for one goal across the requested sources, each
 * resolved to a local calendar date. This is the cross-feature engagement union
 * (Phase C: task_completed + entry_created + milestone_completed), composed in
 * lib/ so no features/* module is imported. Feed the result to
 * buildActivityWindow.
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
  if (query.sources.includes('entry_created')) {
    events.push(...await fetchEntryCreatedEvents(db, goalId, query));
  }
  if (query.sources.includes('milestone_completed')) {
    events.push(...await fetchMilestoneCompletedEvents(db, userId, goalId, query));
  }
  return events;
}
