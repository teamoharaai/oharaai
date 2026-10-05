import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EntryCapabilities,
  EntryProjectLink,
  NoteFolder,
  NotesLibraryAuthor,
  NotesLibraryItem,
  NotesLibraryPayload,
  NotesLibrarySource,
} from '@/features/entries/types';
import { deriveEntryCapabilities } from './entries';

type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  plain_text: string;
  project_id: string | null;
  project_share_scope: 'private' | 'project' | 'guide';
  created_at: string;
  updated_at: string;
};

type GoalRow = {
  id: string;
  title: string;
  project_id: string | null;
};

type ProjectRow = {
  id: string;
  title: string;
  status: string;
};

type VaultRow = {
  id: string;
  user_id: string;
  goal_id: string | null;
  project_id: string | null;
};

type SourceRow = {
  id: string;
  vault_id: string;
  item_type: 'link' | 'document';
  title: string | null;
  metadata: { url?: string; fileType?: string } | null;
  visibility: 'private' | 'vault_members' | 'public';
  created_at: string;
  updated_at: string;
};

function fallbackAuthor(id: string, viewerId: string): NotesLibraryAuthor {
  return { id, displayName: id === viewerId ? 'You' : 'Project collaborator', avatarUrl: null };
}

function sourceProvider(row: SourceRow): string {
  const url = row.metadata?.url;
  if (url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { /* fall through */ }
  }
  return row.metadata?.fileType || (row.item_type === 'document' ? 'Document' : 'Web');
}

async function loadAuthors(
  metadataDb: SupabaseClient | null,
  ownerIds: string[],
  viewerId: string,
): Promise<Map<string, NotesLibraryAuthor>> {
  const uniqueIds = [...new Set(ownerIds)];
  const authors = new Map(uniqueIds.map((id) => [id, fallbackAuthor(id, viewerId)]));
  if (!metadataDb || !uniqueIds.length) return authors;
  try {
    const { data, error } = await metadataDb.from('profiles')
      .select('id, display_name, avatar_url').in('id', uniqueIds);
    if (error) return authors;
    for (const profile of data ?? []) {
      authors.set(profile.id, {
        id: profile.id,
        displayName: profile.id === viewerId ? 'You' : profile.display_name || 'Project collaborator',
        avatarUrl: profile.avatar_url ?? null,
      });
    }
  } catch {
    // Author metadata is optional. Authorized library rows remain usable.
  }
  return authors;
}

