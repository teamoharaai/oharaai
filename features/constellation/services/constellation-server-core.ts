import { GOAL_DB_STATUSES, type GoalDbStatus } from '../../../lib/goals/schema.ts';
import {
  CONSTELLATION_ECHO_ACCESS_GATE,
  CONSTELLATION_GOAL_ACCESS_GATE,
} from '../gate.ts';
import {
  groupGoalEvidenceByBrt,
  stableVirtualBrtClusterId,
} from '../graph.ts';
import type {
  ConstellationAnnotationDTO,
  ConstellationAnnotationKind,
  ConstellationAnnotationStatus,
  ConstellationBrtCategory,
  ConstellationDeleteResult,
  ConstellationEarnedNodeDTO,
  ConstellationEarnedNodeKind,
  ConstellationEvidenceLink,
  ConstellationEvidenceReferenceWriteResult,
  ConstellationGraphDTO,
  ConstellationGraphEdgeDTO,
  ConstellationGraphCountsDTO,
  ConstellationVirtualBrtClusterDTO,
  CreateConstellationAnnotationInput,
  CreateConstellationEvidenceReferenceInput,
  GraphEdgeKind,
  GraphEdgeValence,
  UpdateConstellationAnnotationInput,
  UpdateConstellationEvidenceReferenceInput,
} from '../types.ts';

const COMPLETE_GOAL_GRACE_MILLISECONDS = 14 * 24 * 60 * 60 * 1000;

const EARNED_NODE_KINDS = [
  'season',
  'ambition',
  'goal',
  'reflection',
  'trait',
  'tension',
] as const satisfies readonly ConstellationEarnedNodeKind[];

const PERSISTED_EDGE_KINDS = [
  'season_membership',
  'ambition_goal',
  'goal_pattern',
  'pattern_cooccurrence',
  'trait_derivation',
  'tension_composition',
] as const satisfies readonly GraphEdgeKind[];

const EDGE_VALENCES = [
  'positive',
  'negative',
  'neutral',
  'mixed',
  'contradictory',
] as const satisfies readonly GraphEdgeValence[];

export interface ConstellationNodeRow {
  id: string;
  owner_id: string;
  kind: string;
  status: string;
  label: string;
  description: string | null;
  authorship: string;
  is_earned: boolean;
  source_type: string;
  source_project_id: string | null;
  source_goal_id: string | null;
  source_profile_id: string | null;
  source_key: string | null;
  visibility_score: number | null;
  first_seen_at: string | null;
  last_activity_at: string | null;
  updated_at: string;
}

export interface ConstellationEdgeRow {
  id: string;
  owner_id: string;
  source_node_id: string;
  target_node_id: string;
  kind: string;
  valence: string | null;
  weight: number | null;
  status: string;
  updated_at: string;
}

