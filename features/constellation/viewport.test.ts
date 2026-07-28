import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONSTELLATION_FIT_ZOOM,
  CONSTELLATION_MAX_ZOOM,
  CONSTELLATION_MIN_ZOOM,
  clampConstellationTranslation,
  clampConstellationZoom,
  fitConstellationViewport,
  panConstellationViewport,
  zoomConstellationViewportAt,
} from './viewport.ts';

const viewport = { height: 600, width: 1000 };

test('Constellation zoom stays inside the supported range and resets to fit', () => {
  assert.equal(clampConstellationZoom(0.1), CONSTELLATION_MIN_ZOOM);
  assert.equal(clampConstellationZoom(4), CONSTELLATION_MAX_ZOOM);
  assert.deepEqual(fitConstellationViewport(), {
    scale: CONSTELLATION_FIT_ZOOM,
    x: 0,
    y: 0,
  });
});

test('cursor-centered zoom preserves the focal graph point', () => {
  const focalPoint = { x: 750, y: 150 };
  const next = zoomConstellationViewportAt(
    { scale: 1, x: 0, y: 0 },
    2,
    focalPoint,
    viewport,
  );

  assert.deepEqual(next, { scale: 2, x: -250, y: 150 });
});

test('pan and zoom translations remain bounded at render-budget scale', () => {
  const panned = panConstellationViewport(
    { scale: CONSTELLATION_MAX_ZOOM, x: 0, y: 0 },
    { x: 10_000, y: -10_000 },
    viewport,
  );
  assert.deepEqual(panned, {
    scale: CONSTELLATION_MAX_ZOOM,
    x: 870,
    y: -522,
  });

  assert.deepEqual(
    clampConstellationTranslation(
      { x: 500, y: -500 },
      CONSTELLATION_FIT_ZOOM,
      viewport,
    ),
    { x: 120, y: -72 },
  );
});
