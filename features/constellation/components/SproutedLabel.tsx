import {
  Circle,
  Line,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import type { SproutedLabelLayout } from '../layout.ts';
import type { ConstellationEarnedNodeDTO } from '../types.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';

interface SproutedLabelProps {
  layout: SproutedLabelLayout;
  node: ConstellationEarnedNodeDTO;
  tokens: ConstellationVisualTokens;
}

export function SproutedLabel({ layout, node, tokens }: SproutedLabelProps) {
  const detail = node.kind === 'goal' && node.source.type === 'goal'
    ? `GOAL · ${node.source.goalStatus.toUpperCase()}`
    : node.kind.toUpperCase();

  return (
    <>
      <Line
        x1={layout.lineStart.x}
        x2={layout.lineEnd.x}
        y1={layout.lineStart.y}
        y2={layout.lineEnd.y}
        stroke={tokens.node.selection}
        strokeWidth={1.5}
      />
      <Circle
        cx={layout.lineStart.x}
        cy={layout.lineStart.y}
        fill={tokens.node.selection}
        r={3}
      />
      <Rect
        fill={tokens.panel.background}
        height={layout.box.height}
        rx={12}
        stroke={tokens.panel.border}
        strokeWidth={1}
        width={layout.box.width}
        x={layout.box.x}
        y={layout.box.y}
      />
      <SvgText
        fill={tokens.text.muted}
        fontFamily="Inter-SemiBold"
        fontSize={10}
        letterSpacing={1.3}
        x={layout.box.x + 18}
        y={layout.box.y + 23}
      >
        {detail}
      </SvgText>
      <SvgText
        fill={tokens.text.primary}
        fontFamily="Inter-SemiBold"
        fontSize={16}
        x={layout.box.x + 18}
        y={layout.box.y + 48}
      >
        {node.label}
      </SvgText>
    </>
  );
}
