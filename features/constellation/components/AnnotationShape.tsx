import {
  Circle,
  Line,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import type { ConstellationNodeLayout } from '../layout.ts';
import type { ConstellationAnnotationDTO } from '../types.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';
import { InteractiveSvgGroup } from './InteractiveSvgGroup';

interface AnnotationShapeProps {
  layout: ConstellationNodeLayout;
  node: ConstellationAnnotationDTO;
  onSelect: (selectionKey: string) => void;
  tokens: ConstellationVisualTokens;
}

export function AnnotationShape({
  layout,
  node,
  onSelect,
  tokens,
}: AnnotationShapeProps) {
  const handlePress = () => onSelect(node.selectionKey);
  const { x, y } = layout.center;
  const visibleLabel = node.label.length > 26
    ? `${node.label.slice(0, 25)}…`
    : node.label;

  if (node.kind === 'projection') {
    return (
      <InteractiveSvgGroup
        onActivate={handlePress}
        selectionKey={node.selectionKey}
      >
        <Circle cx={x} cy={y} fill="transparent" r={Math.max(28, layout.boundaryRadius)} />
        <Circle
          cx={x}
          cy={y}
          fill={tokens.annotation.fill}
          fillOpacity={0.82}
          r={layout.width / 2}
          stroke={tokens.annotation.stroke}
          strokeDasharray="8 6"
          strokeWidth={2}
        />
        <Line
          x1={x - 10}
          x2={x + 10}
          y1={y}
          y2={y}
          stroke={tokens.annotation.stroke}
          strokeWidth={1.5}
        />
        <Line
          x1={x}
          x2={x}
          y1={y - 10}
          y2={y + 10}
          stroke={tokens.annotation.stroke}
          strokeWidth={1.5}
        />
        <SvgText
          fill={tokens.annotation.badgeText}
          fontFamily="Inter-SemiBold"
          fontSize={9}
          letterSpacing={1.1}
          textAnchor="middle"
          x={x}
          y={y - 19}
        >
          USER PROJECTION
        </SvgText>
        <SvgText
          fill={tokens.annotation.badgeText}
          fontFamily="Inter-Italic"
          fontSize={13}
          textAnchor="middle"
          x={x}
          y={y + layout.height / 2 + 19}
        >
          {visibleLabel}
        </SvgText>
        <SvgText
          fill={tokens.annotation.badgeText}
          fontFamily="Inter-SemiBold"
          fontSize={9}
          letterSpacing={1.2}
          textAnchor="middle"
          x={x}
          y={y + layout.height / 2 + 34}
        >
          DRAFT
        </SvgText>
      </InteractiveSvgGroup>
    );
  }

  return (
    <InteractiveSvgGroup
      onActivate={handlePress}
      selectionKey={node.selectionKey}
    >
      <Circle cx={x} cy={y} fill="transparent" r={Math.max(28, layout.boundaryRadius)} />
      <Rect
        fill={tokens.annotation.fill}
        fillOpacity={0.9}
        height={layout.height}
        rx={10}
        stroke={tokens.annotation.stroke}
        strokeDasharray="7 5"
        strokeWidth={1.8}
        width={layout.width}
        x={x - layout.width / 2}
        y={y - layout.height / 2}
      />
      <SvgText
        fill={tokens.annotation.badgeText}
        fontFamily="Inter-SemiBold"
        fontSize={9}
        letterSpacing={1.2}
        x={x - layout.width / 2 + 13}
        y={y - 9}
      >
        USER DRAFT NOTE
      </SvgText>
      <SvgText
        fill={tokens.text.primary}
        fontFamily="Inter-Medium"
        fontSize={12}
        x={x - layout.width / 2 + 13}
        y={y + 13}
      >
        {visibleLabel}
      </SvgText>
    </InteractiveSvgGroup>
  );
}
