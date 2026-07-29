import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ConstellationAnnotationRow,
  ConstellationAnnotationRowPatch,
  ConstellationEchoBrtRow,
  ConstellationEdgeRow,
  ConstellationEvidenceLinkRow,
  ConstellationEvidenceReferenceRow,
  ConstellationEvidenceReferenceRowPatch,
  ConstellationGoalEntryLinkRow,
  ConstellationGoalSourceRow,
  ConstellationMutationRepository,
  ConstellationNodeRow,
  ConstellationProjectSourceRow,
  ConstellationSnapshot,
} from '../../features/constellation/services/constellation-server-core.ts';
import type {
  ConstellationBrtCategory,
  ConstellationBrtInspectorDTO,
  ConstellationConnectedEntrySummary,
  ConstellationEchoSearchDTO,
  ConstellationEchoSearchOption,
  ConstellationEvidenceEchoSummary,
  ConstellationGoalEvidenceDTO,
  ConstellationGoalEvidenceItem,
  ConstellationLayoutDTO,
  ConstellationLayoutPositionDTO,
  ConstellationReflectionInspectorDTO,
  ConstellationReflectionValence,
  ConstellationReflectionValenceEvent,
  CreateConstellationAnnotationInput,
  CreateConstellationEvidenceReferenceInput,
  SaveConstellationLayoutPositionInput,
} from '../../features/constellation/types.ts';
import type { GoalDbStatus } from '../goals/schema.ts';
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
  'anchor_goal_id',
  'created_at',
  'updated_at',
  'archived_at',
].join(', ');
// Snapshot evidence-link columns: BRT category is no longer stored here
// (migration 033 dropped constellation_evidence_links.brt_category); the graph
// read path joins to echo_entries.brt_category instead.
const EVIDENCE_LINK_COLUMNS = [
  'id',
  'owner_id',
  'echo_entry_id',
  'goal_id',
  'updated_at',
].join(', ');
// Write/inspector path (Prompt 3 BRT-picker surface): a pure relation now that
// migration 033 dropped brt_category from this table.
const EVIDENCE_REFERENCE_COLUMNS = [
  'id',
  'owner_id',
  'echo_entry_id',
  'goal_id',
  'note',
  'created_at',
  'updated_at',
].join(', ');
// brt_category is selected so goal-evidence/search reads can join each echo's
// own category in without a second round trip.
const ECHO_EVIDENCE_COLUMNS = [
  'id',
  'title',
  'content',
  'brt_category',
  'created_at',
].join(', ');
const ECHO_EXCERPT_MAX_LENGTH = 240;
const ECHO_SEARCH_RESULT_LIMIT = 50;
const LAYOUT_POSITION_LIMIT = 500;

interface ConstellationLayoutPositionRow {
  selection_key: string;
  coordinate_space: 'canvas' | 'parent';
  x: number;
  y: number;
  updated_at: string;
}

interface ConstellationEvidenceEchoRow {
  id: string;
  title: string | null;
  content: string;
  brt_category: string | null;
  created_at: string;
}

interface ConstellationGoalSummaryRow {
  id: string;
  title: string;
  description: string | null;
  status: GoalDbStatus;
  deadline: string | null;
  project_id: string | null;
}

interface ConstellationProjectSummaryRow {
  id: string;
  title: string;
}

interface ConstellationVaultSummaryRow {
  id: string;
}

interface ConstellationGoalContainerLinkRow {
  echo_entry_id: string;
}

interface PageResult {
  data: unknown;
  error: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

async function fetchConstellationEvidenceLinks(
  ownerId: string,
  client: DbClient,
): Promise<ConstellationEvidenceLinkRow[]> {
  return fetchPagedRows((from, to) => client
    .from('constellation_evidence_links')
    .select(EVIDENCE_LINK_COLUMNS)
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to));
}

// Owner echo entries that carry a BRT category, joined to evidence links at
// assembly time to derive virtual BRT clusters.
async function fetchEchoBrtCategories(
  ownerId: string,
  client: DbClient,
): Promise<ConstellationEchoBrtRow[]> {
  return fetchPagedRows((from, to) => client
    .from('echo_entries')
    .select('id, brt_category')
    .eq('user_id', ownerId)
    .not('brt_category', 'is', null)
    .order('id', { ascending: true })
    .range(from, to));
}

