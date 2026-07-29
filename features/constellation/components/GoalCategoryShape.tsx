import { getCategoryAccentTheme } from '@/constants/themes';
import {
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import type { ConstellationNodeLayout } from '../layout.ts';
import type { ConstellationGoalCategoryNodeDTO } from '../types.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';
import { InteractiveSvgGroup } from './InteractiveSvgGroup';

interface GoalCategoryShapeProps {
  layout: ConstellationNodeLayout;
  node: ConstellationGoalCategoryNodeDTO;
  onSelect: (selectionKey: string) => void;
  tokens: ConstellationVisualTokens;
}

export function GoalCategoryShape({
  layout,
  node,
  onSelect,
  tokens,
}: GoalCategoryShapeProps) {
  const accent = getCategoryAccentTheme(node.category);
  const { x, y } = layout.center;

  return (
    <InteractiveSvgGroup
      onActivate={() => onSelect(node.selectionKey)}
      selectionKey={node.selectionKey}
    >
      <Circle
        cx={x}
        cy={y}
        fill="transparent"
        r={Math.max(28, layout.boundaryRadius)}
      />
      <Circle
        cx={x}
        cy={y}
        fill={tokens.appearance === 'dark' ? tokens.panel.background : accent.tint}
        r={layout.width / 2}
        stroke={accent.color}
        strokeWidth={1.8}
      />
      <SvgText
        fill={accent.mid}
        fontFamily="Inter-SemiBold"
        fontSize={20}
        textAnchor="middle"
        x={x}
        y={y + 7}
      >
        {node.symbol}
      </SvgText>
      <SvgText
        fill={tokens.text.secondary}
        fontFamily="Inter-SemiBold"
        fontSize={11}
        textAnchor="middle"
        x={x}
        y={y + layout.height / 2 + 17}
      >
        {node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label}
      </SvgText>
    </InteractiveSvgGroup>
  );
}
