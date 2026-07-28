import type {
  ConstellationAnnotationDTO,
  ConstellationBrtCategory,
  ConstellationEarnedNodeDTO,
  ConstellationEarnedNodeKind,
  ConstellationGraphCountsDTO,
  ConstellationGraphDTO,
  ConstellationGraphEdgeDTO,
  ConstellationRenderState,
  ConstellationVirtualBrtClusterDTO,
  GraphEdgeKind,
  GraphEdgeValence,
  GraphEntityRef,
} from './types.ts';

const EARNED_NODE_KINDS = [
  'season',
  'ambition',
  'goal',
  'reflection',
  'trait',
  'tension',
] as const satisfies readonly ConstellationEarnedNodeKind[];
const BRT_CATEGORIES = [
  'bud',
  'rose',
  'thorn',
] as const satisfies readonly ConstellationBrtCategory[];
const EDGE_KINDS = [
  'season_membership',
  'ambition_goal',
  'goal_pattern',
  'pattern_cooccurrence',
  'trait_derivation',
  'tension_composition',
  'annotation_anchor',
  'goal_evidence_cluster',
] as const satisfies readonly GraphEdgeKind[];
const EDGE_VALENCES = [
  'positive',
  'negative',
  'neutral',
  'mixed',
  'contradictory',
] as const satisfies readonly GraphEdgeValence[];
const RENDER_STATES = [
  'locked',
  'season_only',
  'patterns_forming',
  'graph',
] as const satisfies readonly ConstellationRenderState[];
const GOAL_STATUSES = [
  'active',
  'draft',
  'complete',
  'stagnant',
  'discovered',
  'archived',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function includes<const TValues extends readonly string[]>(
  values: TValues,
  value: unknown,
): value is TValues[number] {
  return typeof value === 'string' && values.includes(value);
}

function hasCounts(
  value: unknown,
  keys: readonly string[],
): value is Record<string, number> {
  if (!isRecord(value)) return false;
  return keys.every((key) => isCount(value[key]));
}

function isEarnedSource(
  value: unknown,
  kind: ConstellationEarnedNodeKind,
): boolean {
  if (!isRecord(value) || typeof value.type !== 'string') return false;

  switch (kind) {
    case 'season':
      return value.type === 'season' && isNullableString(value.id);
    case 'ambition':
      return value.type === 'project' && isNonEmptyString(value.id);
    case 'goal':
      return (
        value.type === 'goal'
        && isNonEmptyString(value.id)
        && includes(GOAL_STATUSES, value.goalStatus)
      );
    case 'reflection':
    case 'tension':
      return value.type === 'candidate' && isNonEmptyString(value.id);
    case 'trait':
      return value.type === 'character_profile' && isNullableString(value.id);
  }
}

function isEarnedNode(value: unknown): value is ConstellationEarnedNodeDTO {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.id)
    || value.selectionKey !== `node:${value.id}`
    || !includes(EARNED_NODE_KINDS, value.kind)
    || !isNonEmptyString(value.label)
    || !isNullableString(value.description)
    || value.authorship !== 'system'
    || value.isEarned !== true
    || !isNullableNumber(value.visibilityScore)
    || !isNullableString(value.firstSeenAt)
    || !isNullableString(value.lastActivityAt)
  ) {
    return false;
  }

  return isEarnedSource(value.source, value.kind);
}

function isAnnotation(
  value: unknown,
): value is ConstellationAnnotationDTO {
  return (
    isRecord(value)
    && isNonEmptyString(value.id)
    && value.selectionKey === `annotation:${value.id}`
    && (value.kind === 'note' || value.kind === 'projection')
    && (value.status === 'draft' || value.status === 'archived')
    && value.authorship === 'user'
    && value.isDraft === true
    && isNonEmptyString(value.label)
    && isNullableString(value.body)
    && isNullableString(value.anchorEarnedNodeId)
    && isNonEmptyString(value.createdAt)
    && isNonEmptyString(value.updatedAt)
    && isNullableString(value.archivedAt)
  );
}

export function parseConstellationAnnotationDTO(
  value: unknown,
): ConstellationAnnotationDTO | null {
  return isAnnotation(value) ? value : null;
}

function isVirtualBrtCluster(
  value: unknown,
): value is ConstellationVirtualBrtClusterDTO {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.goalId)
    || !isNonEmptyString(value.goalNodeId)
    || !includes(BRT_CATEGORIES, value.brtCategory)
  ) {
    return false;
  }

  const id = `brt:${value.goalId}:${value.brtCategory}`;
  const label = {
    bud: 'Bud',
    rose: 'Rose',
    thorn: 'Thorn',
  }[value.brtCategory];

  return (
    value.id === id
    && value.selectionKey === id
    && value.label === label
    && isCount(value.evidenceLinkCount)
    && isNullableString(value.latestEvidenceAt)
    && value.isVirtual === true
    && value.isPersisted === false
  );
}

