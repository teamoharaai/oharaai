// Goal-activity intensity math — pure, shared by every activity render
// (design/001 Part B "Render contract"). Maps a day's event `count` onto a
// discrete GitHub-style intensity level, scaled against the busiest day in the
// visible period. No DB, no timezone work, no React. The calendar-aligned
// reshaping (current week / current month grids) lives in calendar-activity.ts.
//
// D-004: reached by a node test → relative paths + `import type` only.

/** Number of discrete non-empty intensity levels (GitHub uses 4). */
export const HEATMAP_INTENSITY_LEVELS = 4;

/**
 * Discrete intensity level for one day: 0 (empty) or 1..HEATMAP_INTENSITY_LEVELS.
 * Buckets the `count` proportionally against the period's `maxCount` so the
 * ramp adapts to how active the goal is (GitHub-style). A positive count is
 * never level 0.
 */
export function heatmapIntensityLevel(count: number, maxCount: number): number {
  if (count <= 0) return 0;
  if (maxCount <= 1) return HEATMAP_INTENSITY_LEVELS;
  const scaled = Math.ceil((count / maxCount) * HEATMAP_INTENSITY_LEVELS);
  return Math.min(HEATMAP_INTENSITY_LEVELS, Math.max(1, scaled));
}
