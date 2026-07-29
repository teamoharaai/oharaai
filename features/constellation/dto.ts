import type {
  ConstellationAnnotationDTO,
  ConstellationBrtCategory,
  ConstellationEchoSearchDTO,
  ConstellationEarnedNodeDTO,
  ConstellationEarnedNodeKind,
  ConstellationEvidenceEchoSummary,
  ConstellationEvidenceLink,
  ConstellationGraphCountsDTO,
  ConstellationGraphDTO,
  ConstellationGraphEdgeDTO,
  ConstellationGoalEvidenceDTO,
  ConstellationGoalEvidenceItem,
  ConstellationReflectionInspectorDTO,
  ConstellationReflectionValence,
  ConstellationRenderState,
  ConstellationVirtualBrtClusterDTO,
  GraphEdgeKind,
  GraphEdgeValence,
  GraphEntityRef,
} from './types.ts';

const EVIDENCE_NOTE_MAX_LENGTH = 280;
const ECHO_EXCERPT_MAX_LENGTH = 240;
const ECHO_SEARCH_QUERY_MAX_LENGTH = 120;

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
  'season_only',
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
const REFLECTION_VALENCES = [
  'positive',
  'negative',
  'neutral',
  'mixed',
] as const satisfies readonly ConstellationReflectionValence[];
const REFLECTION_CANDIDATE_TYPES = [
  'theme',
  'trait',
  'tension',
  'insight',
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
    && isNullableString(value.anchorGoalId)
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

function isEvidenceLink(value: unknown): value is ConstellationEvidenceLink {
  return (
    isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.ownerId)
    && isNonEmptyString(value.echoEntryId)
    && isNonEmptyString(value.goalId)
    && isNullableString(value.note)
    && (value.note === null || value.note.length <= EVIDENCE_NOTE_MAX_LENGTH)
    && isNonEmptyString(value.createdAt)
    && isNonEmptyString(value.updatedAt)
  );
}

export function parseConstellationEvidenceLinkDTO(
  value: unknown,
): ConstellationEvidenceLink | null {
  return isEvidenceLink(value) ? value : null;
}

function isEvidenceEchoSummary(
  value: unknown,
): value is ConstellationEvidenceEchoSummary {
  return (
    isRecord(value)
    && isNonEmptyString(value.id)
    && isNullableString(value.title)
    && typeof value.excerpt === 'string'
    && value.excerpt.length <= ECHO_EXCERPT_MAX_LENGTH
    && typeof value.excerptTruncated === 'boolean'
    && isNonEmptyString(value.createdAt)
  );
}

function isGoalEvidenceItem(
  value: unknown,
): value is ConstellationGoalEvidenceItem {
  if (!isEvidenceLink(value) || !isRecord(value)) return false;
  const record = value as unknown as Record<string, unknown>;
  return (
    includes(BRT_CATEGORIES, record.brtCategory)
    && isEvidenceEchoSummary(record.echo)
    && record.echo.id === value.echoEntryId
  );
}

export function parseConstellationGoalEvidenceDTO(
  value: unknown,
): ConstellationGoalEvidenceDTO | null {
  if (!isRecord(value) || !isRecord(value.goal)) return null;
  const goal = value.goal;
  if (
    !isNonEmptyString(goal.id)
    || !isNonEmptyString(goal.title)
    || !isNullableString(goal.description)
    || !includes(GOAL_STATUSES, goal.status)
    || !isNullableString(goal.deadline)
    || !(
      goal.project === null
      || (
        isRecord(goal.project)
        && isNonEmptyString(goal.project.id)
        && isNonEmptyString(goal.project.title)
      )
    )
    || !isNullableString(goal.vaultId)
    || !Array.isArray(value.items)
    || !value.items.every(isGoalEvidenceItem)
    || value.items.some((item) => item.goalId !== goal.id)
  ) {
    return null;
  }

  return value as unknown as ConstellationGoalEvidenceDTO;
}

export function parseConstellationReflectionInspectorDTO(
  value: unknown,
): ConstellationReflectionInspectorDTO | null {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.nodeId)
    || !isNonEmptyString(value.label)
    || !isNullableString(value.description)
    || !isNonEmptyString(value.candidateKey)
    || !includes(REFLECTION_CANDIDATE_TYPES, value.candidateType)
    || !isCount(value.occurrences)
    || !(
      value.aggregatedScore === null
      || (
        typeof value.aggregatedScore === 'number'
        && Number.isFinite(value.aggregatedScore)
        && value.aggregatedScore >= 0
      )
    )
    || !isNullableString(value.firstSeenAt)
    || !isNullableString(value.lastSeenAt)
    || !(
      value.dominantValence === null
      || includes(REFLECTION_VALENCES, value.dominantValence)
    )
    || !Array.isArray(value.valenceHistory)
    || !value.valenceHistory.every((event) => (
      isRecord(event)
      && includes(REFLECTION_VALENCES, event.valence)
      && isNonEmptyString(event.echoEntryId)
      && isNonEmptyString(event.timestamp)
    ))
    || !Array.isArray(value.evidence)
    || !value.evidence.every((item) => (
      isEvidenceEchoSummary(item)
      && isRecord(item)
      && (
        item.valence === null
        || includes(REFLECTION_VALENCES, item.valence)
      )
    ))
  ) {
    return null;
  }

  return value as unknown as ConstellationReflectionInspectorDTO;
}

function isEchoSearchOption(value: unknown): boolean {
  if (!isEvidenceEchoSummary(value) || !isRecord(value)) return false;
  return (
    value.existingReference === null
    || (
      isRecord(value.existingReference)
      && isNonEmptyString(value.existingReference.id)
      && includes(
        BRT_CATEGORIES,
        value.existingReference.brtCategory,
      )
    )
  );
}

export function parseConstellationEchoSearchDTO(
  value: unknown,
): ConstellationEchoSearchDTO | null {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.goalId)
    || typeof value.query !== 'string'
    || value.query.length > ECHO_SEARCH_QUERY_MAX_LENGTH
    || !Array.isArray(value.options)
    || !value.options.every(isEchoSearchOption)
  ) {
    return null;
  }

  return value as unknown as ConstellationEchoSearchDTO;
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

  // With the access gate removed, every valid graph carries exactly one Season
  // anchor and names it in state.seasonNodeId.
  const seasonNodes = value.earnedNodes.filter(
    (node) => node.kind === 'season',
  );
  if (
    seasonNodes.length !== 1
    || value.state.seasonNodeId !== seasonNodes[0].id
  ) {
    return null;
  }

  return value as unknown as ConstellationGraphDTO;
}