async function fetchGoalSources(
  ownerId: string,
  client: DbClient,
): Promise<ConstellationGoalSourceRow[]> {
  return fetchPagedRows((from, to) => client
    .from('goals')
    .select('id, title, category, status, updated_at')
    .eq('user_id', ownerId)
    .order('id', { ascending: true })
    .range(from, to));
}

async function fetchConfirmedGoalEntryLinks(
  ownerId: string,
  client: DbClient,
): Promise<ConstellationGoalEntryLinkRow[]> {
  return fetchPagedRows((from, to) => client
    .from('echo_entry_links')
    .select('echo_entry_id, goal_id, created_at, echo_entries!inner(user_id)')
    .eq('container_type', 'goal')
    .eq('confirmed', true)
    .not('goal_id', 'is', null)
    .eq('echo_entries.user_id', ownerId)
    .order('created_at', { ascending: false })
    .order('echo_entry_id', { ascending: true })
    .range(from, to)) as Promise<ConstellationGoalEntryLinkRow[]>;
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
    evidenceLinks,
    goalEntryLinks,
    echoBrtCategories,
    goals,
    projects,
    echoEntryCount,
    characterProfile,
  ] = await Promise.all([
    fetchConstellationNodes(ownerId, client),
    fetchConstellationEdges(ownerId, client),
    fetchConstellationAnnotations(ownerId, client),
    fetchConstellationEvidenceLinks(ownerId, client),
    fetchConfirmedGoalEntryLinks(ownerId, client),
    fetchEchoBrtCategories(ownerId, client),
    fetchGoalSources(ownerId, client),
    fetchProjectSources(ownerId, client),
    fetchEchoEntryCount(ownerId, client),
    fetchCharacterProfile(ownerId, client),
  ]);

  return {
    nodes,
    edges,
    annotations,
    evidenceLinks,
    goalEntryLinks,
    echoBrtCategories,
    goals,
    projects,
    echoEntryCount,
    characterProfile,
  };
}

function evidenceExcerpt(content: string): {
  excerpt: string;
  excerptTruncated: boolean;
} {
  const normalized = content.trim().replace(/\s+/g, ' ');
  if (normalized.length <= ECHO_EXCERPT_MAX_LENGTH) {
    return { excerpt: normalized, excerptTruncated: false };
  }
  return {
    excerpt: `${normalized.slice(0, ECHO_EXCERPT_MAX_LENGTH - 1).trimEnd()}…`,
    excerptTruncated: true,
  };
}

function mapEvidenceEcho(
  row: ConstellationEvidenceEchoRow,
): ConstellationEvidenceEchoSummary {
  return {
    id: row.id,
    title: row.title,
    ...evidenceExcerpt(row.content),
    createdAt: row.created_at,
  };
}

