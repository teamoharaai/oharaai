/**
 * Historical Phase 1 calculation retained only to reproduce snapshots written
 * with algorithm_version = momentum-v1.0. Production V1 calculation paths must
 * use goal-momentum-v1.0 and ohara-momentum-v1.0 from engine.ts.
 */
export const LEGACY_PHASE1_CONFIG = Object.freeze({
  version: 'momentum-v1.0',
  pillarWeights: {
    consistency: 0.35,
    progress: 0.30,
    reflection: 0.15,
    initiative: 0.10,
    resilience: 0.10,
  },
  gainDivisor: 20,
  difficultyScale: 100,
  weeklyDragRate: 0.005,
});

export function calculateLegacyPhase1Momentum(
  currentMomentum: number,
  growthQualityScore: number,
): { nextMomentum: number; weeklyDrag: number; weeklyGain: number } {
  const difficulty = 1 + currentMomentum / LEGACY_PHASE1_CONFIG.difficultyScale;
  const weeklyGain = growthQualityScore / (LEGACY_PHASE1_CONFIG.gainDivisor * difficulty);
  const weeklyDrag = currentMomentum * LEGACY_PHASE1_CONFIG.weeklyDragRate;
  return {
    nextMomentum: Math.max(0, currentMomentum + weeklyGain - weeklyDrag),
    weeklyDrag,
    weeklyGain,
  };
}
