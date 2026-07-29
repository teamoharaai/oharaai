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

export type ConstellationCoordinateSpace = 'canvas' | 'parent';

export interface ConstellationNodePosition {
  readonly x: number;
  readonly y: number;
  /**
   * Omitted positions are treated as canvas coordinates for compatibility
   * with the committed deterministic renderer fixture.
   */
  readonly coordinateSpace?: ConstellationCoordinateSpace;
}

export interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}

export interface ConstellationLayoutSpec {
  readonly nodePositions: Readonly<Record<string, ConstellationNodePosition>>;
  readonly edgeBends?: Readonly<Record<string, number>>;
}

export interface ConstellationNodeLayout {
  readonly id: string;
  readonly selectionKey: string;
  readonly entityType: ConstellationGraphViewNode['entityType'];
  readonly normalized: NormalizedPoint;
  readonly coordinateSpace: ConstellationCoordinateSpace;
  readonly parentSelectionKey: string | null;
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

interface EllipseRing {
  readonly center: NormalizedPoint;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly startAngle: number;
}

const LIVE_LAYOUT_RINGS = {
  ambition: {
    center: { x: 0.5, y: 0.5 },
    radiusX: 0.19,
    radiusY: 0.16,
    startAngle: -Math.PI / 2,
  },
  category: {
    center: { x: 0.5, y: 0.5 },
    radiusX: 0.25,
    radiusY: 0.22,
    startAngle: -Math.PI / 2 + 0.16,
  },
  goal: {
    center: { x: 0.5, y: 0.5 },
    radiusX: 0.35,
    radiusY: 0.31,
    startAngle: -Math.PI / 2 - 0.08,
  },
  outer: {
    center: { x: 0.5, y: 0.5 },
    radiusX: 0.43,
    radiusY: 0.4,
    startAngle: -Math.PI / 2 + 0.08,
  },
} as const satisfies Record<string, EllipseRing>;

function positionsOnRing(
  nodes: readonly ConstellationGraphViewNode[],
  ring: EllipseRing,
): Readonly<Record<string, NormalizedPoint>> {
  if (nodes.length === 0) return {};

  return Object.fromEntries(
    [...nodes]
      .sort((left, right) => left.selectionKey.localeCompare(right.selectionKey))
      .map((node, index) => {
        const angle = ring.startAngle + (index / nodes.length) * Math.PI * 2;
        return [
          node.selectionKey,
          {
            x: ring.center.x + Math.cos(angle) * ring.radiusX,
            y: ring.center.y + Math.sin(angle) * ring.radiusY,
          },
        ];
      }),
  );
}

function satelliteParentSelectionKey(
  node: ConstellationGraphViewNode,
): string | null {
  switch (node.entityType) {
    case 'virtual_brt_cluster':
      return `node:${node.node.goalNodeId}`;
    case 'annotation':
    case 'earned_node':
    case 'virtual_goal_category':
      return null;
  }
}

function defaultSatellitePositions(
  nodes: readonly ConstellationGraphViewNode[],
): Readonly<Record<string, ConstellationNodePosition>> {
  const byParent = new Map<string, ConstellationGraphViewNode[]>();

  for (const node of nodes) {
    const parentSelectionKey = satelliteParentSelectionKey(node);
    if (!parentSelectionKey) continue;
    const children = byParent.get(parentSelectionKey) ?? [];
    children.push(node);
    byParent.set(parentSelectionKey, children);
  }

  const positions: Record<string, ConstellationNodePosition> = {};
  for (const children of byParent.values()) {
    const sorted = [...children].sort((left, right) => (
      left.selectionKey.localeCompare(right.selectionKey)
    ));
    sorted.forEach((child, index) => {
      const angle = -Math.PI / 2 + (index / sorted.length) * Math.PI * 2;
      positions[child.selectionKey] = {
        coordinateSpace: 'parent',
        x: Math.cos(angle) * 0.072,
        y: Math.sin(angle) * 0.108,
      };
    });
  }

  return positions;
}

/**
 * Produces deterministic geometry for real DTO-backed entities. Top-level
 * nodes receive stable canvas coordinates; goal satellites receive relative
 * offsets so parent movement can be resolved without rewriting every child.
 */
export function createConstellationLayoutSpec(
  graph: ConstellationGraphViewModel,
): ConstellationLayoutSpec {
  const seasonNodes = graph.nodes.filter(
    (node) => node.entityType === 'earned_node' && node.node.kind === 'season',
  );
  const ambitionNodes = graph.nodes.filter(
    (node) => node.entityType === 'earned_node' && node.node.kind === 'ambition',
  );
  const goalNodes = graph.nodes.filter(
    (node) => node.entityType === 'earned_node' && node.node.kind === 'goal',
  );
  const categoryNodes = graph.nodes.filter(
    (node) => node.entityType === 'virtual_goal_category',
  );
  const satelliteNodes = graph.nodes.filter(
    (node) => satelliteParentSelectionKey(node) !== null,
  );
  const reserved = new Set([
    ...seasonNodes,
    ...ambitionNodes,
    ...goalNodes,
    ...categoryNodes,
    ...satelliteNodes,
  ].map((node) => node.selectionKey));
  const outerNodes = graph.nodes.filter(
    (node) => !reserved.has(node.selectionKey),
  );
  const nodePositions: Record<string, ConstellationNodePosition> = {
    ...positionsOnRing(ambitionNodes, LIVE_LAYOUT_RINGS.ambition),
    ...positionsOnRing(categoryNodes, LIVE_LAYOUT_RINGS.category),
    ...positionsOnRing(goalNodes, LIVE_LAYOUT_RINGS.goal),
    ...positionsOnRing(outerNodes, LIVE_LAYOUT_RINGS.outer),
    ...defaultSatellitePositions(satelliteNodes),
  };

  for (const season of seasonNodes) {
    nodePositions[season.selectionKey] = { x: 0.5, y: 0.5 };
  }

  const edgeBends = Object.fromEntries(
    [...graph.edges]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((edge, index) => [
        edge.id,
        ((index % 3) - 1) * 0.012,
      ]),
  );

  return { nodePositions, edgeBends };
}

export function moveConstellationNode(
  graph: ConstellationGraphViewModel,
  spec: ConstellationLayoutSpec,
  selectionKey: string,
  nextNormalized: NormalizedPoint,
): ConstellationLayoutSpec {
  assertNormalizedPoint(selectionKey, nextNormalized);
  const node = graph.nodes.find(
    (candidate) => candidate.selectionKey === selectionKey,
  );
  if (!node) return spec;

  const parentSelectionKey = satelliteParentSelectionKey(node);
  let nextPosition: ConstellationNodePosition = {
    coordinateSpace: 'canvas',
    ...nextNormalized,
  };

  if (parentSelectionKey) {
    const currentLayout = calculateConstellationLayout(graph, spec);
    const parent = currentLayout.nodes.find(
      (candidate) => candidate.selectionKey === parentSelectionKey,
    );
    if (!parent) return spec;
    nextPosition = {
      coordinateSpace: 'parent',
      x: nextNormalized.x - parent.normalized.x,
      y: nextNormalized.y - parent.normalized.y,
    };
    assertParentOffset(selectionKey, nextPosition);
  }

  return {
    ...spec,
    nodePositions: {
      ...spec.nodePositions,
      [selectionKey]: nextPosition,
    },
  };
}

export function sanitizeConstellationPositionOverrides(
  graph: ConstellationGraphViewModel,
  positions: Readonly<Record<string, ConstellationNodePosition>>,
): Readonly<Record<string, ConstellationNodePosition>> {
  const valid: Record<string, ConstellationNodePosition> = {};
  for (const node of graph.nodes) {
    const position = positions[node.selectionKey];
    if (!position) continue;
    const expectedSpace = satelliteParentSelectionKey(node)
      ? 'parent'
      : 'canvas';
    const coordinateSpace = position.coordinateSpace ?? 'canvas';
    const coordinatesAreFinite = (
      Number.isFinite(position.x)
      && Number.isFinite(position.y)
    );
    const coordinatesAreBounded = coordinateSpace === 'canvas'
      ? (
          position.x >= 0.02
          && position.x <= 0.98
          && position.y >= 0.02
          && position.y <= 0.98
        )
      : (
          position.x >= -1
          && position.x <= 1
          && position.y >= -1
          && position.y <= 1
        );
    if (
      coordinateSpace === expectedSpace
      && coordinatesAreFinite
      && coordinatesAreBounded
    ) {
      valid[node.selectionKey] = {
        coordinateSpace,
        x: position.x,
        y: position.y,
      };
    }
  }
  return valid;
}

function dimensionsForNode(node: ConstellationGraphViewNode): NodeDimensions {
  switch (node.entityType) {
    case 'annotation':
      return node.node.kind === 'projection'
        ? { width: 92, height: 92, boundaryRadius: 46 }
        : { width: 156, height: 62, boundaryRadius: 82 };
    case 'virtual_brt_cluster':
      return { width: 34, height: 34, boundaryRadius: 17 };
    case 'virtual_goal_category':
      return { width: 54, height: 54, boundaryRadius: 27 };
    case 'earned_node':
      switch (node.node.kind) {
        case 'season':
          return { width: 104, height: 104, boundaryRadius: 52 };
        case 'ambition':
          return { width: 178, height: 48, boundaryRadius: 91 };
        case 'goal':
          return { width: 58, height: 58, boundaryRadius: 29 };
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

function assertParentOffset(
  selectionKey: string,
  point: ConstellationNodePosition,
): void {
  if (
    !Number.isFinite(point.x)
    || !Number.isFinite(point.y)
    || point.x < -1
    || point.x > 1
    || point.y < -1
    || point.y > 1
  ) {
    throw new RangeError(
      `Constellation parent offset for ${selectionKey} must be bounded to −1–1.`,
    );
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
  const graphNodesBySelectionKey = new Map(
    graph.nodes.map((node) => [node.selectionKey, node]),
  );
  const resolvedPositions = new Map<string, {
    coordinateSpace: ConstellationCoordinateSpace;
    normalized: NormalizedPoint;
    parentSelectionKey: string | null;
  }>();

  const resolvePosition = (
    node: ConstellationGraphViewNode,
    ancestry = new Set<string>(),
  ): {
    coordinateSpace: ConstellationCoordinateSpace;
    normalized: NormalizedPoint;
    parentSelectionKey: string | null;
  } | null => {
    const existing = resolvedPositions.get(node.selectionKey);
    if (existing) return existing;
    const position = spec.nodePositions[node.selectionKey];
    if (!position) return null;
    if (ancestry.has(node.selectionKey)) {
      throw new RangeError(
        `Constellation layout contains a parent cycle at ${node.selectionKey}.`,
      );
    }

    const coordinateSpace = position.coordinateSpace ?? 'canvas';
    const parentSelectionKey = coordinateSpace === 'parent'
      ? satelliteParentSelectionKey(node)
      : null;
    let normalized: NormalizedPoint;

    if (coordinateSpace === 'parent') {
      assertParentOffset(node.selectionKey, position);
      if (!parentSelectionKey) {
        throw new RangeError(
          `Constellation node ${node.selectionKey} does not support parent coordinates.`,
        );
      }
      const parent = graphNodesBySelectionKey.get(parentSelectionKey);
      if (!parent) return null;
      const nextAncestry = new Set(ancestry);
      nextAncestry.add(node.selectionKey);
      const parentPosition = resolvePosition(parent, nextAncestry);
      if (!parentPosition) return null;
      normalized = {
        x: parentPosition.normalized.x + position.x,
        y: parentPosition.normalized.y + position.y,
      };
      normalized = {
        x: Math.min(0.98, Math.max(0.02, normalized.x)),
        y: Math.min(0.98, Math.max(0.02, normalized.y)),
      };
    } else {
      normalized = { x: position.x, y: position.y };
      assertNormalizedPoint(node.selectionKey, normalized);
    }

    const resolved = { coordinateSpace, normalized, parentSelectionKey };
    resolvedPositions.set(node.selectionKey, resolved);
    return resolved;
  };

  const nodes = graph.nodes.flatMap<ConstellationNodeLayout>((node) => {
    const resolved = resolvePosition(node);
    if (!resolved) {
      missingNodeSelectionKeys.push(node.selectionKey);
      return [];
    }

    return [{
      id: node.id,
      selectionKey: node.selectionKey,
      entityType: node.entityType,
      normalized: resolved.normalized,
      coordinateSpace: resolved.coordinateSpace,
      parentSelectionKey: resolved.parentSelectionKey,
      center: toCanvasPoint(resolved.normalized),
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
