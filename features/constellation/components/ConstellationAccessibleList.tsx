import { Pressable, Text, View, type ViewStyle } from 'react-native';
import type {
  ConstellationGraphViewModel,
  ConstellationGraphViewNode,
} from '../types.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';

interface ConstellationAccessibleListProps {
  graph: ConstellationGraphViewModel;
  hiddenVisually?: boolean;
  onSelect: (selectionKey: string) => void;
  selectedKey: string | null;
  tokens: ConstellationVisualTokens;
}

function nodeDescription(node: ConstellationGraphViewNode): string {
  switch (node.entityType) {
    case 'earned_node':
      return `Earned ${node.node.kind}: ${node.node.label}`;
    case 'annotation':
      return `User-authored ${node.node.kind === 'projection' ? 'Projection' : 'Note'} draft: ${node.node.label}`;
    case 'virtual_brt_cluster':
      return `${node.node.label} goal evidence summary, ${node.node.evidenceLinkCount} ${node.node.evidenceLinkCount === 1 ? 'reference' : 'references'}`;
  }
}

export function ConstellationAccessibleList({
  graph,
  hiddenVisually = false,
  onSelect,
  selectedKey,
  tokens,
}: ConstellationAccessibleListProps) {
  const hiddenStyle: ViewStyle | undefined = hiddenVisually
    ? {
        height: 1,
        left: -10000,
        overflow: 'hidden',
        position: 'absolute',
        width: 1,
      }
    : undefined;

  return (
    <View
      accessibilityLabel={`Constellation with ${graph.counts.earnedNodes.total} earned nodes and ${graph.counts.edges} connections`}
      style={[{ gap: 12, padding: hiddenVisually ? 0 : 20 }, hiddenStyle]}
    >
      {!hiddenVisually ? (
        <View style={{ gap: 4 }}>
          <Text
            accessibilityRole="header"
            style={{ color: tokens.text.primary, fontFamily: 'Inter-SemiBold', fontSize: 20 }}
          >
            Constellation list
          </Text>
          <Text style={{ color: tokens.text.secondary, fontFamily: 'Inter-Regular', fontSize: 13 }}>
            Native and screen-reader representation of the static graph.
          </Text>
        </View>
      ) : null}
      {graph.nodes.map((node) => {
        const selected = node.selectionKey === selectedKey;
        return (
          <Pressable
            accessibilityLabel={nodeDescription(node)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={`${node.entityType}:${node.selectionKey}`}
            onPress={() => onSelect(node.selectionKey)}
            style={{
              borderColor: selected ? tokens.node.selection : tokens.panel.border,
              borderRadius: 10,
              borderWidth: 1,
              padding: hiddenVisually ? 0 : 12,
            }}
          >
            <Text
              style={{
                color: tokens.text.primary,
                fontFamily: 'Inter-Medium',
                fontSize: hiddenVisually ? 1 : 14,
              }}
            >
              {nodeDescription(node)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
