import type {
  ConstellationGraphEdgeDTO,
  ConstellationGraphViewModel,
  ConstellationGraphViewNode,
} from './types.ts';

export const CONSTELLATION_VIEW_BOX = {
  height: 760,
  width: 1200,
} as const;

export interface NormalizedPoint {
  readonly x: number;
  readonly y: number;
}

export interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}

export interface ConstellationLayoutSpec {
  readonly nodePositions: Readonly<Record<string, NormalizedPoint>>;
  readonly edgeBends?: Readonly<Record<string, number>>;
}

export interface ConstellationNodeLayout {
  readonly id: string;
  readonly selectionKey: string;
  readonly entityType: ConstellationGraphViewNode['entityType'];
  readonly normalized: NormalizedPoint;
  readonly center: CanvasPoint;
  readonly width: number;
  readonly height: number;
  readonly boundaryRadius: number;
}

export interface ConstellationEdgeLayout {
  readonly id: string;
  readonly edge: ConstellationGraphEdgeDTO;
  readonly path: string;
}

export interface ConstellationOrbitLayout {
  readonly center: CanvasPoint;
  readonly radius: number;
}

export interface ConstellationLayout {
  readonly viewBox: typeof CONSTELLATION_VIEW_BOX;
  readonly nodes: readonly ConstellationNodeLayout[];
  readonly edges: readonly ConstellationEdgeLayout[];
  readonly orbits: readonly ConstellationOrbitLayout[];
  readonly missingNodeSelectionKeys: readonly string[];
  readonly missingEdgeIds: readonly string[];
}

