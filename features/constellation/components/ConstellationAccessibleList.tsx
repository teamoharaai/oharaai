import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { useState } from 'react';
import type {
  ConstellationGraphViewModel,
  ConstellationGraphViewNode,
} from '../types.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';
import { constellationNodeFocusId } from './ConstellationInspectorSurface';

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

function edgeDescription(
  edge: ConstellationGraphViewModel['edges'][number],
  nodes: readonly ConstellationGraphViewNode[],
): string {
  const from = nodes.find((node) => node.id === edge.from.id);
  const to = nodes.find((node) => node.id === edge.to.id);
  const fromLabel = from ? nodeDescription(from) : 'Unavailable source';
  const toLabel = to ? nodeDescription(to) : 'Unavailable destination';
  const relationship = edge.kind.replaceAll('_', ' ');
  const valence = edge.valence ? `, ${edge.valence} valence` : '';
  return `${fromLabel} connects to ${toLabel}: ${relationship}${valence}.`;
}

export function ConstellationAccessibleList({
  graph,
  hiddenVisually = false,
  onSelect,
  selectedKey,
  tokens,
}: ConstellationAccessibleListProps) {
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
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
            nativeID={constellationNodeFocusId(node.selectionKey)}
            onBlur={() => setFocusedKey(null)}
            onFocus={() => setFocusedKey(node.selectionKey)}
            onPress={() => onSelect(node.selectionKey)}
            style={{
              borderColor: selected || focusedKey === node.selectionKey
                ? tokens.node.selection
                : tokens.panel.border,
              borderRadius: 10,
              borderWidth: selected || focusedKey === node.selectionKey ? 2 : 1,
              padding: hiddenVisually ? 0 : 12,
            }}
          >
            <Text
              style={{
                color: tokens.text.primary,
                fontFamily: 'Inter-Medium',
                fontSize: 14,
              }}
            >
              {nodeDescription(node)}
            </Text>
          </Pressable>
        );
      })}
      <View accessibilityLabel={`${graph.edges.length} graph connection summaries`} style={{ gap: 6 }}>
        <Text
          accessibilityRole="header"
          style={{ color: tokens.text.primary, fontFamily: 'Inter-SemiBold', fontSize: hiddenVisually ? 1 : 14 }}
        >
          Connections
        </Text>
        {graph.edges.map((edge) => (
          <Text
            key={edge.id}
            style={{ color: tokens.text.secondary, fontFamily: 'Inter-Regular', fontSize: hiddenVisually ? 1 : 13 }}
          >
            {edgeDescription(edge, graph.nodes)}
          </Text>
        ))}
      </View>
    </View>
  );
}
