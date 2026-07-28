import { groupGoalEvidenceByBrt } from './graph.ts';
import type {
  ConstellationBrtCategory,
  ConstellationEchoSearchOption,
  ConstellationEvidenceLink,
  ConstellationGoalEvidenceItem,
  ConstellationGraphDTO,
  ConstellationGraphEdgeDTO,
  ConstellationRenderState,
} from './types.ts';

export type ConstellationEchoSearchStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error';

export interface ConstellationEchoSearchState {
  status: ConstellationEchoSearchStatus;
  goalId: string | null;
  query: string;
  requestId: number;
  options: readonly ConstellationEchoSearchOption[];
  error: string | null;
  retryable: boolean;
}

export type ConstellationEchoSearchAction =
  | { type: 'reset'; goalId: string | null }
  | {
      type: 'started';
      goalId: string;
      query: string;
      requestId: number;
    }
  | {
      type: 'succeeded';
      goalId: string;
      query: string;
      requestId: number;
      options: readonly ConstellationEchoSearchOption[];
    }
  | {
      type: 'failed';
      goalId: string;
      query: string;
      requestId: number;
      error: string;
      retryable: boolean;
    };

export const INITIAL_ECHO_SEARCH_STATE: ConstellationEchoSearchState = {
  status: 'idle',
  goalId: null,
  query: '',
  requestId: 0,
  options: [],
  error: null,
  retryable: true,
};

function isCurrentEchoSearch(
  state: ConstellationEchoSearchState,
  action: {
    goalId: string;
    query: string;
    requestId: number;
  },
): boolean {
  return (
    state.goalId === action.goalId
    && state.query === action.query
    && state.requestId === action.requestId
  );
}

export function reduceConstellationEchoSearch(
  state: ConstellationEchoSearchState,
  action: ConstellationEchoSearchAction,
): ConstellationEchoSearchState {
  switch (action.type) {
    case 'reset':
      return {
        ...INITIAL_ECHO_SEARCH_STATE,
        goalId: action.goalId,
        requestId: state.requestId + 1,
      };
    case 'started':
      return {
        status: 'loading',
        goalId: action.goalId,
        query: action.query,
        requestId: action.requestId,
        options: [],
        error: null,
        retryable: true,
      };
    case 'succeeded':
      return isCurrentEchoSearch(state, action)
        ? {
            ...state,
            status: 'ready',
            options: action.options,
            error: null,
          }
        : state;
    case 'failed':
      return isCurrentEchoSearch(state, action)
        ? {
            ...state,
            status: 'error',
            options: [],
            error: action.error,
            retryable: action.retryable,
          }
        : state;
  }
}

export function hasEvidenceForEcho(
  items: readonly ConstellationGoalEvidenceItem[],
  echoEntryId: string,
): boolean {
  return items.some((item) => item.echoEntryId === echoEntryId);
}

export function upsertGoalEvidenceItem(
  items: readonly ConstellationGoalEvidenceItem[],
  item: ConstellationGoalEvidenceItem,
): readonly ConstellationGoalEvidenceItem[] {
  return [
    item,
    ...items.filter(
      (candidate) => (
        candidate.id !== item.id
        && candidate.echoEntryId !== item.echoEntryId
      ),
    ),
  ].sort((left, right) => (
    right.updatedAt.localeCompare(left.updatedAt)
    || left.id.localeCompare(right.id)
  ));
}

export function replaceGoalEvidenceLink(
  item: ConstellationGoalEvidenceItem,
  link: ConstellationEvidenceLink,
): ConstellationGoalEvidenceItem {
  return {
    ...link,
    echo: item.echo,
  };
}

export function removeGoalEvidenceItem(
  items: readonly ConstellationGoalEvidenceItem[],
  evidenceReferenceId: string,
): readonly ConstellationGoalEvidenceItem[] {
  return items.filter((item) => item.id !== evidenceReferenceId);
}