export interface ConstellationAnnotationRow {
  id: string;
  owner_id: string;
  kind: string;
  status: string;
  authorship: string;
  is_draft: boolean;
  label: string;
  body: string | null;
  anchor_earned_node_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ConstellationEvidenceReferenceRow {
  id: string;
  owner_id: string;
  echo_entry_id: string;
  goal_id: string;
  brt_category: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConstellationGoalSourceRow {
  id: string;
  status: string;
  updated_at: string;
}

export interface ConstellationProjectSourceRow {
  id: string;
  status: string;
  updated_at: string;
}

export interface ConstellationSnapshot {
  nodes: ConstellationNodeRow[];
  edges: ConstellationEdgeRow[];
  annotations: ConstellationAnnotationRow[];
  evidenceReferences: ConstellationEvidenceReferenceRow[];
  goals: ConstellationGoalSourceRow[];
  projects: ConstellationProjectSourceRow[];
  echoEntryCount: number;
  characterProfile: unknown;
}

export type ConstellationDataErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT';

export class ConstellationDataError extends Error {
  readonly code: ConstellationDataErrorCode;

  constructor(code: ConstellationDataErrorCode, message: string) {
    super(message);
    this.name = 'ConstellationDataError';
    this.code = code;
  }
}

export interface ConstellationAnnotationRowPatch {
  kind?: ConstellationAnnotationKind;
  label?: string;
  body?: string | null;
  anchor_earned_node_id?: string | null;
  status?: 'archived';
}

export interface ConstellationEvidenceReferenceRowPatch {
  brt_category?: ConstellationBrtCategory;
  note?: string | null;
}

export interface ConstellationMutationRepository {
  hasOwnedVisibleEarnedNode(
    ownerId: string,
    nodeId: string,
  ): Promise<boolean>;
  findAnnotation(
    ownerId: string,
    annotationId: string,
  ): Promise<ConstellationAnnotationRow | null>;
  insertAnnotation(
    ownerId: string,
    input: CreateConstellationAnnotationInput,
  ): Promise<ConstellationAnnotationRow>;
  updateAnnotation(
    ownerId: string,
    annotationId: string,
    patch: ConstellationAnnotationRowPatch,
  ): Promise<ConstellationAnnotationRow | null>;
  hasOwnedEchoEntry(ownerId: string, echoEntryId: string): Promise<boolean>;
  hasOwnedGoal(ownerId: string, goalId: string): Promise<boolean>;
  findEvidenceReferenceByPair(
    ownerId: string,
    echoEntryId: string,
    goalId: string,
  ): Promise<ConstellationEvidenceReferenceRow | null>;
  findEvidenceReference(
    ownerId: string,
    evidenceReferenceId: string,
  ): Promise<ConstellationEvidenceReferenceRow | null>;
  insertEvidenceReference(
    ownerId: string,
    input: CreateConstellationEvidenceReferenceInput,
  ): Promise<ConstellationEvidenceReferenceRow>;
  updateEvidenceReference(
    ownerId: string,
    evidenceReferenceId: string,
    patch: ConstellationEvidenceReferenceRowPatch,
  ): Promise<ConstellationEvidenceReferenceRow | null>;
  deleteEvidenceReference(
    ownerId: string,
    evidenceReferenceId: string,
  ): Promise<boolean>;
}

interface PersistenceErrorLike {
  code?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function persistenceErrorCode(error: unknown): string | null {
  if (!isRecord(error)) return null;
  const value = (error as PersistenceErrorLike).code;
  return typeof value === 'string' ? value : null;
}

export function isConstellationUniqueViolation(error: unknown): boolean {
  return persistenceErrorCode(error) === '23505';
}

export function classifyConstellationPersistenceError(
  error: unknown,
): ConstellationDataError | null {
  switch (persistenceErrorCode(error)) {
    case '23505':
      return new ConstellationDataError(
        'CONFLICT',
        'The Constellation record already exists.',
      );
    case '23503':
    case '42501':
      return new ConstellationDataError(
        'NOT_FOUND',
        'The referenced Constellation record was not found.',
      );
    case '22P02':
    case '23514':
      return new ConstellationDataError(
        'INVALID_INPUT',
        'The request violates a Constellation data constraint.',
      );
    default:
      return null;
  }
}

function throwTranslatedPersistenceError(error: unknown): never {
  const translated = classifyConstellationPersistenceError(error);
  if (translated) throw translated;
  throw error;
}

function includes<const T extends readonly string[]>(
  values: T,
  value: string,
): value is T[number] {
  return values.includes(value);
}

function requireGoalStatus(value: string): GoalDbStatus {
  if (!includes(GOAL_DB_STATUSES, value)) {
    throw new Error('Constellation source goal has an invalid status.');
  }
  return value;
}

function requireNodeKind(value: string): ConstellationEarnedNodeKind {
  if (!includes(EARNED_NODE_KINDS, value)) {
    throw new Error('Constellation node has an invalid kind.');
  }
  return value;
}

function requireAnnotationKind(value: string): ConstellationAnnotationKind {
  if (value !== 'note' && value !== 'projection') {
    throw new Error('Constellation annotation has an invalid kind.');
  }
  return value;
}

function requireAnnotationStatus(
  value: string,
): ConstellationAnnotationStatus {
  if (value !== 'draft' && value !== 'archived') {
    throw new Error('Constellation annotation has an invalid status.');
  }
  return value;
}

function requireBrtCategory(value: string): ConstellationBrtCategory {
  if (value !== 'bud' && value !== 'rose' && value !== 'thorn') {
    throw new Error('Constellation evidence reference has an invalid category.');
  }
  return value;
}

function requirePersistedEdgeKind(value: string): GraphEdgeKind {
  if (!includes(PERSISTED_EDGE_KINDS, value)) {
    throw new Error('Constellation edge has an invalid kind.');
  }
  return value;
}

function requireEdgeValence(value: string | null): GraphEdgeValence | null {
  if (value === null) return null;
  if (!includes(EDGE_VALENCES, value)) {
    throw new Error('Constellation edge has an invalid valence.');
  }
  return value;
}

function countQualifiedCandidates(characterProfile: unknown): number {
  if (!isRecord(characterProfile)) return 0;
  const candidates = characterProfile.constellation_candidates;
  if (!isRecord(candidates)) return 0;

  let count = 0;
  for (const candidate of Object.values(candidates)) {
    if (isRecord(candidate) && candidate.status === 'promoted') {
      count += 1;
    }
  }
  return count;
}

function emptyGoalsByStatus(): ConstellationGraphCountsDTO['source']['goalsByStatus'] {
  return {
    active: 0,
    draft: 0,
    complete: 0,
    stagnant: 0,
    discovered: 0,
    archived: 0,
  };
}

function countGoalsByStatus(
  goals: readonly ConstellationGoalSourceRow[],
): ConstellationGraphCountsDTO['source']['goalsByStatus'] {
  const counts = emptyGoalsByStatus();
  for (const goal of goals) {
    counts[requireGoalStatus(goal.status)] += 1;
  }
  return counts;
}

export function computeConstellationAccessEligibility(
  snapshot: Pick<ConstellationSnapshot, 'goals' | 'echoEntryCount'>,
): boolean {
  const nonDraftGoalCount = snapshot.goals.filter(
    (goal) => requireGoalStatus(goal.status) !== 'draft',
  ).length;
  return (
    nonDraftGoalCount >= CONSTELLATION_GOAL_ACCESS_GATE
    && snapshot.echoEntryCount >= CONSTELLATION_ECHO_ACCESS_GATE
  );
}

function stableHashPart(value: string, seed: number): string {
  let hash = seed;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16_777_619);
  }
  hash ^= hash >>> 16;
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function derivedSeasonNodeId(ownerId: string): string {
  const namespace = `ohara:constellation:current-season:${ownerId}`;
  const opaqueKey = [
    stableHashPart(namespace, 0x811c9dc5),
    stableHashPart(namespace, 0x9e3779b9),
    stableHashPart(namespace, 0x85ebca6b),
    stableHashPart(namespace, 0xc2b2ae35),
  ].join('');
  return `season:${opaqueKey}`;
}

function fallbackSeasonNode(ownerId: string): ConstellationEarnedNodeDTO {
  const id = derivedSeasonNodeId(ownerId);
  return {
    id,
    selectionKey: `node:${id}`,
    kind: 'season',
    label: 'Current Season',
    description: null,
    authorship: 'system',
    isEarned: true,
    source: { type: 'season', id: null },
    visibilityScore: null,
    firstSeenAt: null,
    lastActivityAt: null,
  };
}

function isCompleteGoalWithinGrace(
  goal: ConstellationGoalSourceRow,
  generatedAt: string,
): boolean {
  const updatedAt = Date.parse(goal.updated_at);
  const generatedAtTime = Date.parse(generatedAt);
  return (
    Number.isFinite(updatedAt)
    && Number.isFinite(generatedAtTime)
    && generatedAtTime - updatedAt <= COMPLETE_GOAL_GRACE_MILLISECONDS
  );
}

function isGoalNodeVisible(
  goal: ConstellationGoalSourceRow,
  generatedAt: string,
): boolean {
  const status = requireGoalStatus(goal.status);
  return (
    status === 'active'
    || (status === 'complete' && isCompleteGoalWithinGrace(goal, generatedAt))
  );
}

function mapEarnedNode(
  row: ConstellationNodeRow,
  goalById: ReadonlyMap<string, ConstellationGoalSourceRow>,
): ConstellationEarnedNodeDTO {
  const kind = requireNodeKind(row.kind);
  const common = {
    id: row.id,
    selectionKey: `node:${row.id}` as const,
    label: row.label,
    description: row.description,
    authorship: 'system' as const,
    isEarned: true as const,
    visibilityScore: row.visibility_score,
    firstSeenAt: row.first_seen_at,
    lastActivityAt: row.last_activity_at,
  };

  switch (kind) {
    case 'season':
      return {
        ...common,
        kind,
        source: { type: 'season', id: row.source_key },
      };
    case 'ambition':
      if (!row.source_project_id) {
        throw new Error('Constellation ambition is missing its project source.');
      }
      return {
        ...common,
        kind,
        source: { type: 'project', id: row.source_project_id },
      };
    case 'goal': {
      if (!row.source_goal_id) {
        throw new Error('Constellation goal node is missing its goal source.');
      }
      const goal = goalById.get(row.source_goal_id);
      if (!goal) {
        throw new Error('Constellation goal source was not loaded.');
      }
      return {
        ...common,
        kind,
        source: {
          type: 'goal',
          id: row.source_goal_id,
          goalStatus: requireGoalStatus(goal.status),
        },
      };
    }
    case 'reflection':
    case 'tension':
      if (!row.source_key) {
        throw new Error('Constellation candidate node is missing its source key.');
      }
      return {
        ...common,
        kind,
        source: { type: 'candidate', id: row.source_key },
      };
    case 'trait':
      return {
        ...common,
        kind,
        source: {
          type: 'character_profile',
          id: row.source_profile_id,
        },
      };
  }
}

export function mapConstellationAnnotation(
  row: ConstellationAnnotationRow,
): ConstellationAnnotationDTO {
  const kind = requireAnnotationKind(row.kind);
  const common = {
    id: row.id,
    selectionKey: `annotation:${row.id}` as const,
    status: requireAnnotationStatus(row.status),
    authorship: 'user' as const,
    isDraft: true as const,
    label: row.label,
    body: row.body,
    anchorEarnedNodeId: row.anchor_earned_node_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };

  return kind === 'note'
    ? { ...common, kind: 'note' }
    : { ...common, kind: 'projection' };
}

export function mapConstellationEvidenceReference(
  row: ConstellationEvidenceReferenceRow,
): ConstellationEvidenceLink {
  return {
    id: row.id,
    ownerId: row.owner_id,
    echoEntryId: row.echo_entry_id,
    goalId: row.goal_id,
    brtCategory: requireBrtCategory(row.brt_category),
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPersistedEdge(
  row: ConstellationEdgeRow,
): ConstellationGraphEdgeDTO {
  const common = {
    id: row.id,
    from: {
      entityType: 'earned_node' as const,
      id: row.source_node_id,
    },
    to: {
      entityType: 'earned_node' as const,
      id: row.target_node_id,
    },
    valence: requireEdgeValence(row.valence),
    weight: row.weight,
    isPersisted: true,
  };

  switch (requirePersistedEdgeKind(row.kind)) {
    case 'season_membership':
      return { ...common, kind: 'season_membership' };
    case 'ambition_goal':
      return { ...common, kind: 'ambition_goal' };
    case 'goal_pattern':
      return { ...common, kind: 'goal_pattern' };
    case 'pattern_cooccurrence':
      return { ...common, kind: 'pattern_cooccurrence' };
    case 'trait_derivation':
      return { ...common, kind: 'trait_derivation' };
    case 'tension_composition':
      return { ...common, kind: 'tension_composition' };
    default:
      throw new Error('Derived Constellation edges cannot be persisted.');
  }
}

function countEarnedNodes(
  nodes: readonly ConstellationEarnedNodeDTO[],
): ConstellationGraphCountsDTO['earnedNodes'] {
  const byKind = {
    season: 0,
    ambition: 0,
    goal: 0,
    reflection: 0,
    trait: 0,
    tension: 0,
  };

  for (const node of nodes) {
    byKind[node.kind] += 1;
  }

  return {
    total: Object.values(byKind).reduce((total, count) => total + count, 0),
    byKind,
  };
}

function countVirtualClusters(
  clusters: readonly ConstellationVirtualBrtClusterDTO[],
): ConstellationGraphCountsDTO['virtualBrtClusters'] {
  const counts = { total: clusters.length, bud: 0, rose: 0, thorn: 0 };
  for (const cluster of clusters) {
    counts[cluster.brtCategory] += 1;
  }
  return counts;
}

function compareEarnedNodes(
  left: ConstellationEarnedNodeDTO,
  right: ConstellationEarnedNodeDTO,
): number {
  return (
    EARNED_NODE_KINDS.indexOf(left.kind)
    - EARNED_NODE_KINDS.indexOf(right.kind)
  ) || left.id.localeCompare(right.id);
}

export interface AssembleConstellationOptions {
  accessEligible?: boolean;
}

export function assembleConstellationGraphDTO(
  ownerId: string,
  snapshot: ConstellationSnapshot,
  generatedAt: string,
  options: AssembleConstellationOptions = {},
): ConstellationGraphDTO {
  const goalsByStatus = countGoalsByStatus(snapshot.goals);
  const qualifiedCandidates = countQualifiedCandidates(
    snapshot.characterProfile,
  );
  const sourceCounts = {
    echoEntries: snapshot.echoEntryCount,
    qualifiedCandidates,
    goalsByStatus,
  };
  const accessEligible = options.accessEligible
    ?? computeConstellationAccessEligibility(snapshot);

  const goalById = new Map(snapshot.goals.map((goal) => [goal.id, goal]));
  const projectById = new Map(
    snapshot.projects.map((project) => [project.id, project]),
  );
  const persistedNodes = snapshot.nodes
    .filter((row) => row.owner_id === ownerId && row.status === 'active')
    .filter((row) => {
      if (row.kind === 'goal') {
        const goal = row.source_goal_id
          ? goalById.get(row.source_goal_id)
          : undefined;
        return goal ? isGoalNodeVisible(goal, generatedAt) : false;
      }
      if (row.kind === 'ambition') {
        const project = row.source_project_id
          ? projectById.get(row.source_project_id)
          : undefined;
        return project?.status === 'active';
      }
      return true;
    })
    .map((row) => mapEarnedNode(row, goalById));

  const seasonNodes = persistedNodes.filter((node) => node.kind === 'season');
  if (seasonNodes.length > 1) {
    throw new Error('Constellation has more than one active Season node.');
  }
  const seasonNode = seasonNodes[0] ?? fallbackSeasonNode(ownerId);
  const earnedNodes = [
    seasonNode,
    ...persistedNodes.filter((node) => node.kind !== 'season'),
  ].sort(compareEarnedNodes);
  const earnedNodeIds = new Set(earnedNodes.map((node) => node.id));

  const annotations = snapshot.annotations
    .filter(
      (row) =>
        row.owner_id === ownerId
        && row.status === 'draft',
    )
    .map(mapConstellationAnnotation)
    .sort((left, right) => (
      right.updatedAt.localeCompare(left.updatedAt)
      || left.id.localeCompare(right.id)
    ));

  const evidenceReferences = snapshot.evidenceReferences
    .filter((row) => row.owner_id === ownerId)
    .map(mapConstellationEvidenceReference);
  const goalNodeIds = new Map(
    earnedNodes.flatMap((node) => (
      node.kind === 'goal'
        ? [[node.source.id, node.id] as const]
        : []
    )),
  );
  const virtualBrtClusters = groupGoalEvidenceByBrt(
    evidenceReferences,
    goalNodeIds,
  );

  const persistedEdges = snapshot.edges
    .filter(
      (row) =>
        row.owner_id === ownerId
        && row.status === 'active'
        && earnedNodeIds.has(row.source_node_id)
        && earnedNodeIds.has(row.target_node_id),
    )
    .map(mapPersistedEdge);

  const annotationEdges: ConstellationGraphEdgeDTO[] = annotations.flatMap(
    (annotation) => (
      annotation.anchorEarnedNodeId
      && earnedNodeIds.has(annotation.anchorEarnedNodeId)
        ? [{
            id: `annotation-anchor:${annotation.id}:${annotation.anchorEarnedNodeId}`,
            from: { entityType: 'annotation', id: annotation.id },
            to: {
              entityType: 'earned_node',
              id: annotation.anchorEarnedNodeId,
            },
            kind: 'annotation_anchor',
            valence: null,
            weight: null,
            isPersisted: false,
          }]
        : []
    ),
  );
  const clusterEdges: ConstellationGraphEdgeDTO[] = virtualBrtClusters.map(
    (cluster) => ({
      id: `goal-evidence:${stableVirtualBrtClusterId(
        cluster.goalId,
        cluster.brtCategory,
      )}`,
      from: { entityType: 'earned_node', id: cluster.goalNodeId },
      to: { entityType: 'virtual_brt_cluster', id: cluster.id },
      kind: 'goal_evidence_cluster',
      valence: null,
      weight: null,
      isPersisted: false,
    }),
  );
  const edges = [
    ...persistedEdges,
    ...annotationEdges,
    ...clusterEdges,
  ].sort((left, right) => left.id.localeCompare(right.id));

  const annotationCounts = snapshot.annotations.reduce(
    (counts, row) => {
      if (row.owner_id === ownerId) {
        counts[requireAnnotationStatus(row.status)] += 1;
      }
      return counts;
    },
    { draft: 0, archived: 0 },
  );
  const hasGraphData = (
    earnedNodes.some((node) => node.kind !== 'season')
    || annotations.length > 0
    || virtualBrtClusters.length > 0
    || edges.length > 0
  );
  const hasSourceActivity = (
    snapshot.echoEntryCount > 0
    || snapshot.goals.length > 0
    || qualifiedCandidates > 0
  );
  const counts: ConstellationGraphCountsDTO = {
    earnedNodes: countEarnedNodes(earnedNodes),
    annotations: annotationCounts,
    virtualBrtClusters: countVirtualClusters(virtualBrtClusters),
    edges: edges.length,
    evidenceLinks: evidenceReferences.length,
    source: sourceCounts,
  };

  if (!accessEligible) {
    return {
      version: '1.0',
      state: {
        accessEligible: false,
        hasGraphData,
        renderState: 'locked',
        phase: 'initial_read_only',
        dataOrigin: 'real',
        generatedAt,
        dataAsOf: generatedAt,
        seasonNodeId: null,
      },
      earnedNodes: [],
      annotations: [],
      virtualBrtClusters: [],
      edges: [],
      counts,
    };
  }

  return {
    version: '1.0',
    state: {
      accessEligible: true,
      hasGraphData,
      renderState: hasGraphData
        ? 'graph'
        : hasSourceActivity
          ? 'patterns_forming'
          : 'season_only',
      phase: 'initial_read_only',
      dataOrigin: 'real',
      generatedAt,
      dataAsOf: generatedAt,
      seasonNodeId: seasonNode.id,
    },
    earnedNodes,
    annotations,
    virtualBrtClusters,
    edges,
    counts,
  };
}

async function requireOwnedAnchor(
  ownerId: string,
  anchorEarnedNodeId: string | null | undefined,
  repository: ConstellationMutationRepository,
): Promise<void> {
  if (
    anchorEarnedNodeId
    && !(
      await repository.hasOwnedVisibleEarnedNode(
        ownerId,
        anchorEarnedNodeId,
      )
    )
  ) {
    throw new ConstellationDataError(
      'NOT_FOUND',
      'Annotation anchor not found.',
    );
  }
}

export async function createConstellationAnnotation(
  ownerId: string,
  input: CreateConstellationAnnotationInput,
  repository: ConstellationMutationRepository,
): Promise<ConstellationAnnotationDTO> {
  await requireOwnedAnchor(ownerId, input.anchorEarnedNodeId, repository);
  try {
    return mapConstellationAnnotation(
      await repository.insertAnnotation(ownerId, input),
    );
  } catch (error) {
    return throwTranslatedPersistenceError(error);
  }
}

export async function updateConstellationAnnotation(
  ownerId: string,
  annotationId: string,
  input: UpdateConstellationAnnotationInput,
  repository: ConstellationMutationRepository,
): Promise<ConstellationAnnotationDTO> {
  const existing = await repository.findAnnotation(ownerId, annotationId);
  if (!existing) {
    throw new ConstellationDataError('NOT_FOUND', 'Annotation not found.');
  }
  if (existing.status === 'archived') {
    throw new ConstellationDataError(
      'CONFLICT',
      'Archived annotations cannot be edited.',
    );
  }

  await requireOwnedAnchor(
    ownerId,
    input.anchorEarnedNodeId,
    repository,
  );
  const patch: ConstellationAnnotationRowPatch = {};
  if (input.kind !== undefined) patch.kind = input.kind;
  if (input.label !== undefined) patch.label = input.label;
  if (input.body !== undefined) patch.body = input.body;
  if (input.anchorEarnedNodeId !== undefined) {
    patch.anchor_earned_node_id = input.anchorEarnedNodeId;
  }

  try {
    const updated = await repository.updateAnnotation(
      ownerId,
      annotationId,
      patch,
    );
    if (!updated) {
      throw new ConstellationDataError(
        'CONFLICT',
        'The annotation changed before it could be edited.',
      );
    }
    return mapConstellationAnnotation(updated);
  } catch (error) {
    if (error instanceof ConstellationDataError) throw error;
    return throwTranslatedPersistenceError(error);
  }
}

export async function archiveConstellationAnnotation(
  ownerId: string,
  annotationId: string,
  repository: ConstellationMutationRepository,
): Promise<ConstellationAnnotationDTO> {
  const existing = await repository.findAnnotation(ownerId, annotationId);
  if (!existing) {
    throw new ConstellationDataError('NOT_FOUND', 'Annotation not found.');
  }
  if (existing.status === 'archived') {
    return mapConstellationAnnotation(existing);
  }

  try {
    const archived = await repository.updateAnnotation(
      ownerId,
      annotationId,
      { status: 'archived' },
    );
    if (!archived) {
      throw new ConstellationDataError(
        'CONFLICT',
        'The annotation changed before it could be archived.',
      );
    }
    return mapConstellationAnnotation(archived);
  } catch (error) {
    if (error instanceof ConstellationDataError) throw error;
    return throwTranslatedPersistenceError(error);
  }
}

async function requireOwnedEvidenceSources(
  ownerId: string,
  echoEntryId: string,
  goalId: string,
  repository: ConstellationMutationRepository,
): Promise<void> {
  const [hasEchoEntry, hasGoal] = await Promise.all([
    repository.hasOwnedEchoEntry(ownerId, echoEntryId),
    repository.hasOwnedGoal(ownerId, goalId),
  ]);
  if (!hasEchoEntry) {
    throw new ConstellationDataError('NOT_FOUND', 'Entry not found.');
  }
  if (!hasGoal) {
    throw new ConstellationDataError('NOT_FOUND', 'Goal not found.');
  }
}

function evidencePatchForCreate(
  row: ConstellationEvidenceReferenceRow,
  input: CreateConstellationEvidenceReferenceInput,
): ConstellationEvidenceReferenceRowPatch | null {
  const patch: ConstellationEvidenceReferenceRowPatch = {};
  if (row.brt_category !== input.brtCategory) {
    patch.brt_category = input.brtCategory;
  }
  if (input.note !== undefined && row.note !== input.note) {
    patch.note = input.note;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

async function updateExistingEvidenceReference(
  ownerId: string,
  existing: ConstellationEvidenceReferenceRow,
  input: CreateConstellationEvidenceReferenceInput,
  repository: ConstellationMutationRepository,
): Promise<ConstellationEvidenceReferenceWriteResult> {
  const patch = evidencePatchForCreate(existing, input);
  if (!patch) {
    return {
      evidenceReference: mapConstellationEvidenceReference(existing),
      created: false,
    };
  }

  const updated = await repository.updateEvidenceReference(
    ownerId,
    existing.id,
    patch,
  );
  if (!updated) {
    throw new ConstellationDataError(
      'CONFLICT',
      'The evidence reference changed before it could be updated.',
    );
  }
  return {
    evidenceReference: mapConstellationEvidenceReference(updated),
    created: false,
  };
}

export async function createOrUpdateConstellationEvidenceReference(
  ownerId: string,
  input: CreateConstellationEvidenceReferenceInput,
  repository: ConstellationMutationRepository,
): Promise<ConstellationEvidenceReferenceWriteResult> {
  await requireOwnedEvidenceSources(
    ownerId,
    input.echoEntryId,
    input.goalId,
    repository,
  );

  const existing = await repository.findEvidenceReferenceByPair(
    ownerId,
    input.echoEntryId,
    input.goalId,
  );
  if (existing) {
    return updateExistingEvidenceReference(
      ownerId,
      existing,
      input,
      repository,
    );
  }

  try {
    return {
      evidenceReference: mapConstellationEvidenceReference(
        await repository.insertEvidenceReference(ownerId, input),
      ),
      created: true,
    };
  } catch (error) {
    if (!isConstellationUniqueViolation(error)) {
      return throwTranslatedPersistenceError(error);
    }

    const concurrent = await repository.findEvidenceReferenceByPair(
      ownerId,
      input.echoEntryId,
      input.goalId,
    );
    if (!concurrent) {
      return throwTranslatedPersistenceError(error);
    }
    return updateExistingEvidenceReference(
      ownerId,
      concurrent,
      input,
      repository,
    );
  }
}

export async function updateConstellationEvidenceReference(
  ownerId: string,
  evidenceReferenceId: string,
  input: UpdateConstellationEvidenceReferenceInput,
  repository: ConstellationMutationRepository,
): Promise<ConstellationEvidenceLink> {
  const existing = await repository.findEvidenceReference(
    ownerId,
    evidenceReferenceId,
  );
  if (!existing) {
    throw new ConstellationDataError(
      'NOT_FOUND',
      'Evidence reference not found.',
    );
  }

  const patch: ConstellationEvidenceReferenceRowPatch = {};
  if (
    input.brtCategory !== undefined
    && input.brtCategory !== existing.brt_category
  ) {
    patch.brt_category = input.brtCategory;
  }
  if (input.note !== undefined && input.note !== existing.note) {
    patch.note = input.note;
  }
  if (Object.keys(patch).length === 0) {
    return mapConstellationEvidenceReference(existing);
  }

  try {
    const updated = await repository.updateEvidenceReference(
      ownerId,
      evidenceReferenceId,
      patch,
    );
    if (!updated) {
      throw new ConstellationDataError(
        'NOT_FOUND',
        'Evidence reference not found.',
      );
    }
    return mapConstellationEvidenceReference(updated);
  } catch (error) {
    if (error instanceof ConstellationDataError) throw error;
    return throwTranslatedPersistenceError(error);
  }
}

export async function deleteConstellationEvidenceReference(
  ownerId: string,
  evidenceReferenceId: string,
  repository: ConstellationMutationRepository,
): Promise<ConstellationDeleteResult> {
  const existing = await repository.findEvidenceReference(
    ownerId,
    evidenceReferenceId,
  );
  if (!existing) {
    throw new ConstellationDataError(
      'NOT_FOUND',
      'Evidence reference not found.',
    );
  }

  try {
    const deleted = await repository.deleteEvidenceReference(
      ownerId,
      evidenceReferenceId,
    );
    if (!deleted) {
      throw new ConstellationDataError(
        'NOT_FOUND',
        'Evidence reference not found.',
      );
    }
    return { id: evidenceReferenceId };
  } catch (error) {
    if (error instanceof ConstellationDataError) throw error;
    return throwTranslatedPersistenceError(error);
  }
}