export interface SproutedLabelLayout {
  readonly selectionKey: string;
  readonly lineStart: CanvasPoint;
  readonly lineEnd: CanvasPoint;
  readonly box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

interface NodeDimensions {
  width: number;
  height: number;
  boundaryRadius: number;
}

function dimensionsForNode(node: ConstellationGraphViewNode): NodeDimensions {
  switch (node.entityType) {
    case 'annotation':
      return node.node.kind === 'projection'
        ? { width: 92, height: 92, boundaryRadius: 46 }
        : { width: 156, height: 62, boundaryRadius: 82 };
    case 'virtual_brt_cluster':
      return { width: 138, height: 42, boundaryRadius: 73 };
    case 'earned_node':
      switch (node.node.kind) {
        case 'season':
          return { width: 104, height: 104, boundaryRadius: 52 };
        case 'ambition':
          return { width: 178, height: 48, boundaryRadius: 91 };
        case 'goal':
          return { width: 72, height: 72, boundaryRadius: 51 };
        case 'reflection':
          return { width: 38, height: 38, boundaryRadius: 19 };
        case 'trait':
          return { width: 54, height: 54, boundaryRadius: 27 };
        case 'tension':
          return { width: 68, height: 42, boundaryRadius: 35 };
      }
  }
}

function assertNormalizedPoint(selectionKey: string, point: NormalizedPoint): void {
  if (
    !Number.isFinite(point.x)
    || !Number.isFinite(point.y)
    || point.x < 0
    || point.x > 1
    || point.y < 0
    || point.y > 1
  ) {
    throw new RangeError(`Constellation position for ${selectionKey} must be normalized to 0–1.`);
  }
}

function toCanvasPoint(point: NormalizedPoint): CanvasPoint {
  return {
    x: point.x * CONSTELLATION_VIEW_BOX.width,
    y: point.y * CONSTELLATION_VIEW_BOX.height,
  };
}

function endpointFor(
  from: ConstellationNodeLayout,
  to: ConstellationNodeLayout,
  boundaryRadius: number,
): CanvasPoint {
  const deltaX = to.center.x - from.center.x;
  const deltaY = to.center.y - from.center.y;
  const distance = Math.hypot(deltaX, deltaY) || 1;

  return {
    x: from.center.x + (deltaX / distance) * boundaryRadius,
    y: from.center.y + (deltaY / distance) * boundaryRadius,
  };
}

function edgePath(
  from: ConstellationNodeLayout,
  to: ConstellationNodeLayout,
  normalizedBend: number,
): string {
  const start = endpointFor(from, to, from.boundaryRadius);
  const end = endpointFor(to, from, to.boundaryRadius);
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const distance = Math.hypot(deltaX, deltaY) || 1;
  const bend = normalizedBend * Math.min(CONSTELLATION_VIEW_BOX.width, CONSTELLATION_VIEW_BOX.height);
  const control = {
    x: (start.x + end.x) / 2 - (deltaY / distance) * bend,
    y: (start.y + end.y) / 2 + (deltaX / distance) * bend,
  };

  return [
    'M',
    start.x.toFixed(2),
    start.y.toFixed(2),
    'Q',
    control.x.toFixed(2),
    control.y.toFixed(2),
    end.x.toFixed(2),
    end.y.toFixed(2),
  ].join(' ');
}

export function calculateConstellationLayout(
  graph: ConstellationGraphViewModel,
  spec: ConstellationLayoutSpec,
): ConstellationLayout {
  const missingNodeSelectionKeys: string[] = [];
  const nodes = graph.nodes.flatMap<ConstellationNodeLayout>((node) => {
    const normalized = spec.nodePositions[node.selectionKey];
    if (!normalized) {
      missingNodeSelectionKeys.push(node.selectionKey);
      return [];
    }

    assertNormalizedPoint(node.selectionKey, normalized);
    return [{
      id: node.id,
      selectionKey: node.selectionKey,
      entityType: node.entityType,
      normalized,
      center: toCanvasPoint(normalized),
      ...dimensionsForNode(node),
    }];
  });
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const missingEdgeIds: string[] = [];
  const edges = graph.edges.flatMap<ConstellationEdgeLayout>((edge) => {
    const from = nodesById.get(edge.from.id);
    const to = nodesById.get(edge.to.id);
    if (!from || !to) {
      missingEdgeIds.push(edge.id);
      return [];
    }

    return [{
      id: edge.id,
      edge,
      path: edgePath(from, to, spec.edgeBends?.[edge.id] ?? 0),
    }];
  });
  const season = graph.nodes.find(
    (node) => node.entityType === 'earned_node' && node.node.kind === 'season',
  );
  const seasonLayout = season
    ? nodes.find((node) => node.selectionKey === season.selectionKey)
    : undefined;

  return {
    viewBox: CONSTELLATION_VIEW_BOX,
    nodes,
    edges,
    orbits: seasonLayout
      ? [138, 236, 342].map((radius) => ({ center: seasonLayout.center, radius }))
      : [],
    missingNodeSelectionKeys,
    missingEdgeIds,
  };
}

export function calculateSproutedLabelLayout(
  layout: ConstellationLayout,
  selectionKey: string | null,
): SproutedLabelLayout | null {
  if (!selectionKey) return null;

  const node = layout.nodes.find((candidate) => candidate.selectionKey === selectionKey);
  if (!node) return null;

  const boxWidth = 224;
  const boxHeight = 68;
  const placeLeft = node.center.x > CONSTELLATION_VIEW_BOX.width * 0.72;
  const preferredX = placeLeft
    ? node.center.x - node.boundaryRadius - boxWidth - 34
    : node.center.x + node.boundaryRadius + 34;
  const boxX = Math.max(18, Math.min(preferredX, CONSTELLATION_VIEW_BOX.width - boxWidth - 18));
  const boxY = Math.max(18, Math.min(node.center.y - 92, CONSTELLATION_VIEW_BOX.height - boxHeight - 18));
  const lineEnd = {
    x: placeLeft ? boxX + boxWidth : boxX,
    y: boxY + boxHeight * 0.65,
  };

  return {
    selectionKey,
    lineStart: endpointFor(
      node,
      {
        ...node,
        center: lineEnd,
      },
      node.boundaryRadius,
    ),
    lineEnd,
    box: {
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
    },
  };
}
