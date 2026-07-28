/**
 * Constellation needs room for both a meaningful canvas and an inspector.
 * These breakpoints account for the app rail: a collapsed rail permits the
 * two-column treatment at a smaller viewport, while tablet widths promote the
 * inspector to the full-width replacement surface.
 */
export function getConstellationResponsiveLayout(
  width: number,
  sidebarCollapsed: boolean,
): {
  compact: boolean;
  narrow: boolean;
} {
  const narrowBreakpoint = sidebarCollapsed ? 880 : 1_040;
  const compactBreakpoint = sidebarCollapsed ? 1_080 : 1_280;

  return {
    compact: width < compactBreakpoint,
    narrow: width < narrowBreakpoint,
  };
}
