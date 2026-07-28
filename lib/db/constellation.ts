import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ConstellationAnnotationRow,
  ConstellationAnnotationRowPatch,
  ConstellationEdgeRow,
  ConstellationEvidenceReferenceRow,
  ConstellationEvidenceReferenceRowPatch,
  ConstellationGoalSourceRow,
  ConstellationMutationRepository,
  ConstellationNodeRow,
  ConstellationProjectSourceRow,
  ConstellationSnapshot,
} from '../../features/constellation/services/constellation-server-core.ts';
import type {
  CreateConstellationAnnotationInput,
  CreateConstellationEvidenceReferenceInput,
} from '../../features/constellation/types.ts';
import supabase from './client.ts';

type DbClient = SupabaseClient;

const PAGE_SIZE = 500;
const NODE_COLUMNS = [
  'id',
  'owner_id',
  'kind',
  'status',
  'label',
  'description',
  'authorship',
  'is_earned',
  'source_type',
  'source_project_id',
  'source_goal_id',
  'source_profile_id',
  'source_key',
  'visibility_score',
  'first_seen_at',
  'last_activity_at',
  'updated_at',
].join(', ');
const EDGE_COLUMNS = [
  'id',
  'owner_id',
  'source_node_id',
  'target_node_id',
  'kind',
  'valence',
  'weight',
  'status',
  'updated_at',
].join(', ');
const ANNOTATION_COLUMNS = [
  'id',
  'owner_id',
  'kind',
  'status',
  'authorship',
  'is_draft',
  'label',
  'body',
  'anchor_earned_node_id',
  'created_at',
  'updated_at',
  'archived_at',
].join(', ');
const EVIDENCE_REFERENCE_COLUMNS = [
  'id',
  'owner_id',
  'echo_entry_id',
  'goal_id',
  'brt_category',
  'note',
  'created_at',
  'updated_at',
].join(', ');

interface PageResult {
  data: unknown;
  error: unknown;
}

async function fetchPagedRows<TRow>(
  loadPage: (from: number, to: number) => PromiseLike<PageResult>,
): Promise<TRow[]> {
  const rows: TRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await loadPage(
      from,
      from + PAGE_SIZE - 1,
    );
    if (error) throw error;

    const page = Array.isArray(data) ? data as TRow[] : [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function fetchConstellationNodes(
  ownerId: string,
  client: DbClient,
): Promise<ConstellationNodeRow[]> {
  return fetchPagedRows((from, to) => client
    .from('constellation_nodes')
    .select(NODE_COLUMNS)
    .eq('owner_id', ownerId)
    .eq('status', 'active')
    .order('id', { ascending: true })
    .range(from, to));
}

async function fetchConstellationEdges(
  ownerId: string,
  client: DbClient,
): Promise<ConstellationEdgeRow[]> {
  return fetchPagedRows((from, to) => client
    .from('constellation_edges')
    .select(EDGE_COLUMNS)
    .eq('owner_id', ownerId)
    .eq('status', 'active')
    .order('id', { ascending: true })
    .range(from, to));
}

async function fetchConstellationAnnotations(
  ownerId: string,
  client: DbClient,
): Promise<ConstellationAnnotationRow[]> {
  return fetchPagedRows((from, to) => client
    .from('constellation_annotations')
    .select(ANNOTATION_COLUMNS)
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to));
}

async function fetchConstellationEvidenceReferences(
  ownerId: string,
  client: DbClient,
): Promise<ConstellationEvidenceReferenceRow[]> {
  return fetchPagedRows((from, to) => client
    .from('constellation_evidence_links')
    .select(EVIDENCE_REFERENCE_COLUMNS)
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to));
}

async function fetchGoalSources(
  ownerId: string,
  client: DbClient,
): Promise<ConstellationGoalSourceRow[]> {
  return fetchPagedRows((from, to) => client
    .from('goals')
    .select('id, status, updated_at')
    .eq('user_id', ownerId)
    .order('id', { ascending: true })
    .range(from, to));
}

async function fetchProjectSources(
  ownerId: string,
  client: DbClient,
): Promise<ConstellationProjectSourceRow[]> {
  return fetchPagedRows((from, to) => client
    .from('projects')
    .select('id, status, updated_at')
    .eq('user_id', ownerId)
    .order('id', { ascending: true })
    .range(from, to));
}