function isEntityRef(value: unknown): value is GraphEntityRef {
  return (
    isRecord(value)
    && (
      value.entityType === 'earned_node'
      || value.entityType === 'annotation'
      || value.entityType === 'virtual_brt_cluster'
    )
    && isNonEmptyString(value.id)
  );
}

function isEdge(value: unknown): value is ConstellationGraphEdgeDTO {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.id)
    || !isEntityRef(value.from)
    || !isEntityRef(value.to)
    || !includes(EDGE_KINDS, value.kind)
    || !(value.valence === null || includes(EDGE_VALENCES, value.valence))
    || !isNullableNumber(value.weight)
    || typeof value.isPersisted !== 'boolean'
  ) {
    return false;
  }

  if (value.kind === 'annotation_anchor') {
    return (
      value.from.entityType === 'annotation'
      && value.to.entityType === 'earned_node'
      && value.valence === null
      && value.weight === null
      && value.isPersisted === false
    );
  }

  if (value.kind === 'goal_evidence_cluster') {
    return (
      value.from.entityType === 'earned_node'
      && value.to.entityType === 'virtual_brt_cluster'
      && value.valence === null
      && value.weight === null
      && value.isPersisted === false
    );
  }

  return (
    value.from.entityType === 'earned_node'
    && value.to.entityType === 'earned_node'
  );
}

function isCounts(value: unknown): value is ConstellationGraphCountsDTO {
  if (!isRecord(value)) return false;
  const earnedNodes = value.earnedNodes;
  const annotations = value.annotations;
  const virtualBrtClusters = value.virtualBrtClusters;
  const source = value.source;

  return (
    isRecord(earnedNodes)
    && isCount(earnedNodes.total)
    && hasCounts(earnedNodes.byKind, EARNED_NODE_KINDS)
    && hasCounts(annotations, ['draft', 'archived'])
    && hasCounts(virtualBrtClusters, ['total', ...BRT_CATEGORIES])
    && isCount(value.edges)
    && isCount(value.evidenceLinks)
    && isRecord(source)
    && isCount(source.echoEntries)
    && isCount(source.qualifiedCandidates)
    && hasCounts(source.goalsByStatus, GOAL_STATUSES)
  );
}

function isGraphState(
  value: unknown,
): value is ConstellationGraphDTO['state'] {
  return (
    isRecord(value)
    && typeof value.accessEligible === 'boolean'
    && typeof value.hasGraphData === 'boolean'
    && includes(RENDER_STATES, value.renderState)
    && value.phase === 'initial_read_only'
    && value.dataOrigin === 'real'
    && isNonEmptyString(value.generatedAt)
    && isNonEmptyString(value.dataAsOf)
    && isNullableString(value.seasonNodeId)
  );
}

/**
 * Validates the versioned client boundary before a live response reaches the
 * graph adapter. Production data must identify itself as real and honor the
 * owner-scoped DTO shapes; malformed responses become retryable load errors.
 */
export function parseConstellationGraphDTO(
  value: unknown,
): ConstellationGraphDTO | null {
  if (
    !isRecord(value)
    || value.version !== '1.0'
    || !isGraphState(value.state)
    || !Array.isArray(value.earnedNodes)
    || !value.earnedNodes.every(isEarnedNode)
    || !Array.isArray(value.annotations)
    || !value.annotations.every(isAnnotation)
    || !Array.isArray(value.virtualBrtClusters)
    || !value.virtualBrtClusters.every(isVirtualBrtCluster)
    || !Array.isArray(value.edges)
    || !value.edges.every(isEdge)
    || !isCounts(value.counts)
  ) {
    return null;
  }

  const seasonNodes = value.earnedNodes.filter(
    (node) => node.kind === 'season',
  );
  if (
    value.state.accessEligible
      ? (
          seasonNodes.length !== 1
          || value.state.seasonNodeId !== seasonNodes[0].id
          || value.state.renderState === 'locked'
        )
      : (
          value.state.renderState !== 'locked'
          || value.state.seasonNodeId !== null
          || value.earnedNodes.length !== 0
          || value.annotations.length !== 0
          || value.virtualBrtClusters.length !== 0
          || value.edges.length !== 0
        )
  ) {
    return null;
  }

  return value as unknown as ConstellationGraphDTO;
}