async function loadAuthorizedNotes(db: SupabaseClient, viewerId: string): Promise<{
  notes: Omit<NotesLibraryItem, 'author'>[];
  ownerIds: string[];
}> {
  const { data, error } = await db.from('entries')
    .select('id,user_id,title,plain_text,project_id,project_share_scope,created_at,updated_at')
    .eq('entry_type', 'note').eq('archived', false)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as NoteRow[];
  const entryIds = rows.map((row) => row.id);

  const [linkResult, assignmentResult, echoResult] = await Promise.all([
    entryIds.length
      ? db.from('entry_goal_links').select('entry_id,goal_id').in('entry_id', entryIds)
      : Promise.resolve({ data: [], error: null }),
    entryIds.length
      ? db.from('note_folder_assignments').select('entry_id,folder_id').eq('user_id', viewerId).in('entry_id', entryIds)
      : Promise.resolve({ data: [], error: null }),
    entryIds.length
      ? db.from('echo_entries').select('id').in('id', entryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (linkResult.error) throw linkResult.error;
  if (assignmentResult.error) throw assignmentResult.error;
  if (echoResult.error) throw echoResult.error;
  const links = (linkResult.data ?? []) as Array<{ entry_id: string; goal_id: string }>;
  const goalIds = [...new Set(links.map((link) => link.goal_id))];
  const { data: goalData, error: goalError } = goalIds.length
    ? await db.from('goals').select('id,title,project_id').in('id', goalIds)
    : { data: [], error: null };
  if (goalError) throw goalError;
  const goals = (goalData ?? []) as GoalRow[];
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  const directProjectIds = rows.map((row) => row.project_id).filter((id): id is string => Boolean(id));
  const projectIds = [...new Set([...directProjectIds, ...goals.map((goal) => goal.project_id).filter((id): id is string => Boolean(id))])];
  const [projectResult, membershipResult] = await Promise.all([
    projectIds.length
      ? db.from('projects').select('id,title,status').in('id', projectIds)
      : Promise.resolve({ data: [], error: null }),
    projectIds.length
      ? db.from('project_members').select('project_id,role').eq('user_id', viewerId).in('project_id', projectIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (projectResult.error) throw projectResult.error;
  if (membershipResult.error) throw membershipResult.error;
  const projectById = new Map(((projectResult.data ?? []) as ProjectRow[]).map((project) => [project.id, project]));
  const roleByProject = new Map((membershipResult.data ?? []).map((member) => [member.project_id, member.role]));
  const linksByEntry = new Map<string, GoalRow[]>();
  for (const link of links) {
    const goal = goalById.get(link.goal_id);
    if (goal) linksByEntry.set(link.entry_id, [...(linksByEntry.get(link.entry_id) ?? []), goal]);
  }
  const folderByEntry = new Map((assignmentResult.data ?? []).map((assignment) => [assignment.entry_id, assignment.folder_id]));
  const echoOwnedIds = new Set((echoResult.data ?? []).map((entry) => entry.id));

  return {
    ownerIds: rows.map((row) => row.user_id),
    notes: rows.map((row) => {
      const linkedGoals = linksByEntry.get(row.id) ?? [];
      const projectedProjectId = row.project_id
        ?? linkedGoals.find((goal) => goal.project_id)?.project_id
        ?? null;
      const projectRow = projectedProjectId ? projectById.get(projectedProjectId) : null;
      const project: EntryProjectLink | null = projectRow ? {
        id: projectRow.id,
        title: projectRow.title,
        status: projectRow.status,
      } : null;
      const capabilities: EntryCapabilities = deriveEntryCapabilities(
        viewerId,
        row.user_id,
        echoOwnedIds.has(row.id),
      );
      return {
        id: row.id,
        ownerId: row.user_id,
        title: row.title,
        plainText: row.plain_text,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        project,
        goals: linkedGoals.map((goal) => ({
          id: goal.id,
          title: goal.title,
          projectId: goal.project_id,
        })),
        shareScope: row.project_share_scope ?? 'private',
        viewerRole: row.user_id === viewerId
          ? 'owner'
          : (projectedProjectId ? roleByProject.get(projectedProjectId) as NotesLibraryItem['viewerRole'] : null) ?? null,
        capabilities,
        folderId: folderByEntry.get(row.id) ?? null,
      };
    }),
  };
}

async function loadAuthorizedSources(db: SupabaseClient): Promise<{
  sources: Omit<NotesLibrarySource, 'author'>[];
  ownerIds: string[];
}> {
  const { data: vaultData, error: vaultError } = await db.from('vaults')
    .select('id,user_id,goal_id,project_id');
  if (vaultError) throw vaultError;
  const vaults = (vaultData ?? []) as VaultRow[];
  if (!vaults.length) return { sources: [], ownerIds: [] };
  const { data: sourceData, error: sourceError } = await db.from('vault_items')
    .select('id,vault_id,item_type,title,metadata,visibility,created_at,updated_at')
    .in('vault_id', vaults.map((vault) => vault.id))
    .in('item_type', ['link', 'document'])
    .neq('content_kind', 'sticky_note')
    .order('updated_at', { ascending: false });
  if (sourceError) throw sourceError;
  const sourceRows = (sourceData ?? []) as SourceRow[];
  const goalIds = [...new Set(vaults.map((vault) => vault.goal_id).filter((id): id is string => Boolean(id)))];
  const { data: goalData, error: goalError } = goalIds.length
    ? await db.from('goals').select('id,title,project_id').in('id', goalIds)
    : { data: [], error: null };
  if (goalError) throw goalError;
  const goals = (goalData ?? []) as GoalRow[];
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  const projectIds = [...new Set([
    ...vaults.map((vault) => vault.project_id),
    ...goals.map((goal) => goal.project_id),
  ].filter((id): id is string => Boolean(id)))];
  const { data: projectData, error: projectError } = projectIds.length
    ? await db.from('projects').select('id,title,status').in('id', projectIds)
    : { data: [], error: null };
  if (projectError) throw projectError;
  const projectById = new Map(((projectData ?? []) as ProjectRow[]).map((project) => [project.id, project]));
  const vaultById = new Map(vaults.map((vault) => [vault.id, vault]));

  const sources = sourceRows.flatMap((row): Array<Omit<NotesLibrarySource, 'author'>> => {
    const vault = vaultById.get(row.vault_id);
    if (!vault) return [];
    const goalRow = vault.goal_id ? goalById.get(vault.goal_id) ?? null : null;
    const projectId = vault.project_id ?? goalRow?.project_id ?? null;
    const projectRow = projectId ? projectById.get(projectId) ?? null : null;
    return [{
      id: row.id,
      ownerId: vault.user_id,
      title: row.title?.trim() || (row.item_type === 'link' ? 'Saved link' : 'Untitled document'),
      itemType: row.item_type,
      url: row.metadata?.url ?? null,
      fileType: row.metadata?.fileType ?? null,
      provider: sourceProvider(row),
      visibility: row.visibility,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      project: projectRow ? { id: projectRow.id, title: projectRow.title, status: projectRow.status } : null,
      goal: goalRow ? { id: goalRow.id, title: goalRow.title, projectId: goalRow.project_id } : null,
    }];
  });
  return { sources, ownerIds: vaults.map((vault) => vault.user_id) };
}

export async function getNotesLibrary(
  db: SupabaseClient,
  metadataDb: SupabaseClient | null,
  viewerId: string,
): Promise<NotesLibraryPayload> {
  const [noteResult, sourceResult, folderResult] = await Promise.all([
    loadAuthorizedNotes(db, viewerId),
    loadAuthorizedSources(db),
    db.from('note_folders').select('id,name,sort_order,created_at,updated_at')
      .eq('user_id', viewerId).order('sort_order').order('created_at'),
  ]);
  if (folderResult.error) throw folderResult.error;
  const authors = await loadAuthors(
    metadataDb,
    [...noteResult.ownerIds, ...sourceResult.ownerIds],
    viewerId,
  );
  const folders: NoteFolder[] = (folderResult.data ?? []).map((folder) => ({
    id: folder.id,
    name: folder.name,
    sortOrder: folder.sort_order,
    createdAt: folder.created_at,
    updatedAt: folder.updated_at,
  }));
  return {
    version: 'notes-library.v1',
    viewerId,
    folders,
    notes: noteResult.notes.map((note) => ({
      ...note,
      author: authors.get(note.ownerId) ?? fallbackAuthor(note.ownerId, viewerId),
    })),
    sources: sourceResult.sources.map((source) => ({
      ...source,
      author: authors.get(source.ownerId) ?? fallbackAuthor(source.ownerId, viewerId),
    })),
  };
}
