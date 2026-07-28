import { CONSTELLATION_RENDER_BUDGET } from './tokens.ts';
import type {
  ConstellationBrtCategory,
  ConstellationEarnedNodeCounts,
  ConstellationEvidenceLink,
  ConstellationGraphDTO,
  ConstellationGraphEdgeDTO,
  ConstellationGraphFilters,
  ConstellationGraphViewModel,
  ConstellationGraphViewNode,
  ConstellationVirtualBrtClusterDTO,
  GraphEntityRef,
} from './types.ts';

export interface GraphEndpointValidation {
  endpoint: 'from' | 'to';
  ref: GraphEntityRef;
  isValid: boolean;
  reason: 'missing_node' | 'entity_type_mismatch' | null;
}

export interface EdgeEndpointValidation {
  edgeId: string;
  from: GraphEndpointValidation;
  to: GraphEndpointValidation;
  isValid: boolean;
}

export interface GraphTopologyValidation {
  duplicateNodeIds: readonly string[];
  malformedEdges: readonly EdgeEndpointValidation[];
  isValid: boolean;
}

export interface ConnectedNeighborhood {
  center: ConstellationGraphViewNode;
  nodes: readonly ConstellationGraphViewNode[];
  edges: readonly ConstellationGraphEdgeDTO[];
}

export interface ConstellationViewModelOptions {
  filters?: ConstellationGraphFilters;
  renderBudget?: number;
  selectedKey?: string | null;
}

export function findGraphNode(
  nodes: readonly ConstellationGraphViewNode[],
  id: string,
  entityType?: GraphEntityRef['entityType'],
): ConstellationGraphViewNode | undefined {
  return nodes.find((node) => node.id === id && (entityType === undefined || node.entityType === entityType));
}

function validateEndpoint(
  nodes: readonly ConstellationGraphViewNode[],
  endpoint: 'from' | 'to',
  ref: GraphEntityRef,
): GraphEndpointValidation {
  const node = findGraphNode(nodes, ref.id);

  if (!node) {
    return { endpoint, ref, isValid: false, reason: 'missing_node' };
  }

  if (node.entityType !== ref.entityType) {
    return { endpoint, ref, isValid: false, reason: 'entity_type_mismatch' };
  }

  return { endpoint, ref, isValid: true, reason: null };
}

export function validateEdgeEndpoints(
  nodes: readonly ConstellationGraphViewNode[],
  edge: ConstellationGraphEdgeDTO,
): EdgeEndpointValidation {
  const from = validateEndpoint(nodes, 'from', edge.from);
  const to = validateEndpoint(nodes, 'to', edge.to);

  return {
    edgeId: edge.id,
    from,
    to,
    isValid: from.isValid && to.isValid,
  };
}

export function validateGraphTopology(
  nodes: readonly ConstellationGraphViewNode[],
  edges: readonly ConstellationGraphEdgeDTO[],
): GraphTopologyValidation {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const node of nodes) {
    if (seen.has(node.id)) {
      duplicates.add(node.id);
    }
    seen.add(node.id);
  }

  const malformedEdges = edges
    .map((edge) => validateEdgeEndpoints(nodes, edge))
    .filter((result) => !result.isValid);

  return {
    duplicateNodeIds: [...duplicates],
    malformedEdges,
    isValid: duplicates.size === 0 && malformedEdges.length === 0,
  };
}

export function selectConnectedNeighborhood(
  nodes: readonly ConstellationGraphViewNode[],
  edges: readonly ConstellationGraphEdgeDTO[],
  centerId: string,
): ConnectedNeighborhood | undefined {
  const center = findGraphNode(nodes, centerId);
  if (!center) return undefined;

  const validEdges = edges.filter((edge) => validateEdgeEndpoints(nodes, edge).isValid);
  const connectedEdges = validEdges.filter(
    (edge) => edge.from.id === center.id || edge.to.id === center.id,
  );
  const connectedIds = new Set<string>([center.id]);

  for (const edge of connectedEdges) {
    connectedIds.add(edge.from.id);
    connectedIds.add(edge.to.id);
  }

  return {
    center,
    nodes: nodes.filter((node) => connectedIds.has(node.id)),
    edges: connectedEdges,
  };
}

export function stableVirtualBrtClusterId<
  TCategory extends ConstellationBrtCategory,
