import { Circle } from 'react-native-svg';
import type { ConstellationNodeLayout } from '../layout.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';

interface SelectionRingProps {
  node: ConstellationNodeLayout;
  tokens: ConstellationVisualTokens;
}

export function SelectionRing({ node, tokens }: SelectionRingProps) {
  return (
    <>
      <Circle
        cx={node.center.x}
        cy={node.center.y}
        fill="none"
        opacity={0.68}
        r={node.boundaryRadius + 10}
        stroke={tokens.node.selection}
        strokeWidth={2}
      />
      <Circle
        cx={node.center.x}
        cy={node.center.y}
        fill="none"
        opacity={0.24}
        r={node.boundaryRadius + 20}
        stroke={tokens.node.selection}
        strokeWidth={1.4}
      />
    </>
  );
}
