// Goal-activity L1 — pure, source-agnostic row→event normalizers (Phase C union).
//
// The L1 reader (lib/db/goal-activity.ts) unions three engagement sources —
// completed task occurrences, goal-linked Entries, and completed milestones —
// into one normalized GoalActivityEvent[] that buildActivityWindow buckets. The
// *querying* is the reader's job; the *normalization* (raw timestamp → local
// 'YYYY-MM-DD', since-filtering, null-skip, join-shape flattening) is pure and
// lives here so it can be node-tested without a Supabase client. This is the
// cross-feature union generalized into lib/ (TD-006, design/001 Part B): the
// reader is in lib/db and never imports from features/* (features/CLAUDE.md
// rule 2). It supersedes, but does not move, features/goals/dashboard-goal-
// activity.ts — that reducer answers a DIFFERENT question ("latest activity"
// off `updated_at`), whereas engagement days are keyed off `created_at` /
// `completed_at`.
//
// D-004: reached by a node test → relative paths + `import type` only. The
// timezone→local-date conversion (localDateForInstant, via Intl) happens here
// because that IS these mappers' job; only buildActivityWindow stays tz-agnostic.

import type { GoalActivityEvent } from './goal-activity.ts';
import { localDateForInstant, normalizeTimezone } from '../time/zoned-calendar.ts';

/** Shared resolution context for every source mapper. */
export interface SourceResolveContext {
  goalId: string;
  /** IANA tz; normalized defensively inside each mapper. */
  profileTimezone: string;
  /** Inclusive lower bound in the profile tz ('YYYY-MM-DD'); older events drop. */
  sinceLocalDate: string;
}

/** A completed-occurrence row: only `completed_at` matters for the engagement day. */
export interface TaskOccurrenceRow {
  completed_at?: string | null;
}

/**
 * A goal-linked Entry row from `echo_entry_links` joined to `echo_entries`.
 * Supabase renders a to-one embed as either an object or a single-element array
 * depending on the relationship metadata, so both shapes are flattened here.
 */
export interface EntryLinkRow {
  echo_entries?:
    | { created_at?: string | null }
    | Array<{ created_at?: string | null }>
    | null;
}

/** A milestone row: `completed_at` NULL means pending → skipped. */
export interface MilestoneRow {
  completed_at?: string | null;
}

/** Resolve a raw instant to a local day; null when absent or before the window. */
function engagementDay(
  instant: string | null | undefined,
  tz: string,
  sinceLocalDate: string,
): string | null {
  if (!instant) return null;
  const localDate = localDateForInstant(instant, tz);
  if (localDate < sinceLocalDate) return null;
  return localDate;
}

/**
 * Completed task occurrences → `task_completed` events. The engagement day is
 * when the occurrence was actually completed (`completed_at`), not its
 * `scheduled_local_date`. Rows without a `completed_at` are skipped.
 */
export function taskOccurrenceRowsToEvents(
  rows: readonly TaskOccurrenceRow[],
  ctx: SourceResolveContext,
): GoalActivityEvent[] {
  const tz = normalizeTimezone(ctx.profileTimezone);
  const events: GoalActivityEvent[] = [];
  for (const row of rows) {
    const localDate = engagementDay(row.completed_at, tz, ctx.sinceLocalDate);
    if (!localDate) continue;
    events.push({ goalId: ctx.goalId, kind: 'task_completed', localDate });
  }
  return events;
}

/**
 * Goal-linked Entries → `entry_created` events. The engagement day is when the
 * Entry was created (`echo_entries.created_at`) — deliberately NOT `updated_at`
 * (that answers "latest activity", a different question — see the module note).
 */
export function entryLinkRowsToEvents(
  rows: readonly EntryLinkRow[],
  ctx: SourceResolveContext,
): GoalActivityEvent[] {
  const tz = normalizeTimezone(ctx.profileTimezone);
  const events: GoalActivityEvent[] = [];
  for (const row of rows) {
    const entry = Array.isArray(row.echo_entries) ? row.echo_entries[0] : row.echo_entries;
    const localDate = engagementDay(entry?.created_at, tz, ctx.sinceLocalDate);
    if (!localDate) continue;
    events.push({ goalId: ctx.goalId, kind: 'entry_created', localDate });
  }
  return events;
}

/**
 * Completed milestones → `milestone_completed` events, keyed off
 * `completed_at`. A NULL `completed_at` means the milestone is still pending and
 * is skipped (root CLAUDE.md: `completed_at` is the completion evidence).
 */
export function milestoneRowsToEvents(
  rows: readonly MilestoneRow[],
  ctx: SourceResolveContext,
): GoalActivityEvent[] {
  const tz = normalizeTimezone(ctx.profileTimezone);
  const events: GoalActivityEvent[] = [];
  for (const row of rows) {
    const localDate = engagementDay(row.completed_at, tz, ctx.sinceLocalDate);
    if (!localDate) continue;
    events.push({ goalId: ctx.goalId, kind: 'milestone_completed', localDate });
  }
  return events;
}