>(
  goalId: string,
  category: TCategory,
): `brt:${string}:${TCategory}` {
  return `brt:${goalId}:${category}`;
}

function toVirtualCluster(
  goalId: string,
  goalNodeId: string,
  category: ConstellationBrtCategory,
  evidenceLinks: readonly ConstellationEvidenceLink[],
): ConstellationVirtualBrtClusterDTO {
  const latestEvidenceAt = evidenceLinks.reduce<string | null>(
    (latest, link) => latest === null || link.updatedAt > latest ? link.updatedAt : latest,
    null,
  );
  const common = {
    goalId,
    goalNodeId,
    evidenceLinkCount: evidenceLinks.length,
    latestEvidenceAt,
    isVirtual: true as const,
    isPersisted: false as const,
  };

  switch (category) {
    case 'bud':
      return {
        ...common,
        id: stableVirtualBrtClusterId(goalId, 'bud'),
        selectionKey: stableVirtualBrtClusterId(goalId, 'bud'),
        brtCategory: 'bud',
        label: 'Bud',
      };
    case 'rose':
      return {
        ...common,
        id: stableVirtualBrtClusterId(goalId, 'rose'),
        selectionKey: stableVirtualBrtClusterId(goalId, 'rose'),
        brtCategory: 'rose',
        label: 'Rose',
      };
    case 'thorn':
      return {
        ...common,
        id: stableVirtualBrtClusterId(goalId, 'thorn'),
        selectionKey: stableVirtualBrtClusterId(goalId, 'thorn'),
        brtCategory: 'thorn',
        label: 'Thorn',
      };
  }
}

/**
 * Produces only visible goal/BRT groups. Missing goal nodes intentionally produce
 * no virtual cluster, so derived display entities cannot outlive their goal.
 */
export function groupGoalEvidenceByBrt(
  evidenceLinks: readonly ConstellationEvidenceLink[],
  goalNodeIds: ReadonlyMap<string, string>,
): readonly ConstellationVirtualBrtClusterDTO[] {
  const groups = new Map<string, ConstellationEvidenceLink[]>();

  for (const link of evidenceLinks) {
    const key = link.goalId + ':' + link.brtCategory;
    const existing = groups.get(key);
    if (existing) {
      existing.push(link);
    } else {
      groups.set(key, [link]);
    }
  }

  const clusters: ConstellationVirtualBrtClusterDTO[] = [];
  for (const links of groups.values()) {
    const [first] = links;
    const goalNodeId = goalNodeIds.get(first.goalId);
    if (goalNodeId) {
      clusters.push(toVirtualCluster(first.goalId, goalNodeId, first.brtCategory, links));
    }
  }

  return clusters.sort((left, right) => left.id.localeCompare(right.id));
}

function includes<T extends string>(values: readonly T[] | undefined, value: T): boolean {
  return values === undefined || values.includes(value);
}

/**
 * Returns a new array and preserves both the input array and its node objects.
 * Archived annotations are hidden by default, matching the graph read contract.
 */
export function filterGraphNodes(
  nodes: readonly ConstellationGraphViewNode[],
  filters: ConstellationGraphFilters = {},
): readonly ConstellationGraphViewNode[] {
  return nodes.filter((node) => {
    switch (node.entityType) {
      case 'earned_node':
        return includes(filters.earnedNodeKinds, node.node.kind);
      case 'annotation':
        return (
          (filters.includeArchivedAnnotations === true || node.node.status !== 'archived')
          && includes(filters.annotationKinds, node.node.kind)
        );
      case 'virtual_brt_cluster':
        return includes(filters.brtCategories, node.node.brtCategory);
    }
  });
}

function renderPriority(node: ConstellationGraphViewNode): number {
  switch (node.entityType) {
    case 'earned_node':
      switch (node.node.kind) {
        case 'season':
          return 0;
        case 'ambition':
          return 1;
        case 'goal':
          return 2;
        case 'trait':
          return 3;
        case 'reflection':
          return 4;
        case 'tension':
          return 5;
      }
    case 'virtual_brt_cluster':
      return 6;
    case 'annotation':
      return 7;
  }
}

function visibilityScore(node: ConstellationGraphViewNode): number {
  return node.entityType === 'earned_node' ? node.node.visibilityScore ?? Number.NEGATIVE_INFINITY : Number.NEGATIVE_INFINITY;
}

