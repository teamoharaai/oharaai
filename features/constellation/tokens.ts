import type {
  ConstellationBrtCategory,
  ConstellationEarnedNodeKind,
  GraphEdgeKind,
  GraphEdgeValence,
} from './types.ts';

export const CONSTELLATION_RENDER_BUDGET = 30;
export const CONSTELLATION_EDGE_PER_NODE_BUDGET = 6;
export const CONSTELLATION_EDGE_RENDER_BUDGET = Math.floor(
  (CONSTELLATION_RENDER_BUDGET * CONSTELLATION_EDGE_PER_NODE_BUDGET) / 2,
);

export const CONSTELLATION_EARNED_NODE_KINDS = [
  'season',
  'ambition',
  'goal',
  'reflection',
  'trait',
  'tension',
] as const satisfies readonly ConstellationEarnedNodeKind[];

export const CONSTELLATION_EDGE_KINDS = [
  'season_membership',
  'ambition_goal',
  'goal_pattern',
  'pattern_cooccurrence',
  'trait_derivation',
  'tension_composition',
  'annotation_anchor',
  'goal_evidence_cluster',
] as const satisfies readonly GraphEdgeKind[];

export const CONSTELLATION_EDGE_VALENCES = [
  'positive',
  'negative',
  'neutral',
  'mixed',
  'contradictory',
] as const satisfies readonly GraphEdgeValence[];

export function brtDisplayLabel(category: ConstellationBrtCategory): 'Bud' | 'Rose' | 'Thorn' {
  switch (category) {
    case 'bud':
      return 'Bud';
    case 'rose':
      return 'Rose';
    case 'thorn':
      return 'Thorn';
  }
}
