import {
  Circle,
  G,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import type { ConstellationNodeLayout } from '../layout.ts';
import type { ConstellationEarnedNodeDTO } from '../types.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';

interface EarnedNodeShapeProps {
  layout: ConstellationNodeLayout;
  node: ConstellationEarnedNodeDTO;
  onSelect: (selectionKey: string) => void;
  tokens: ConstellationVisualTokens;
}

function hexagonPoints(cx: number, cy: number, radius: number): string {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index;
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  }).join(' ');
}

function goalPoints(cx: number, cy: number, radius: number): string {
  return [
    `${cx},${cy - radius}`,
    `${cx + radius},${cy}`,
    `${cx},${cy + radius}`,
    `${cx - radius},${cy}`,
  ].join(' ');
}

function NodeLabel({
  fill,
  layout,
  label,
  offset = 0,
}: {
  fill: string;
  layout: ConstellationNodeLayout;
  label: string;
  offset?: number;
}) {
  return (
    <SvgText
      fill={fill}
      fontFamily="Inter-Regular"
      fontSize={13}
      textAnchor="middle"
      x={layout.center.x}
      y={layout.center.y + layout.height / 2 + 20 + offset}
    >
      {label}
    </SvgText>
  );
}

export function EarnedNodeShape({
  layout,
  node,
  onSelect,
  tokens,
}: EarnedNodeShapeProps) {
  const handlePress = () => onSelect(node.selectionKey);
  const { x, y } = layout.center;

  switch (node.kind) {
    case 'season':
      return (
        <G onPress={handlePress}>
          <Circle
            cx={x}
            cy={y}
            fill={tokens.node.seasonFill}
            r={layout.width / 2}
            stroke={tokens.node.seasonStroke}
            strokeWidth={tokens.appearance === 'dark' ? 2 : 0}
          />
          <SvgText
            fill={tokens.text.inverse}
            fontFamily="Inter-SemiBold"
            fontSize={14}
            letterSpacing={1.7}
            textAnchor="middle"
            x={x}
            y={y - 3}
          >
            {node.label.toUpperCase()}
          </SvgText>
          <SvgText
            fill={tokens.text.muted}
            fontFamily="Inter-Regular"
            fontSize={12}
            textAnchor="middle"
            x={x}
            y={y + 20}
          >
            {node.description ?? 'CURRENT'}
          </SvgText>
        </G>
      );
    case 'ambition':
      return (
        <G onPress={handlePress}>
          <Rect
            fill={tokens.node.ambitionFill}
            height={layout.height}
            rx={layout.height / 2}
            stroke={tokens.node.ambitionStroke}
            strokeWidth={tokens.appearance === 'dark' ? 1.4 : 0}
            width={layout.width}
            x={x - layout.width / 2}
            y={y - layout.height / 2}
          />
          <SvgText
            fill={tokens.appearance === 'dark' ? tokens.text.primary : tokens.text.inverse}
            fontFamily="Inter-SemiBold"
            fontSize={14}
            textAnchor="middle"
            x={x}
            y={y + 5}
          >
            {node.label}
          </SvgText>
        </G>
      );
    case 'goal':
      return (
        <G onPress={handlePress}>
          <Polygon
            fill={tokens.node.goalFill}
            points={goalPoints(x, y, layout.width / 2)}
            stroke={tokens.node.goalStroke}
            strokeWidth={2}
          />
          <NodeLabel fill={tokens.text.secondary} label={node.label} layout={layout} />
        </G>
      );
    case 'reflection':
      return (
        <G onPress={handlePress}>
          <Circle
            cx={x}
            cy={y}
            fill={tokens.node.reflectionFill}
            r={layout.width / 2}
            stroke={tokens.node.reflectionStroke}
            strokeWidth={1.8}
          />
          <Circle
            cx={x}
            cy={y}
            fill={tokens.node.reflectionStroke}
            opacity={0.84}
            r={5}
          />
          <NodeLabel fill={tokens.text.secondary} label={node.label} layout={layout} offset={-1} />
        </G>
      );
    case 'trait':
      return (
        <G onPress={handlePress}>
          <Polygon
            fill={tokens.node.traitFill}
            points={hexagonPoints(x, y, layout.width / 2)}
            stroke={tokens.node.traitStroke}
            strokeWidth={1.4}
          />
          <NodeLabel fill={tokens.text.accent} label={node.label} layout={layout} />
        </G>
      );
    case 'tension':
      return (
        <G onPress={handlePress}>
          <Circle
            cx={x - 12}
            cy={y}
            fill="none"
            r={18}
            stroke={tokens.node.tensionStroke}
            strokeWidth={2}
          />
          <Circle
            cx={x + 12}
            cy={y}
            fill="none"
            r={18}
            stroke={tokens.node.tensionStroke}
            strokeWidth={2}
          />
          <NodeLabel fill={tokens.node.tensionStroke} label={node.label} layout={layout} />
        </G>
      );
  }
}