function activityTimestamp(node: ConstellationGraphViewNode): string {
  switch (node.entityType) {
    case 'earned_node':
      return node.node.lastActivityAt ?? '';
    case 'annotation':
      return node.node.updatedAt;
    case 'virtual_brt_cluster':
      return node.node.latestEvidenceAt ?? '';
  }
}

/**
 * Keeps the Season anchor when present, then makes deterministic priority,
 * visibility, activity, and ID selections without mutating the source graph.
 */
export function selectRenderBudget(
  nodes: readonly ConstellationGraphViewNode[],
  budget = CONSTELLATION_RENDER_BUDGET,
  selectedKey: string | null = null,
): readonly ConstellationGraphViewNode[] {
  if (budget <= 0) return [];

  const sorted = nodes
    .map((node, index) => ({ node, index }))
    .sort((left, right) => {
      const priority = renderPriority(left.node) - renderPriority(right.node);
      if (priority !== 0) return priority;

      const score = visibilityScore(right.node) - visibilityScore(left.node);
      if (score !== 0) return score;

      const activity = activityTimestamp(right.node).localeCompare(activityTimestamp(left.node));
      if (activity !== 0) return activity;

      const id = left.node.id.localeCompare(right.node.id);
      return id !== 0 ? id : left.index - right.index;
    })
    .map(({ node }) => node);
  const selected = selectedKey
    ? sorted.find((node) => node.selectionKey === selectedKey)
    : undefined;
  const visible = sorted.slice(0, budget);

  if (
    !selected
    || visible.some((node) => node.selectionKey === selected.selectionKey)
  ) {
    return visible;
  }

  const replaceIndex = [...visible]
    .reverse()
    .findIndex((node) => (
      node.entityType !== 'earned_node'
      || node.node.kind !== 'season'
    ));
  if (replaceIndex === -1) return visible;

  const result = [...visible];
  result[result.length - 1 - replaceIndex] = selected;
  return result;
}

export function countEarnedNodes(
  nodes: readonly ConstellationGraphViewNode[],
): ConstellationEarnedNodeCounts {
  const byKind = {
    season: 0,
    ambition: 0,
    goal: 0,
    reflection: 0,
    trait: 0,
    tension: 0,
  };

  for (const node of nodes) {
    if (node.entityType === 'earned_node') {
      byKind[node.node.kind] += 1;
    }
  }

  return {
    total: byKind.season + byKind.ambition + byKind.goal + byKind.reflection + byKind.trait + byKind.tension,
    byKind,
  };
}

function toViewNodes(dto: ConstellationGraphDTO): readonly ConstellationGraphViewNode[] {
  return [
    ...dto.earnedNodes.map((node) => ({
      entityType: 'earned_node' as const,
      id: node.id,
      selectionKey: node.selectionKey,
      node,
    })),
    ...dto.annotations.map((node) => ({
      entityType: 'annotation' as const,
      id: node.id,
      selectionKey: node.selectionKey,
      node,
    })),
    ...dto.virtualBrtClusters.map((node) => ({
      entityType: 'virtual_brt_cluster' as const,
      id: node.id,
      selectionKey: node.selectionKey,
      node,
    })),
  ];
}

export function resolveGraphSelection(
  dto: ConstellationGraphDTO,
  selectionKey: string | null,
): string | null {
  if (!selectionKey) return null;
  return toViewNodes(dto).some((node) => node.selectionKey === selectionKey)
    ? selectionKey
    : null;
}

/**
 * Converts a versioned DTO into a render-safe view model. It never substitutes
 * fixtures and drops edges whose endpoints are not in the selected render set.
 */
export function adaptGraphDtoToViewModel(
  dto: ConstellationGraphDTO,
  options: ConstellationViewModelOptions = {},
): ConstellationGraphViewModel {
  const filteredNodes = filterGraphNodes(toViewNodes(dto), options.filters);
  const nodes = selectRenderBudget(
    filteredNodes,
    options.renderBudget,
    options.selectedKey,
  );
  const edges = dto.edges.filter((edge) => validateEdgeEndpoints(nodes, edge).isValid);

  return {
    state: dto.state,
    nodes,
    edges,
    counts: dto.counts,
  };
}
