import type { SupabaseClient } from '@supabase/supabase-js';
import type { EntryGoalLink, EntryRecord } from '../types';

const ENTRY_SELECT = 'id,user_id,entry_type,title,plain_text,reflection_type,pinned,archived,content_version,schema_version,completed_at,created_at,updated_at,project_id,project_share_scope';
const PAGE = 200;
type Parent = { type: 'goal' | 'project'; id: string };
type Row = Record<string, any>;

// A stable order and bounded pages avoid PostgREST's default row cap. No cache
// or service-role client: each page is independently subject to viewer RLS.
async function pages(query: () => any): Promise<Row[]> {
  const result: Row[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await query().range(offset, offset + PAGE - 1);
    if (error) throw error;
    result.push(...(data ?? []));
    if (!data || data.length < PAGE) return result;
  }
}
function chunks<T>(items: T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / PAGE) }, (_, index) => items.slice(index * PAGE, (index + 1) * PAGE));
}

/** Metadata only; editors MUST resolve the canonical detail/capabilities anew. */
export async function readContextVaultEntries(db: SupabaseClient, parent: Parent): Promise<{ entries: EntryRecord[]; incomplete: boolean }> {
  // Verify the current parent, including membership revocation, before any
  // derived reads. Never interpret absence as a successful empty library.
  const { data: context, error } = await db.from(parent.type === 'project' ? 'projects' : 'goals')
    .select('id,title,status').eq('id', parent.id).maybeSingle();
  if (error) throw error;
  if (!context) throw new Error('Vault is unavailable or access has changed.');

  const goalById = new Map<string, EntryGoalLink>();
  const links: Row[] = [];
  const [direct, inherited] = await Promise.allSettled([
    parent.type === 'project' ? pages(() => db.from('entries').select(ENTRY_SELECT)
      .eq('project_id', parent.id).eq('archived', false).order('id')) : Promise.resolve([]),
    (async () => {
      const goals = await pages(() => db.from('goals').select('id,title,category,status,project_id')
        .eq(parent.type === 'project' ? 'project_id' : 'id', parent.id).order('id'));
      for (const goal of goals) goalById.set(goal.id, { id: goal.id, title: goal.title, category: goal.category, status: goal.status, projectId: goal.project_id });
      for (const ids of chunks([...goalById.keys()])) links.push(...await pages(() => db.from('entry_goal_links')
        .select('entry_id,goal_id').in('goal_id', ids).order('entry_id').order('goal_id')));
      const rows: Row[] = [];
      for (const ids of chunks([...new Set(links.map((link) => link.entry_id))])) {
        // A visible link is not authorization to read an Entry. This second
        // viewer-RLS query is essential; never hydrate from untrusted links.
        rows.push(...await pages(() => db.from('entries').select(ENTRY_SELECT)
          .in('id', ids).eq('archived', false).order('id')));
      }
      return rows;
    })(),
  ]);
  const rows = [...(direct.status === 'fulfilled' ? direct.value : []), ...(inherited.status === 'fulfilled' ? inherited.value : [])];
  const unique = new Map(rows.map((row) => [`${row.entry_type}:${row.id}`, row]));
  const entries: EntryRecord[] = [...unique.values()].map((row) => ({
    id: row.id, userId: row.user_id, entryType: row.entry_type, title: row.title,
    content: { type: 'doc', content: [] }, plainText: (row.plain_text ?? '').slice(0, 500), brtCategory: null,
    reflectionType: row.reflection_type, conversationTurns: [], takeaway: null,
    pinned: row.pinned, archived: row.archived, contentVersion: row.content_version, schemaVersion: row.schema_version,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    goals: [...new Set(links.filter((link) => link.entry_id === row.id).map((link) => link.goal_id))]
      .flatMap((id) => goalById.has(id) ? [goalById.get(id)!] : []),
    // Do not leak another Project's identity through a Goal association.
    project: parent.type === 'project' && row.project_id === parent.id ? context : null,
    projectShareScope: row.project_share_scope, categoryIds: [], milestones: [], echoOwned: false,
  }));
  entries.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || a.id.localeCompare(b.id));
  return { entries, incomplete: direct.status === 'rejected' || inherited.status === 'rejected' };
}
