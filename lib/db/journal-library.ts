import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EntryGoalLink,
  EntryProjectLink,
  JournalLibraryItem,
  JournalLibraryPayload,
  ReflectionType,
} from '@/features/entries/types';
import { normalizeGoalCategoryForEntries } from '@/lib/goals/catalog';
import { deriveEntryCapabilities } from './entries';

type JournalRow = {
  id: string;
  user_id: string;
  title: string;
  plain_text: string;
  reflection_type: ReflectionType | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  content_version: number;
  project_id: string | null;
  project_share_scope: 'private' | 'project' | 'guide';
};

type GoalRow = {
  id: string;
  title: string;
  category: string;
  status: string;
  project_id: string | null;
};

type ProjectRow = { id: string; title: string; status: string };

async function loadBrowseContext(db: SupabaseClient, rows: readonly JournalRow[]): Promise<{
  browseAvailable: boolean;
  goalsByEntry: Map<string, EntryGoalLink[]>;
  projectsById: Map<string, EntryProjectLink>;
}> {
  const goalsByEntry = new Map<string, EntryGoalLink[]>();
  const projectsById = new Map<string, EntryProjectLink>();
  const entryIds = rows.map((row) => row.id);
  if (!entryIds.length) return { browseAvailable: true, goalsByEntry, projectsById };
  try {
    const { data: linkData, error: linkError } = await db
      .from('entry_goal_links').select('entry_id,goal_id').in('entry_id', entryIds);
    if (linkError) throw linkError;
    const links = (linkData ?? []) as Array<{ entry_id: string; goal_id: string }>;
    const goalIds = [...new Set(links.map((link) => link.goal_id))];
    const { data: goalData, error: goalError } = goalIds.length
      ? await db.from('goals').select('id,title,category,status,project_id').in('id', goalIds)
      : { data: [], error: null };
    if (goalError) throw goalError;
    const goals = (goalData ?? []) as GoalRow[];
    const goalById = new Map(goals.map((goal) => [goal.id, goal]));
    for (const link of links) {
      const goal = goalById.get(link.goal_id);
      if (!goal) continue;
      const mapped: EntryGoalLink = {
        id: goal.id,
        title: goal.title,
        category: normalizeGoalCategoryForEntries(goal.category, goal.id),
        status: goal.status,
        projectId: goal.project_id,
      };
      goalsByEntry.set(link.entry_id, [...(goalsByEntry.get(link.entry_id) ?? []), mapped]);
    }
    const projectIds = [...new Set([
      ...rows.map((row) => row.project_id),
      ...goals.map((goal) => goal.project_id),
    ].filter((id): id is string => Boolean(id)))];
    const { data: projectData, error: projectError } = projectIds.length
      ? await db.from('projects').select('id,title,status').in('id', projectIds)
      : { data: [], error: null };
    if (projectError) throw projectError;
    for (const project of (projectData ?? []) as ProjectRow[]) {
      projectsById.set(project.id, project);
    }
    return { browseAvailable: true, goalsByEntry, projectsById };
  } catch {
    return { browseAvailable: false, goalsByEntry, projectsById };
  }
}

export async function getJournalLibrary(
  db: SupabaseClient,
  viewerId: string,
): Promise<JournalLibraryPayload> {
  const { data, error } = await db.from('entries')
    .select('id,user_id,title,plain_text,reflection_type,completed_at,created_at,updated_at,content_version,project_id,project_share_scope')
    .eq('user_id', viewerId)
    .eq('entry_type', 'reflection')
    .eq('archived', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as JournalRow[];
  const entryIds = rows.map((row) => row.id);
  const [browse, echoResult] = await Promise.all([
    loadBrowseContext(db, rows),
    entryIds.length
      ? db.from('echo_entries').select('id').in('id', entryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (echoResult.error) throw echoResult.error;
  const echoOwnedIds = new Set((echoResult.data ?? []).map((entry) => entry.id));
  const entries: JournalLibraryItem[] = rows.map((row) => {
    const goals = browse.goalsByEntry.get(row.id) ?? [];
    const projectId = row.project_id ?? goals.find((goal) => goal.projectId)?.projectId ?? null;
    const project = projectId ? browse.projectsById.get(projectId) ?? null : null;
    const echoOwned = echoOwnedIds.has(row.id);
    return {
      id: row.id,
      ownerId: row.user_id,
      title: row.title,
      plainText: row.plain_text,
      reflectionType: row.reflection_type,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      contentVersion: row.content_version,
      project,
      goals,
      shareScope: row.project_share_scope ?? 'private',
      capabilities: deriveEntryCapabilities(viewerId, row.user_id, echoOwned),
      echoOwned,
    };
  });
  return { version: 'journal-library.v1', viewerId, entries, browseAvailable: browse.browseAvailable };
}
