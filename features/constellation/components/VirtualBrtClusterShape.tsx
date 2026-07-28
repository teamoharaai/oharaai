import {
  Circle,
  G,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { Platform } from 'react-native';
import type { ConstellationNodeLayout } from '../layout.ts';
import type { ConstellationVirtualBrtClusterDTO } from '../types.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';
import { constellationNodeFocusId } from './ConstellationInspectorSurface';

interface VirtualBrtClusterShapeProps {
  layout: ConstellationNodeLayout;
  node: ConstellationVirtualBrtClusterDTO;
  onFocus: (selectionKey: string | null) => void;
  onSelect: (selectionKey: string) => void;
  tokens: ConstellationVisualTokens;
}

export function VirtualBrtClusterShape({
  layout,
  node,
  onFocus,
  onSelect,
  tokens,
}: VirtualBrtClusterShapeProps) {
  const color = tokens.brt[node.brtCategory];
  const { x, y } = layout.center;

  return (
    <G
      accessible
      accessibilityHint="Press Enter to open the goal-specific evidence list."
      accessibilityLabel={`Virtual ${node.label} evidence cluster with ${node.evidenceLinkCount} references`}
      accessibilityRole="button"
      nativeID={constellationNodeFocusId(node.selectionKey)}
      onBlur={() => onFocus(null)}
      onFocus={() => onFocus(node.selectionKey)}
      onPress={() => onSelect(node.selectionKey)}
      {...(Platform.OS === 'web' ? {
        focusable: true,
        onKeyDown: (event: { key?: string; preventDefault?: () => void }) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault?.();
            onSelect(node.selectionKey);
          }
        },
        tabIndex: 0,
      } : {})}
    >
      <Rect
        fill="transparent"
        height={Math.max(52, layout.height)}
        rx={26}
        width={layout.width + 12}
        x={x - (layout.width + 12) / 2}
        y={y - Math.max(52, layout.height) / 2}
      />
      <Rect
        fill={tokens.panel.background}
        fillOpacity={0.92}
        height={layout.height}
        rx={layout.height / 2}
        stroke={color}
        strokeDasharray="3 4"
        strokeWidth={1.4}
        width={layout.width}
        x={x - layout.width / 2}
        y={y - layout.height / 2}
      />
      <Circle cx={x - layout.width / 2 + 18} cy={y} fill={color} r={6} />
      <SvgText
        fill={tokens.text.primary}
        fontFamily="Inter-SemiBold"
        fontSize={11}
        x={x - layout.width / 2 + 31}
        y={y - 1}
      >
        {node.label.length > 18 ? `${node.label.slice(0, 17)}…` : node.label}
      </SvgText>
      <SvgText
        fill={tokens.text.muted}
        fontFamily="Inter-Regular"
        fontSize={9}
        x={x - layout.width / 2 + 31}
        y={y + 12}
      >
        {`${node.evidenceLinkCount} ${node.evidenceLinkCount === 1 ? 'reference' : 'references'}`}
      </SvgText>
    </G>
  );
}
