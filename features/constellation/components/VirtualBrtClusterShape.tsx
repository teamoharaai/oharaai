import {
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import type { ConstellationNodeLayout } from '../layout.ts';
import type { ConstellationVirtualBrtClusterDTO } from '../types.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';
import { InteractiveSvgGroup } from './InteractiveSvgGroup';

interface VirtualBrtClusterShapeProps {
  layout: ConstellationNodeLayout;
  node: ConstellationVirtualBrtClusterDTO;
  onSelect: (selectionKey: string) => void;
  tokens: ConstellationVisualTokens;
}

export function VirtualBrtClusterShape({
  layout,
  node,
  onSelect,
  tokens,
}: VirtualBrtClusterShapeProps) {
  const color = tokens.brt[node.brtCategory];
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
        fill={tokens.panel.background}
        fillOpacity={0.92}
        r={layout.width / 2}
        stroke={color}
        strokeWidth={1.6}
      />
      <SvgText
        fill={color}
        fontFamily="Inter-SemiBold"
        fontSize={13}
        textAnchor="middle"
        x={x}
        y={y + 5}
      >
        {node.brtCategory.slice(0, 1).toUpperCase()}
      </SvgText>
      <Circle
        cx={x + layout.width * 0.42}
        cy={y - layout.height * 0.42}
        fill={color}
        r={8}
        stroke={tokens.panel.background}
        strokeWidth={1.5}
      />
      <SvgText
        fill={tokens.text.inverse}
        fontFamily="Inter-SemiBold"
        fontSize={8}
        textAnchor="middle"
        x={x + layout.width * 0.42}
        y={y - layout.height * 0.42 + 3}
      >
        {node.entryCount > 99 ? '99+' : String(node.entryCount)}
      </SvgText>
      <SvgText
        fill={tokens.text.secondary}
        fontFamily="Inter-Regular"
        fontSize={10}
        textAnchor="middle"
        x={x}
        y={y + layout.height / 2 + 15}
      >
        {node.label}
      </SvgText>
    </InteractiveSvgGroup>
  );
}
