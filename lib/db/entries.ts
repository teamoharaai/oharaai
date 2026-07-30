import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeGoalCategoryForEntries } from '@/lib/goals/catalog';
import type {
  EntryDraft,
  EntryGoalLink,
  EntryGoalOption,
  EntryMilestoneLink,
  EntryRecord,
  EntryRetrievalDocument,
  EntryType,
  ReflectionTurn,
  ReflectionType,
  RichTextDocument,
} from '@/features/entries/types';
import { buildRetrievalDocument } from '@/features/entries/utils';
import { GOAL_CATEGORY_LABELS } from '@/lib/goals/catalog';

type DbEntryRow = {
  id: string;
  user_id: string;
  entry_type: EntryType;
  title: string;
  content: unknown;
  plain_text: string;
  reflection_type: ReflectionType | null;
  conversation_turns: unknown;
  takeaway: string | null;
  pinned: boolean;
  archived: boolean;
  content_version: number;
  schema_version: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type GoalRow = {
  id: string;
  title: string;
  category: string;
  status: string;
  project_id: string | null;
};

type MilestoneRow = {
  id: string;
  goal_id: string;
  title: string;
  completed_at: string | null;
};

type RelationshipRows = {
  goalRows: GoalRow[];
  categoryIds: string[];
  milestoneRows: MilestoneRow[];
};

function requireUuid(value: string, label: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function isRichTextDocument(value: unknown): value is RichTextDocument {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RichTextDocument>;
  return candidate.type === 'doc' && Array.isArray(candidate.blocks);
}

function toTurns(value: unknown): ReflectionTurn[] {
  if (!Array.isArray(value)) return [];
  return value.filter((turn): turn is ReflectionTurn => {
    if (!turn || typeof turn !== 'object') return false;
    const candidate = turn as Partial<ReflectionTurn>;
    return typeof candidate.id === 'string'
      && (candidate.role === 'ohara' || candidate.role === 'user')
      && typeof candidate.content === 'string'
      && typeof candidate.createdAt === 'string';
  });
}

function mapEntry(row: DbEntryRow, relationships: RelationshipRows): EntryRecord {
  const goals: EntryGoalLink[] = relationships.goalRows.map((goal) => ({
    id: goal.id,
    title: goal.title,
    category: normalizeGoalCategoryForEntries(goal.category),
    status: goal.status,
    projectId: goal.project_id,
  }));
  const milestones: EntryMilestoneLink[] = relationships.milestoneRows.map((milestone) => ({
    id: milestone.id,
    goalId: milestone.goal_id,
    title: milestone.title,
    completedAt: milestone.completed_at,
  }));
  return {
    id: row.id,
    userId: row.user_id,
    entryType: row.entry_type,
    title: row.title,
    content: isRichTextDocument(row.content)
      ? row.content
      : { type: 'doc', blocks: [] },
    plainText: row.plain_text,
    reflectionType: row.reflection_type,
    conversationTurns: toTurns(row.conversation_turns),
    takeaway: row.takeaway,
    pinned: row.pinned,
    archived: row.archived,
    contentVersion: row.content_version,
    schemaVersion: row.schema_version,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    goals,
    categoryIds: relationships.categoryIds.map(normalizeGoalCategoryForEntries),
    milestones,
  };
}

async function loadRelationships(
  db: SupabaseClient,
  entryIds: string[],
): Promise<Map<string, RelationshipRows>> {
  const result = new Map<string, RelationshipRows>(
    entryIds.map((id) => [id, { goalRows: [], categoryIds: [], milestoneRows: [] }]),
  );
  if (entryIds.length === 0) return result;

  const [goalLinksResult, categoryLinksResult, milestoneLinksResult] = await Promise.all([
    db.from('entry_goal_links').select('entry_id, goal_id').in('entry_id', entryIds),
    db.from('entry_category_links').select('entry_id, category_id, link_source').in('entry_id', entryIds),
    db.from('reflection_milestone_links').select('entry_id, milestone_id').in('entry_id', entryIds),
  ]);

  if (goalLinksResult.error) throw goalLinksResult.error;
  if (categoryLinksResult.error) throw categoryLinksResult.error;
  if (milestoneLinksResult.error) throw milestoneLinksResult.error;

  const goalLinks = (goalLinksResult.data ?? []) as Array<{ entry_id: string; goal_id: string }>;
  const milestoneLinks = (milestoneLinksResult.data ?? []) as Array<{
    entry_id: string;
    milestone_id: string;
  }>;
  const goalIds = [...new Set(goalLinks.map((link) => link.goal_id))];
  const milestoneIds = [...new Set(milestoneLinks.map((link) => link.milestone_id))];

  const [goalsResult, milestonesResult] = await Promise.all([
    goalIds.length
      ? db.from('goals').select('id, title, category, status, project_id').in('id', goalIds)
      : Promise.resolve({ data: [] as GoalRow[], error: null }),
    milestoneIds.length
      ? db.from('milestones').select('id, goal_id, title, completed_at').in('id', milestoneIds)
      : Promise.resolve({ data: [] as MilestoneRow[], error: null }),
  ]);
  if (goalsResult.error) throw goalsResult.error;
  if (milestonesResult.error) throw milestonesResult.error;

  const goalsById = new Map(((goalsResult.data ?? []) as GoalRow[]).map((goal) => [goal.id, goal]));
  const milestonesById = new Map(
    ((milestonesResult.data ?? []) as MilestoneRow[]).map((milestone) => [milestone.id, milestone]),
  );

  for (const link of goalLinks) {
    const goal = goalsById.get(link.goal_id);
    if (goal) result.get(link.entry_id)?.goalRows.push(goal);
  }
  for (const link of (categoryLinksResult.data ?? []) as Array<{
    entry_id: string;
    category_id: string;
    link_source: string;
  }>) {
    if (link.link_source === 'category_only') {
      result.get(link.entry_id)?.categoryIds.push(link.category_id);
    }
  }
  for (const link of milestoneLinks) {
    const milestone = milestonesById.get(link.milestone_id);
    if (milestone) result.get(link.entry_id)?.milestoneRows.push(milestone);
  }

  return result;
}

export async function getEntries(
  db: SupabaseClient,
  userId: string,
  entryType?: EntryType,
): Promise<EntryRecord[]> {
  let query = db
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .eq('archived', false)
    .order('updated_at', { ascending: false });
  if (entryType) query = query.eq('entry_type', entryType);
  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as DbEntryRow[];
  const relationships = await loadRelationships(db, rows.map((row) => row.id));
  return rows.map((row) => mapEntry(
    row,
    relationships.get(row.id) ?? { goalRows: [], categoryIds: [], milestoneRows: [] },
  ));
}

export async function getEntryGoalOptions(
  db: SupabaseClient,
  userId: string,
): Promise<EntryGoalOption[]> {
  const { data: goalData, error: goalError } = await db
    .from('goals')
    .select('id, title, category, status, project_id')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false });
  if (goalError) throw goalError;
  const goals = (goalData ?? []) as GoalRow[];
  const goalIds = goals.map((goal) => goal.id);
  const { data: milestoneData, error: milestoneError } = goalIds.length
    ? await db
      .from('milestones')
      .select('id, goal_id, title, completed_at')
      .eq('user_id', userId)
      .in('goal_id', goalIds)
      .order('sort_order', { ascending: true })
    : { data: [] as MilestoneRow[], error: null };
  if (milestoneError) throw milestoneError;
  const milestones = (milestoneData ?? []) as MilestoneRow[];
  return goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    category: normalizeGoalCategoryForEntries(goal.category),
    status: goal.status,
    projectId: goal.project_id,
    milestones: milestones
      .filter((milestone) => milestone.goal_id === goal.id)
      .map((milestone) => ({
        id: milestone.id,
        goalId: milestone.goal_id,
        title: milestone.title,
        completedAt: milestone.completed_at,
      })),
  }));
}