async function fetchEchoEntryCount(
  ownerId: string,
  client: DbClient,
): Promise<number> {
  const { count, error } = await client
    .from('echo_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ownerId);
  if (error) throw error;
  return count ?? 0;
}

async function fetchCharacterProfile(
  ownerId: string,
  client: DbClient,
): Promise<unknown> {
  const { data, error } = await client
    .from('profiles')
    .select('character_profile')
    .eq('id', ownerId)
    .maybeSingle();
  if (error) throw error;
  if (!data || typeof data !== 'object') return {};
  return (data as { character_profile?: unknown }).character_profile ?? {};
}

/**
 * Loads the complete owner-scoped read inputs with a fixed set of paginated
 * queries. Echo content is never selected, and no query is issued per node,
 * annotation, goal, or evidence reference.
 */
export async function loadConstellationSnapshot(
  ownerId: string,
  client: DbClient = supabase,
): Promise<ConstellationSnapshot> {
  const [
    nodes,
    edges,
    annotations,
    evidenceReferences,
    goals,
    projects,
    echoEntryCount,
    characterProfile,
  ] = await Promise.all([
    fetchConstellationNodes(ownerId, client),
    fetchConstellationEdges(ownerId, client),
    fetchConstellationAnnotations(ownerId, client),
    fetchConstellationEvidenceReferences(ownerId, client),
    fetchGoalSources(ownerId, client),
    fetchProjectSources(ownerId, client),
    fetchEchoEntryCount(ownerId, client),
    fetchCharacterProfile(ownerId, client),
  ]);

  return {
    nodes,
    edges,
    annotations,
    evidenceReferences,
    goals,
    projects,
    echoEntryCount,
    characterProfile,
  };
}

async function rowExists(
  client: DbClient,
  table: 'constellation_nodes' | 'echo_entries' | 'goals',
  idColumn: 'id',
  ownerColumn: 'owner_id' | 'user_id',
  ownerId: string,
  rowId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from(table)
    .select(idColumn)
    .eq(idColumn, rowId)
    .eq(ownerColumn, ownerId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export function createConstellationMutationRepository(
  client: DbClient = supabase,
): ConstellationMutationRepository {
  return {
    hasOwnedEarnedNode(ownerId, nodeId) {
      return rowExists(
        client,
        'constellation_nodes',
        'id',
        'owner_id',
        ownerId,
        nodeId,
      );
    },

    async findAnnotation(ownerId, annotationId) {
      const { data, error } = await client
        .from('constellation_annotations')
        .select(ANNOTATION_COLUMNS)
        .eq('id', annotationId)
        .eq('owner_id', ownerId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ConstellationAnnotationRow | null;
    },

    async insertAnnotation(ownerId, input) {
      const { data, error } = await client
        .from('constellation_annotations')
        .insert({
          owner_id: ownerId,
          kind: input.kind,
          label: input.label,
          body: input.body,
          anchor_earned_node_id: input.anchorEarnedNodeId,
        })
        .select(ANNOTATION_COLUMNS)
        .single();
      if (error) throw error;
      return data as unknown as ConstellationAnnotationRow;
    },

    async updateAnnotation(ownerId, annotationId, patch) {
      const { data, error } = await client
        .from('constellation_annotations')
        .update(patch)
        .eq('id', annotationId)
        .eq('owner_id', ownerId)
        .eq('status', 'draft')
        .select(ANNOTATION_COLUMNS)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ConstellationAnnotationRow | null;
    },

    hasOwnedEchoEntry(ownerId, echoEntryId) {
      return rowExists(
        client,
        'echo_entries',
        'id',
        'user_id',
        ownerId,
        echoEntryId,
      );
    },

    hasOwnedGoal(ownerId, goalId) {
      return rowExists(
        client,
        'goals',
        'id',
        'user_id',
        ownerId,
        goalId,
      );
    },

    async findEvidenceReferenceByPair(
      ownerId,
      echoEntryId,
      goalId,
    ) {
      const { data, error } = await client
        .from('constellation_evidence_links')
        .select(EVIDENCE_REFERENCE_COLUMNS)
        .eq('owner_id', ownerId)
        .eq('echo_entry_id', echoEntryId)
        .eq('goal_id', goalId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ConstellationEvidenceReferenceRow | null;
    },

    async findEvidenceReference(ownerId, evidenceReferenceId) {
      const { data, error } = await client
        .from('constellation_evidence_links')
        .select(EVIDENCE_REFERENCE_COLUMNS)
        .eq('owner_id', ownerId)
        .eq('id', evidenceReferenceId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ConstellationEvidenceReferenceRow | null;
    },

    async insertEvidenceReference(ownerId, input) {
      const { data, error } = await client
        .from('constellation_evidence_links')
        .insert({
          owner_id: ownerId,
          echo_entry_id: input.echoEntryId,
          goal_id: input.goalId,
          brt_category: input.brtCategory,
          note: input.note ?? null,
        })
        .select(EVIDENCE_REFERENCE_COLUMNS)
        .single();
      if (error) throw error;
      return data as unknown as ConstellationEvidenceReferenceRow;
    },

    async updateEvidenceReference(
      ownerId,
      evidenceReferenceId,
      patch,
    ) {
      const { data, error } = await client
        .from('constellation_evidence_links')
        .update(patch)
        .eq('owner_id', ownerId)
        .eq('id', evidenceReferenceId)
        .select(EVIDENCE_REFERENCE_COLUMNS)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ConstellationEvidenceReferenceRow | null;
    },

    async deleteEvidenceReference(ownerId, evidenceReferenceId) {
      const { data, error } = await client
        .from('constellation_evidence_links')
        .delete()
        .eq('owner_id', ownerId)
        .eq('id', evidenceReferenceId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      return data !== null;
    },
  };
}

export type {
  ConstellationAnnotationRowPatch,
  ConstellationEvidenceReferenceRowPatch,
  CreateConstellationAnnotationInput,
  CreateConstellationEvidenceReferenceInput,
};