export function groupGoalEvidenceItems(
  items: readonly ConstellationGoalEvidenceItem[],
): Record<
  ConstellationBrtCategory,
  readonly ConstellationGoalEvidenceItem[]
> {
  return {
    bud: items.filter((item) => item.brtCategory === 'bud'),
    rose: items.filter((item) => item.brtCategory === 'rose'),
    thorn: items.filter((item) => item.brtCategory === 'thorn'),
  };
}

function virtualCounts(
  clusters: ConstellationGraphDTO['virtualBrtClusters'],
): ConstellationGraphDTO['counts']['virtualBrtClusters'] {
  const result = {
    total: clusters.length,
    bud: 0,
    rose: 0,
    thorn: 0,
  };
  for (const cluster of clusters) {
    result[cluster.brtCategory] += 1;
  }
  return result;
}

function hasSourceActivity(dto: ConstellationGraphDTO): boolean {
  return (
    dto.counts.source.echoEntries > 0
    || dto.counts.source.qualifiedCandidates > 0
    || Object.values(dto.counts.source.goalsByStatus).some(
      (count) => count > 0,
    )
  );
}

function evidenceRenderState(
  dto: ConstellationGraphDTO,
  clusters: ConstellationGraphDTO['virtualBrtClusters'],
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
    || dto.annotations.length > 0
    || clusters.length > 0
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

/**
 * Recomputes one visible goal's virtual BRT clusters from its complete current
 * evidence list. Earned nodes, annotations, persisted edges, and all other
 * goals' evidence summaries remain untouched.
 */
export function replaceGoalEvidenceInGraph(
  dto: ConstellationGraphDTO,
  goalId: string,
  items: readonly ConstellationGoalEvidenceItem[],
): ConstellationGraphDTO {
  const goalNode = dto.earnedNodes.find(
    (node) => node.kind === 'goal' && node.source.id === goalId,
  );
  if (!goalNode) return dto;

  const previousClusters = dto.virtualBrtClusters.filter(
    (cluster) => cluster.goalId === goalId,
  );
  const previousClusterIds = new Set<string>(
    previousClusters.map((cluster) => cluster.id),
  );
  const retainedClusters = dto.virtualBrtClusters.filter(
    (cluster) => cluster.goalId !== goalId,
  );
  const nextClusters = groupGoalEvidenceByBrt(
    items,
    new Map([[goalId, goalNode.id]]),
  );
  const clusters = [...retainedClusters, ...nextClusters]
    .sort((left, right) => left.id.localeCompare(right.id));
  const retainedEdges = dto.edges.filter(
    (edge) => !(
      edge.kind === 'goal_evidence_cluster'
      && previousClusterIds.has(edge.to.id)
    ),
  );
  const nextEdges: ConstellationGraphEdgeDTO[] = nextClusters.map(
    (cluster) => ({
      id: `goal-evidence:${cluster.id}`,
      from: { entityType: 'earned_node', id: cluster.goalNodeId },
      to: { entityType: 'virtual_brt_cluster', id: cluster.id },
      kind: 'goal_evidence_cluster',
      valence: null,
      weight: null,
      isPersisted: false,
    }),
  );
  const edges = [...retainedEdges, ...nextEdges]
    .sort((left, right) => left.id.localeCompare(right.id));
  const previousEvidenceCount = previousClusters.reduce(
    (total, cluster) => total + cluster.evidenceLinkCount,
    0,
  );

  return {
    ...dto,
    state: {
      ...dto.state,
      ...evidenceRenderState(dto, clusters, edges),
    },
    virtualBrtClusters: clusters,
    edges,
    counts: {
      ...dto.counts,
      virtualBrtClusters: virtualCounts(clusters),
      edges: edges.length,
      evidenceLinks: Math.max(
        0,
        dto.counts.evidenceLinks - previousEvidenceCount + items.length,
      ),
    },
  };
}
