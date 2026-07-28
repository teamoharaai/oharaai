import { Path } from 'react-native-svg';
import type { ConstellationEdgeLayout } from '../layout.ts';
import type { ConstellationGraphViewNode } from '../types.ts';
import type {
  ConstellationVisualTokens,
  EdgeVisualToken,
} from '../visual-tokens.ts';

interface ConstellationEdgeProps {
  edge: ConstellationEdgeLayout;
  gradientId: string;
  nodes: readonly ConstellationGraphViewNode[];
  tokens: ConstellationVisualTokens;
}

function styleForEdge(
  edge: ConstellationEdgeLayout,
  nodes: readonly ConstellationGraphViewNode[],
  tokens: ConstellationVisualTokens,
): EdgeVisualToken {
  if (edge.edge.kind === 'annotation_anchor') {
    return tokens.edge.annotation;
  }

  if (edge.edge.kind === 'goal_evidence_cluster') {
    const cluster = nodes.find(
      (node) => node.entityType === 'virtual_brt_cluster' && node.id === edge.edge.to.id,
    );
    if (cluster?.entityType === 'virtual_brt_cluster') {
      return {
        ...tokens.edge.evidence,
        color: tokens.brt[cluster.node.brtCategory],
      };
    }
    return tokens.edge.evidence;
  }

  if (edge.edge.valence) {
    return tokens.edge[edge.edge.valence];
  }

  return tokens.edge.structural;
}

export function ConstellationEdge({
  edge,
  gradientId,
  nodes,
  tokens,
}: ConstellationEdgeProps) {
  const style = styleForEdge(edge, nodes, tokens);
  const weight = edge.edge.weight ?? 1;
  const strokeWidth = Math.min(3.2, 1.1 + weight * 0.12);

  return (
    <Path
      d={edge.path}
      fill="none"
      opacity={style.opacity}
      stroke={edge.edge.valence === 'mixed' ? `url(#${gradientId})` : style.color}
      strokeDasharray={style.dash}
      strokeLinecap="round"
      strokeWidth={strokeWidth}
    />
  );
}