async function findOwnedGoalSummary(
  ownerId: string,
  goalId: string,
  client: DbClient,
): Promise<ConstellationGoalSummaryRow | null> {
  const { data, error } = await client
    .from('goals')
    .select('id, title, description, status, deadline, project_id')
    .eq('id', goalId)
    .eq('user_id', ownerId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ConstellationGoalSummaryRow | null;
}

async function loadGoalInspectorDestinations(
  ownerId: string,
  goal: ConstellationGoalSummaryRow,
  client: DbClient,
): Promise<{
  project: ConstellationProjectSummaryRow | null;
  vaultId: string | null;
}> {
  const [projectResult, vaultResult] = await Promise.all([
    goal.project_id
      ? client
          .from('projects')
          .select('id, title')
          .eq('id', goal.project_id)
          .eq('user_id', ownerId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client
      .from('vaults')
      .select('id')
      .eq('goal_id', goal.id)
      .eq('user_id', ownerId)
      .maybeSingle(),
  ]);
  if (projectResult.error) throw projectResult.error;
  if (vaultResult.error) throw vaultResult.error;

  return {
    project: projectResult.data as unknown as ConstellationProjectSummaryRow | null,
    vaultId: (
      vaultResult.data as unknown as ConstellationVaultSummaryRow | null
    )?.id ?? null,
  };
}

async function fetchEvidenceReferencesForGoal(
  ownerId: string,
  goalId: string,
  client: DbClient,
): Promise<ConstellationEvidenceReferenceRow[]> {
  return fetchPagedRows((from, to) => client
    .from('constellation_evidence_links')
    .select(EVIDENCE_REFERENCE_COLUMNS)
    .eq('owner_id', ownerId)
    .eq('goal_id', goalId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to));
}

async function fetchConfirmedGoalContainerLinks(
  ownerId: string,
  goalId: string,
  client: DbClient,
): Promise<ConstellationGoalContainerLinkRow[]> {
  return fetchPagedRows((from, to) => client
    .from('echo_entry_links')
    .select('echo_entry_id, echo_entries!inner(user_id)')
    .eq('goal_id', goalId)
    .eq('container_type', 'goal')
    .eq('confirmed', true)
    .eq('echo_entries.user_id', ownerId)
    .order('echo_entry_id', { ascending: true })
    .range(from, to)) as Promise<ConstellationGoalContainerLinkRow[]>;
}

async function fetchOwnedEvidenceEchoesById(
  ownerId: string,
  echoEntryIds: readonly string[],
  client: DbClient,
): Promise<ConstellationEvidenceEchoRow[]> {
  const rows: ConstellationEvidenceEchoRow[] = [];
  const batchSize = 200;

  for (let index = 0; index < echoEntryIds.length; index += batchSize) {
    const ids = echoEntryIds.slice(index, index + batchSize);
    const { data, error } = await client
      .from('echo_entries')
      .select(ECHO_EVIDENCE_COLUMNS)
      .eq('user_id', ownerId)
      .in('id', [...ids]);
    if (error) throw error;
    if (Array.isArray(data)) {
      rows.push(...data as unknown as ConstellationEvidenceEchoRow[]);
    }
  }

  return rows;
}

async function loadConnectedGoalEntryRows(
  ownerId: string,
  goalId: string,
  client: DbClient,
): Promise<{
  containerEntryIds: ReadonlySet<string>;
  evidenceEntryIds: ReadonlySet<string>;
  references: readonly ConstellationEvidenceReferenceRow[];
  rows: readonly ConstellationEvidenceEchoRow[];
}> {
  const [references, containerLinks] = await Promise.all([
    fetchEvidenceReferencesForGoal(ownerId, goalId, client),
    fetchConfirmedGoalContainerLinks(ownerId, goalId, client),
  ]);
  const containerEntryIds = new Set(
    containerLinks.map((link) => link.echo_entry_id),
  );
  const evidenceEntryIds = new Set(
    references.map((reference) => reference.echo_entry_id),
  );
  const entryIds = [...new Set([
    ...containerEntryIds,
    ...evidenceEntryIds,
  ])];
  const rows = await fetchOwnedEvidenceEchoesById(
    ownerId,
    entryIds,
    client,
  );
  return {
    containerEntryIds,
    evidenceEntryIds,
    references,
    rows,
  };
}

function connectedEntrySummary(
  row: ConstellationEvidenceEchoRow,
  containerEntryIds: ReadonlySet<string>,
  evidenceEntryIds: ReadonlySet<string>,
): ConstellationConnectedEntrySummary {
  const inContainer = containerEntryIds.has(row.id);
  const inEvidence = evidenceEntryIds.has(row.id);
  return {
    ...mapEvidenceEcho(row),
    brtCategory: row.brt_category as ConstellationBrtCategory | null,
    connectionSource: inContainer && inEvidence
      ? 'both'
      : inContainer
        ? 'container'
        : 'evidence',
  };
}

/**
 * Returns a selected owner's goal details with an authoritative connected Entry
 * count and recent-three summary. Confirmed goal containers and explicit
 * Constellation evidence references remain distinct domains, but are deduped by
 * Entry ID for presentation.
 */
export async function loadConstellationGoalEvidence(
  ownerId: string,
  goalId: string,
  client: DbClient = supabase,
): Promise<ConstellationGoalEvidenceDTO | null> {
  const goal = await findOwnedGoalSummary(ownerId, goalId, client);
  if (!goal) return null;

  const connected = await loadConnectedGoalEntryRows(
    ownerId,
    goalId,
    client,
  );
  const echoById = new Map(connected.rows.map((row) => [row.id, row]));
  const destinations = await loadGoalInspectorDestinations(
    ownerId,
    goal,
    client,
  );
  const items: ConstellationGoalEvidenceItem[] = connected.references.flatMap(
    (reference) => {
      const echo = echoById.get(reference.echo_entry_id);
      if (!echo) return [];
      return [{
        id: reference.id,
        ownerId: reference.owner_id,
        echoEntryId: reference.echo_entry_id,
        goalId: reference.goal_id,
        brtCategory: echo.brt_category as ConstellationGoalEvidenceItem['brtCategory'],
        note: reference.note,
        createdAt: reference.created_at,
        updatedAt: reference.updated_at,
        echo: mapEvidenceEcho(echo),
      }];
    },
  );
  const recentEntries = [...connected.rows]
    .sort((left, right) => (
      right.created_at.localeCompare(left.created_at)
      || left.id.localeCompare(right.id)
    ))
    .slice(0, 3)
    .map((row) => connectedEntrySummary(
      row,
      connected.containerEntryIds,
      connected.evidenceEntryIds,
    ));

  return {
    goal: {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      status: goal.status,
      deadline: goal.deadline,
      project: destinations.project,
      vaultId: destinations.vaultId,
    },
    connectedEntryCount: connected.rows.length,
    recentEntries,
    items,
  };
}

function reflectionCandidateType(
  value: unknown,
): ConstellationReflectionInspectorDTO['candidateType'] | null {
  return value === 'theme'
    || value === 'trait'
    || value === 'tension'
    || value === 'insight'
    ? value
    : null;
}

function reflectionValence(
  value: unknown,
): ConstellationReflectionValence | null {
  return value === 'positive'
    || value === 'negative'
    || value === 'neutral'
    || value === 'mixed'
    ? value
    : null;
}

function finiteNonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    ? value
    : null;
}

function nullableIsoString(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? value
    : null;
}

function candidateEchoIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(
    (id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 200,
  ))].slice(0, 500);
}

