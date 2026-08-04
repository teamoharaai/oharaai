import type { MomentumConfig } from './types.ts';

export const MOMENTUM_CONFIG_V1: MomentumConfig = Object.freeze({
  version: 'momentum-v1.0',
  pillarWeights: {
    consistency: 0.35,
    progress: 0.3,
    reflection: 0.15,
    initiative: 0.1,
    resilience: 0.1,
  },
  gainDivisor: 20,
  difficultyScale: 100,
  weeklyDragRate: 0.005,
  reflectionWeeklyLimit: 5,
  initiativeUnitCap: 3,
  resilienceNeutralScore: 50,
  minimumEligibleEvents: 1,
});
