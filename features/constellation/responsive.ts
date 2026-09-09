/**
 * Constellation needs room for both a meaningful canvas and an inspector.
 * The global application navigation sits above the workspace, so the full
 * viewport width is available to the canvas and inspector at every size.
 */
export function getConstellationResponsiveLayout(
  width: number,
): {
  compact: boolean;
  narrow: boolean;
} {
  return {
    compact: width < 1_080,
    narrow: width < 880,
  };
}