function candidateValenceHistory(
  value: unknown,
): ConstellationReflectionValenceEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((event) => {
    if (!isRecord(event)) return [];
    const valence = reflectionValence(event.valence);
    const echoEntryId = typeof event.echo_id === 'string'
      ? event.echo_id
      : null;
    const timestamp = nullableIsoString(event.timestamp);
    return valence && echoEntryId && timestamp
      ? [{ valence, echoEntryId, timestamp }]
      : [];
  });
}

function dominantReflectionValence(
  history: readonly ConstellationReflectionValenceEvent[],
): ConstellationReflectionValence | null {
  if (history.length === 0) return null;
  const counts: Record<ConstellationReflectionValence, number> = {
    positive: 0,
    negative: 0,
    neutral: 0,
    mixed: 0,
  };
  for (const event of history) counts[event.valence] += 1;
  return (Object.keys(counts) as ConstellationReflectionValence[])
    .sort((left, right) => counts[right] - counts[left])[0] ?? null;
}

/**
 * Loads private Reflection evidence only after resolving an active owner node.
 * Full Echo bodies remain inside this server data function and are reduced to
 * the same bounded summaries used by goal evidence before they are returned.
 */
export async function loadConstellationReflectionInspector(
  ownerId: string,
  nodeId: string,
  client: DbClient = supabase,
): Promise<ConstellationReflectionInspectorDTO | null> {
  const { data: nodeData, error: nodeError } = await client
    .from('constellation_nodes')
    .select('id, label, description, source_key')
    .eq('id', nodeId)
    .eq('owner_id', ownerId)
    .eq('kind', 'reflection')
    .eq('status', 'active')
    .maybeSingle();
  if (nodeError) throw nodeError;
  if (
    !isRecord(nodeData)
    || typeof nodeData.id !== 'string'
    || typeof nodeData.label !== 'string'
    || typeof nodeData.source_key !== 'string'
  ) {
    return null;
  }

  const characterProfile = await fetchCharacterProfile(ownerId, client);
  const candidates = isRecord(characterProfile)
    ? characterProfile.constellation_candidates
    : null;
  const candidate = isRecord(candidates)
    ? candidates[nodeData.source_key]
    : null;
  const type = isRecord(candidate)
    ? reflectionCandidateType(candidate.type)
    : null;
  if (!isRecord(candidate) || !type) return null;

  const echoIds = candidateEchoIds(candidate.source_echo_ids);
  const history = candidateValenceHistory(candidate.valence_history);
  const echoRows = await fetchOwnedEvidenceEchoesById(
    ownerId,
    echoIds,
    client,
  );
  const ownedEchoIds = new Set(echoRows.map((row) => row.id));
  const ownedHistory = history.filter((event) => (
    ownedEchoIds.has(event.echoEntryId)
  ));
  const latestValenceByEchoId = new Map<string, ConstellationReflectionValence>();
  for (const event of ownedHistory) {
    latestValenceByEchoId.set(event.echoEntryId, event.valence);
  }
  const evidence = echoRows
    .sort((left, right) => (
      right.created_at.localeCompare(left.created_at)
      || left.id.localeCompare(right.id)
    ))
    .map((row) => ({
      ...mapEvidenceEcho(row),
      valence: latestValenceByEchoId.get(row.id) ?? null,
    }));

  return {
    nodeId: nodeData.id,
    label: nodeData.label,
    description: typeof nodeData.description === 'string'
      ? nodeData.description
      : null,
    candidateKey: nodeData.source_key,
    candidateType: type,
    occurrences: Math.floor(finiteNonNegativeNumber(candidate.occurrences) ?? echoIds.length),
    aggregatedScore: finiteNonNegativeNumber(candidate.aggregated_score),
    firstSeenAt: nullableIsoString(candidate.first_seen),
    lastSeenAt: nullableIsoString(candidate.last_seen),
    dominantValence: dominantReflectionValence(ownedHistory),
    valenceHistory: ownedHistory,
    evidence,
  };
}

function literalIlikePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, '\\$&')}%`;
}

async function searchOwnedEchoRows(
  ownerId: string,
  query: string,
  client: DbClient,
): Promise<ConstellationEvidenceEchoRow[]> {
  const baseQuery = () => client
    .from('echo_entries')
    .select(ECHO_EVIDENCE_COLUMNS)
    .eq('user_id', ownerId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .limit(ECHO_SEARCH_RESULT_LIMIT);

  if (query.length === 0) {
    const { data, error } = await baseQuery();
    if (error) throw error;
    return Array.isArray(data)
      ? data as unknown as ConstellationEvidenceEchoRow[]
      : [];
  }

  const pattern = literalIlikePattern(query);
  const [titleResult, contentResult] = await Promise.all([
    baseQuery().ilike('title', pattern),
    baseQuery().ilike('content', pattern),
  ]);
  if (titleResult.error) throw titleResult.error;
  if (contentResult.error) throw contentResult.error;

  const unique = new Map<string, ConstellationEvidenceEchoRow>();
  for (const row of [
    ...(Array.isArray(titleResult.data) ? titleResult.data : []),
    ...(Array.isArray(contentResult.data) ? contentResult.data : []),
  ] as unknown as ConstellationEvidenceEchoRow[]) {
    unique.set(row.id, row);
  }
  return [...unique.values()]
    .sort((left, right) => (
      right.created_at.localeCompare(left.created_at)
      || left.id.localeCompare(right.id)
    ))
    .slice(0, ECHO_SEARCH_RESULT_LIMIT);
}

export async function searchConstellationEchoOptions(
  ownerId: string,
  goalId: string,
  query: string,
  client: DbClient = supabase,
): Promise<ConstellationEchoSearchDTO | null> {
  const goal = await findOwnedGoalSummary(ownerId, goalId, client);
  if (!goal) return null;

  const [echoRows, references] = await Promise.all([
    searchOwnedEchoRows(ownerId, query, client),
    fetchEvidenceReferencesForGoal(ownerId, goalId, client),
  ]);
  const referenceByEchoId = new Map(
    references.map((reference) => [reference.echo_entry_id, reference]),
  );
  const options: ConstellationEchoSearchOption[] = echoRows.map((row) => {
    const existing = referenceByEchoId.get(row.id);
    return {
      ...mapEvidenceEcho(row),
      // BRT category is the echo entry's own (existing links no longer carry
      // one), so it's read straight off the search row, not the reference.
      existingReference: existing
        ? {
            id: existing.id,
            brtCategory: row.brt_category as ConstellationBrtCategory | null,
          }
        : null,
    };
  });

  return { goalId: goal.id, query, options };
}

export async function loadConstellationBrtInspector(
  ownerId: string,
  goalId: string,
  category: ConstellationBrtCategory,
  client: DbClient = supabase,
): Promise<ConstellationBrtInspectorDTO | null> {
  const goal = await findOwnedGoalSummary(ownerId, goalId, client);
  if (!goal) return null;
  const connected = await loadConnectedGoalEntryRows(
    ownerId,
    goalId,
    client,
  );
  const rows = connected.rows
    .filter((row) => row.brt_category === category)
    .sort((left, right) => (
      right.created_at.localeCompare(left.created_at)
      || left.id.localeCompare(right.id)
    ));
  return {
    goalId,
    category,
    entries: rows.map((row) => ({
      ...mapEvidenceEcho(row),
      brtCategory: category,
    })),
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
    async hasOwnedVisibleEarnedNode(ownerId, nodeId) {
      const { data, error } = await client
        .from('constellation_nodes')
        .select('id')
        .eq('id', nodeId)
        .eq('owner_id', ownerId)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return data !== null;
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
          anchor_goal_id: input.anchorGoalId ?? null,
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

function layoutPositionFromRow(
  row: ConstellationLayoutPositionRow,
): ConstellationLayoutPositionDTO {
  return {
    selectionKey: row.selection_key,
    coordinateSpace: row.coordinate_space,
    x: row.x,
    y: row.y,
    updatedAt: row.updated_at,
  };
}

export async function loadConstellationLayout(
  ownerId: string,
  client: DbClient = supabase,
): Promise<ConstellationLayoutDTO> {
  const { data, error } = await client
    .from('constellation_layout_positions')
    .select('selection_key, coordinate_space, x, y, updated_at')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
    .limit(LAYOUT_POSITION_LIMIT);
  if (error) throw error;
  return {
    version: '1.0',
    positions: (data as unknown as ConstellationLayoutPositionRow[])
      .map(layoutPositionFromRow),
  };
}

export async function upsertConstellationLayoutPosition(
  ownerId: string,
  input: SaveConstellationLayoutPositionInput,
  client: DbClient = supabase,
): Promise<ConstellationLayoutPositionDTO> {
  const { data, error } = await client
    .from('constellation_layout_positions')
    .upsert({
      owner_id: ownerId,
      selection_key: input.selectionKey,
      coordinate_space: input.coordinateSpace,
      x: input.x,
      y: input.y,
    }, {
      onConflict: 'owner_id,selection_key',
    })
    .select('selection_key, coordinate_space, x, y, updated_at')
    .single();
  if (error) throw error;
  return layoutPositionFromRow(
    data as unknown as ConstellationLayoutPositionRow,
  );
}

export async function deleteConstellationLayout(
  ownerId: string,
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await client
    .from('constellation_layout_positions')
    .delete()
    .eq('owner_id', ownerId);
  if (error) throw error;
}

export type {
  ConstellationAnnotationRowPatch,
  ConstellationEvidenceReferenceRowPatch,
  CreateConstellationAnnotationInput,
  CreateConstellationEvidenceReferenceInput,
};