export async function getEntry(
  db: SupabaseClient,
  userId: string,
  entryId: string,
): Promise<EntryRecord | null> {
  const { data, error } = await db
    .from('entries')
    .select('*')
    .eq('id', entryId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const relationships = await loadRelationships(db, [entryId]);
  return mapEntry(
    data as DbEntryRow,
    relationships.get(entryId) ?? { goalRows: [], categoryIds: [], milestoneRows: [] },
  );
}

async function saveEntry(
  db: SupabaseClient,
  entryId: string | null,
  draft: EntryDraft,
): Promise<string> {
  const { data, error } = await db.rpc('save_entry', {
    p_entry_id: entryId,
    p_entry_type: draft.entryType,
    p_title: draft.title.trim(),
    p_content: draft.content,
    p_plain_text: draft.plainText,
    p_reflection_type: draft.entryType === 'reflection' ? draft.reflectionType ?? 'open' : null,
    p_conversation_turns: draft.conversationTurns ?? [],
    p_takeaway: draft.takeaway?.trim() || null,
    p_pinned: draft.pinned ?? false,
    p_archived: draft.archived ?? false,
    p_completed_at: draft.completedAt ?? null,
    p_goal_ids: [...new Set(draft.relationships.goalIds)],
    p_category_ids: [...new Set(draft.relationships.categoryIds)],
    p_milestone_ids: [...new Set(draft.relationships.milestoneIds)],
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Entry save returned an invalid identifier');
  return data;
}

export async function createEntry(
  db: SupabaseClient,
  userId: string,
  draft: EntryDraft,
): Promise<EntryRecord> {
  const entryId = await saveEntry(db, null, draft);
  const entry = await getEntry(db, userId, entryId);
  if (!entry) throw new Error('Entry was created but could not be reloaded');
  return entry;
}

export async function updateEntry(
  db: SupabaseClient,
  userId: string,
  entryId: string,
  draft: EntryDraft,
): Promise<EntryRecord | null> {
  const { data: existing, error: existingError } = await db
    .from('entries')
    .select('id, content_version')
    .eq('id', entryId)
    .eq('user_id', userId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) return null;

  await saveEntry(db, entryId, draft);
  return getEntry(db, userId, entryId);
}

export async function deleteEntry(
  db: SupabaseClient,
  userId: string,
  entryId: string,
): Promise<boolean> {
  const { data, error } = await db
    .from('entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId)
    .select('id');
  if (error) throw error;
  return Boolean(data?.length);
}

export async function getEntriesForGoal(
  db: SupabaseClient,
  userId: string,
  goalId: string,
): Promise<EntryRecord[]> {
  const { data, error } = await db
    .from('entry_goal_links')
    .select('entry_id, entries!inner(user_id)')
    .eq('goal_id', goalId)
    .eq('entries.user_id', userId);
  if (error) throw error;
  const ids = (data ?? []).map((row: { entry_id: string }) => row.entry_id);
  const entries = await getEntries(db, userId);
  return entries.filter((entry) => ids.includes(entry.id));
}

export async function getEntriesForCategory(
  db: SupabaseClient,
  userId: string,
  categoryId: string,
): Promise<EntryRecord[]> {
  const entries = await getEntries(db, userId);
  return entries.filter((entry) => (
    entry.categoryIds.includes(normalizeGoalCategoryForEntries(categoryId))
    || entry.goals.some((goal) => goal.category === normalizeGoalCategoryForEntries(categoryId))
  ));
}

export async function getEntriesForMilestone(
  db: SupabaseClient,
  userId: string,
  milestoneId: string,
): Promise<EntryRecord[]> {
  const entries = await getEntries(db, userId);
  return entries.filter((entry) => entry.milestones.some((item) => item.id === milestoneId));
}

export async function getRecentEntriesForConstellation(
  db: SupabaseClient,
  userId: string,
  constellationId: string,
): Promise<EntryRecord[]> {
  const safeConstellationId = requireUuid(constellationId, 'constellation ID');
  const { data, error } = await db
    .from('constellation_nodes')
    .select('source_goal_id')
    .eq('owner_id', userId)
    .eq('status', 'active')
    .or(`id.eq.${safeConstellationId},season_id.eq.${safeConstellationId}`);
  if (error) throw error;
  const goalIds = [
    ...new Set(((data ?? []) as Array<{ source_goal_id: string | null }>)
      .map((node) => node.source_goal_id)
      .filter((id): id is string => Boolean(id))),
  ];
  if (goalIds.length === 0) return [];
  const entries = await getEntries(db, userId);
  return entries
    .filter((entry) => entry.goals.some((goal) => goalIds.includes(goal.id)))
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
}

export async function getUnlinkedNotes(
  db: SupabaseClient,
  userId: string,
): Promise<EntryRecord[]> {
  const entries = await getEntries(db, userId, 'note');
  return entries.filter((entry) => entry.goals.length === 0 && entry.categoryIds.length === 0);
}

export async function getEntryContextBundle(
  db: SupabaseClient,
  userId: string,
  entryId: string,
): Promise<{ entry: EntryRecord; retrieval: EntryRetrievalDocument } | null> {
  const entry = await getEntry(db, userId, entryId);
  if (!entry) return null;

  const goalIds = entry.goals.map((goal) => goal.id);
  const { data } = goalIds.length
    ? await db
      .from('constellation_nodes')
      .select('id, season_id')
      .eq('owner_id', userId)
      .in('source_goal_id', goalIds)
      .eq('status', 'active')
    : { data: [] };
  const constellationIds = [
    ...new Set(((data ?? []) as Array<{ id: string; season_id: string | null }>)
      .map((node) => node.season_id ?? node.id)),
  ];

  return {
    entry,
    retrieval: buildRetrievalDocument(entry, GOAL_CATEGORY_LABELS, constellationIds),
  };
}
