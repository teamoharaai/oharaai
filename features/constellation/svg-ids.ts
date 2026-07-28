export interface ConstellationGradientIds {
  ambient: string;
  grain: string;
  mixedEdge: string;
  budHalo: string;
  roseHalo: string;
  thornHalo: string;
  tealHalo: string;
}

/** Produces an SSR-safe SVG paint-server namespace for one mounted canvas. */
export function createConstellationGradientIds(
  instanceId: string,
): ConstellationGradientIds {
  const namespace = instanceId.replace(/[^a-zA-Z0-9_-]/g, '') || 'graph';
  const id = (name: string) => `constellation-${namespace}-${name}`;
  return {
    ambient: id('ambient'),
    grain: id('grain'),
    mixedEdge: id('edge-mixed'),
    budHalo: id('halo-bud'),
    roseHalo: id('halo-rose'),
    thornHalo: id('halo-thorn'),
    tealHalo: id('halo-teal'),
  };
}
