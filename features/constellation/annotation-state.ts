import type {
  ConstellationAnnotationDTO,
  ConstellationEarnedNodeDTO,
  ConstellationGraphDTO,
  ConstellationGraphEdgeDTO,
  ConstellationRenderState,
} from './types.ts';

const PERSISTED_NODE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPersistedAnnotationAnchorTarget(
  node: ConstellationEarnedNodeDTO,
): boolean {
  return PERSISTED_NODE_ID_PATTERN.test(node.id);
}

function annotationEdge(
  dto: ConstellationGraphDTO,
  annotation: ConstellationAnnotationDTO,
): ConstellationGraphEdgeDTO | null {
  if (
    annotation.status !== 'draft'
    || !annotation.anchorEarnedNodeId
    || !dto.earnedNodes.some(
      (node) => node.id === annotation.anchorEarnedNodeId,
    )
  ) {
    return null;
  }

  return {
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
  };
}

function withoutAnnotationEdges(
  edges: readonly ConstellationGraphEdgeDTO[],
  annotationId: string,
): ConstellationGraphEdgeDTO[] {
  return edges.filter(
    (edge) => !(
      edge.kind === 'annotation_anchor'
      && edge.from.id === annotationId
    ),
  );
}

function hasSourceActivity(dto: ConstellationGraphDTO): boolean {
  const goals = dto.counts.source.goalsByStatus;
  return (
    dto.counts.source.echoEntries > 0
    || dto.counts.source.qualifiedCandidates > 0
    || Object.values(goals).some((count) => count > 0)
  );
}

function renderStateFor(
  dto: ConstellationGraphDTO,
  annotations: readonly ConstellationAnnotationDTO[],
  edges: readonly ConstellationGraphEdgeDTO[],
): {
  hasGraphData: boolean;
  renderState: ConstellationRenderState;
} {
  if (!dto.state.accessEligible) {
    return { hasGraphData: false, renderState: 'locked' };
  }

  const hasGraphData = (
    dto.earnedNodes.some((node) => node.kind !== 'season')
    || annotations.length > 0
    || dto.virtualBrtClusters.length > 0
    || edges.length > 0
  );

  return {
    hasGraphData,
    renderState: hasGraphData
      ? 'graph'
      : hasSourceActivity(dto)
        ? 'patterns_forming'
        : 'season_only',
  };
}

function withGraphCollections(
  dto: ConstellationGraphDTO,
  annotations: readonly ConstellationAnnotationDTO[],
  edges: readonly ConstellationGraphEdgeDTO[],
  annotationCounts: ConstellationGraphDTO['counts']['annotations'],
): ConstellationGraphDTO {
  const graphState = renderStateFor(dto, annotations, edges);
  return {
    ...dto,
    state: {
      ...dto.state,
      ...graphState,
    },
    annotations,
    edges,
    counts: {
      ...dto.counts,
      annotations: annotationCounts,
      edges: edges.length,
    },
  };
}

export function addActiveAnnotation(
  dto: ConstellationGraphDTO,
  annotation: ConstellationAnnotationDTO,
): ConstellationGraphDTO {
  const annotations = [
    annotation,
    ...dto.annotations.filter((item) => item.id !== annotation.id),
  ];
  const edges = withoutAnnotationEdges(dto.edges, annotation.id);
  const nextEdge = annotationEdge(dto, annotation);
  if (nextEdge) edges.push(nextEdge);

  return withGraphCollections(
    dto,
    annotations,
    edges,
    {
      ...dto.counts.annotations,
      draft: dto.counts.annotations.draft + 1,
    },
  );
}

export function replaceActiveAnnotation(
  dto: ConstellationGraphDTO,
  annotationId: string,
  annotation: ConstellationAnnotationDTO,
): ConstellationGraphDTO {
  const annotations = dto.annotations.map((item) => (
    item.id === annotationId ? annotation : item
  ));
  const edges = withoutAnnotationEdges(dto.edges, annotationId);
  const nextEdge = annotationEdge(dto, annotation);
  if (nextEdge) edges.push(nextEdge);

  return withGraphCollections(
    dto,
    annotations,
    edges,
    dto.counts.annotations,
  );
}

export function replaceOptimisticAnnotation(
  dto: ConstellationGraphDTO,
  optimisticId: string,
  annotation: ConstellationAnnotationDTO,
): ConstellationGraphDTO {
  return replaceActiveAnnotation(dto, optimisticId, annotation);
}

export function archiveActiveAnnotation(
  dto: ConstellationGraphDTO,
  annotationId: string,
): ConstellationGraphDTO {
  const existed = dto.annotations.some((item) => item.id === annotationId);
  if (!existed) return dto;

  const annotations = dto.annotations.filter(
    (item) => item.id !== annotationId,
  );
  const edges = withoutAnnotationEdges(dto.edges, annotationId);

  return withGraphCollections(
    dto,
    annotations,
    edges,
    {
      draft: Math.max(0, dto.counts.annotations.draft - 1),
      archived: dto.counts.annotations.archived + 1,
    },
  );
}
