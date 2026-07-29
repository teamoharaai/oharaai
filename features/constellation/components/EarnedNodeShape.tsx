import {
  Circle,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import type { ConstellationNodeLayout } from '../layout.ts';
import type { ConstellationEarnedNodeDTO } from '../types.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';
import { InteractiveSvgGroup } from './InteractiveSvgGroup';

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
  const visibleLabel = label.length > 28 ? `${label.slice(0, 27)}…` : label;
  return (
    <SvgText
      fill={fill}
      fontFamily="Inter-Regular"
      fontSize={13}
      textAnchor="middle"
      x={layout.center.x}
      y={layout.center.y + layout.height / 2 + 20 + offset}
    >
      {visibleLabel}
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
        <InteractiveSvgGroup onActivate={handlePress} selectionKey={node.selectionKey}>
          <Circle cx={x} cy={y} fill="transparent" r={Math.max(28, layout.boundaryRadius)} />
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
            fontSize={12}
            letterSpacing={1.4}
            textAnchor="middle"
            x={x}
            y={y - 6}
          >
            CURRENT
          </SvgText>
          <SvgText
            fill={tokens.text.inverse}
            fontFamily="Inter-SemiBold"
            fontSize={12}
            letterSpacing={1.4}
            textAnchor="middle"
            x={x}
            y={y + 12}
          >
            SEASON
          </SvgText>
        </InteractiveSvgGroup>
      );
    case 'ambition':
      return (
        <InteractiveSvgGroup onActivate={handlePress} selectionKey={node.selectionKey}>
          <Circle cx={x} cy={y} fill="transparent" r={Math.max(28, layout.boundaryRadius)} />
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
            {node.label.length > 24 ? `${node.label.slice(0, 23)}…` : node.label}
          </SvgText>
        </InteractiveSvgGroup>
      );
    case 'goal':
      return (
        <InteractiveSvgGroup onActivate={handlePress} selectionKey={node.selectionKey}>
          <Circle cx={x} cy={y} fill="transparent" r={Math.max(28, layout.boundaryRadius)} />
          <Circle
            cx={x}
            cy={y}
            fill={tokens.node.goalFill}
            r={layout.width / 2}
            stroke={tokens.node.goalStroke}
            strokeWidth={2}
          />
          <Circle
            cx={x - layout.width * 0.12}
            cy={y - layout.height * 0.1}
            fill={tokens.node.goalStroke}
            opacity={0.16}
            r={layout.width * 0.2}
          />
          <NodeLabel fill={tokens.text.secondary} label={node.label} layout={layout} />
        </InteractiveSvgGroup>
      );
    case 'reflection':
      return (
        <InteractiveSvgGroup onActivate={handlePress} selectionKey={node.selectionKey}>
          <Circle cx={x} cy={y} fill="transparent" r={Math.max(28, layout.boundaryRadius)} />
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
        </InteractiveSvgGroup>
      );
    case 'trait':
      return (
        <InteractiveSvgGroup onActivate={handlePress} selectionKey={node.selectionKey}>
          <Circle cx={x} cy={y} fill="transparent" r={Math.max(28, layout.boundaryRadius)} />
          <Polygon
            fill={tokens.node.traitFill}
            points={hexagonPoints(x, y, layout.width / 2)}
            stroke={tokens.node.traitStroke}
            strokeWidth={1.4}
          />
          <NodeLabel fill={tokens.text.accent} label={node.label} layout={layout} />
        </InteractiveSvgGroup>
      );
    case 'tension':
      return (
        <InteractiveSvgGroup onActivate={handlePress} selectionKey={node.selectionKey}>
          <Circle cx={x} cy={y} fill="transparent" r={Math.max(28, layout.boundaryRadius)} />
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
        </InteractiveSvgGroup>
      );
  }
}
