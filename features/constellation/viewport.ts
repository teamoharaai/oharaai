export const CONSTELLATION_FIT_ZOOM = 1;
export const CONSTELLATION_MIN_ZOOM = 0.65;
export const CONSTELLATION_MAX_ZOOM = 2.5;
export const CONSTELLATION_ZOOM_STEP = 1.2;

const VIEWPORT_OVERSCROLL_RATIO = 0.12;

export interface ConstellationViewportDimensions {
  readonly height: number;
  readonly width: number;
}

export interface ConstellationViewportPoint {
  readonly x: number;
  readonly y: number;
}

export interface ConstellationViewportTransform {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export interface ConstellationViewBoxDimensions {
  readonly height: number;
  readonly width: number;
}

export function clampConstellationZoom(scale: number): number {
  'worklet';
  return Math.min(
    CONSTELLATION_MAX_ZOOM,
    Math.max(CONSTELLATION_MIN_ZOOM, scale),
  );
}

function maximumTranslation(
  viewportSize: number,
  scale: number,
): number {
  'worklet';
  if (!Number.isFinite(viewportSize) || viewportSize <= 0) return 0;
  const zoomedOverflow = Math.max(0, scale - CONSTELLATION_FIT_ZOOM) / 2;
  return viewportSize * (zoomedOverflow + VIEWPORT_OVERSCROLL_RATIO);
}

export function clampConstellationTranslation(
  point: ConstellationViewportPoint,
  scale: number,
  viewport: ConstellationViewportDimensions,
): ConstellationViewportPoint {
  'worklet';
  const maxX = maximumTranslation(viewport.width, scale);
  const maxY = maximumTranslation(viewport.height, scale);
  return {
    x: Math.min(maxX, Math.max(-maxX, point.x)),
    y: Math.min(maxY, Math.max(-maxY, point.y)),
  };
}

export function panConstellationViewport(
  transform: ConstellationViewportTransform,
  delta: ConstellationViewportPoint,
  viewport: ConstellationViewportDimensions,
): ConstellationViewportTransform {
  'worklet';
  const translation = clampConstellationTranslation(
    {
      x: transform.x + delta.x,
      y: transform.y + delta.y,
    },
    transform.scale,
    viewport,
  );
  return { ...translation, scale: transform.scale };
}

/**
 * Keeps the graph point beneath a cursor or pinch focal point stationary while
 * zoom changes. Coordinates and translations are viewport pixels; the visual
 * layer uses a center transform origin to match this calculation.
 */
export function zoomConstellationViewportAt(
  transform: ConstellationViewportTransform,
  requestedScale: number,
  focalPoint: ConstellationViewportPoint,
  viewport: ConstellationViewportDimensions,
): ConstellationViewportTransform {
  'worklet';
  const scale = clampConstellationZoom(requestedScale);
  const ratio = scale / transform.scale;
  const originX = focalPoint.x - viewport.width / 2;
  const originY = focalPoint.y - viewport.height / 2;
  const translation = clampConstellationTranslation(
    {
      x: originX - (originX - transform.x) * ratio,
      y: originY - (originY - transform.y) * ratio,
    },
    scale,
    viewport,
  );

  return { ...translation, scale };
}

export function fitConstellationViewport(): ConstellationViewportTransform {
  'worklet';
  return { scale: CONSTELLATION_FIT_ZOOM, x: 0, y: 0 };
}

export function constellationDragDeltaToNormalized(
  delta: ConstellationViewportPoint,
  zoom: number,
  viewport: ConstellationViewportDimensions,
  viewBox: ConstellationViewBoxDimensions,
): ConstellationViewportPoint {
  'worklet';
  const meetScale = Math.min(
    viewport.width / viewBox.width,
    viewport.height / viewBox.height,
  );
  if (
    !Number.isFinite(meetScale)
    || meetScale <= 0
    || !Number.isFinite(zoom)
    || zoom <= 0
  ) {
    return { x: 0, y: 0 };
  }

  return {
    x: delta.x / (zoom * meetScale * viewBox.width),
    y: delta.y / (zoom * meetScale * viewBox.height),
  };
}

export function clampConstellationNodePosition(
  point: ConstellationViewportPoint,
): ConstellationViewportPoint {
  'worklet';
  return {
    x: Math.min(0.98, Math.max(0.02, point.x)),
    y: Math.min(0.98, Math.max(0.02, point.y)),
  };
}
