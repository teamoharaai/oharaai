import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import type {
  ConstellationEarnedNodeDTO,
  ConstellationGraphViewNode,
} from '../types';
import { ConstellationInspectorSurface } from './ConstellationInspectorSurface';

interface ConstellationGenericInspectorProps {
  neighbors: readonly ConstellationGraphViewNode[];
  node: ConstellationEarnedNodeDTO;
  onClose: () => void;
  onSelect: (selectionKey: string) => void;
}

function formattedDate(value: string | null): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Not available';
}

function neighborDescription(node: ConstellationGraphViewNode): string {
  switch (node.entityType) {
    case 'earned_node':
      return `Earned ${node.node.kind}`;
    case 'annotation':
      return `User ${node.node.kind} · Draft`;
    case 'virtual_brt_cluster':
      return `Virtual ${node.node.label} cluster`;
    case 'virtual_goal_category':
      return `Goal category · ${node.node.label}`;
  }
}

export function ConstellationGenericInspector({
  neighbors,
  node,
  onClose,
  onSelect,
}: ConstellationGenericInspectorProps) {
  const colors = useThemeColors();
  const displayLabel = node.kind === 'season' ? 'Current Season' : node.label;

  return (
    <ConstellationInspectorSurface
      accessibilityLabel={`${node.kind} inspector for ${displayLabel}`}
      onClose={onClose}
      selectionKey={node.selectionKey}
    >
      <View style={{ gap: 7 }}>
        <Typography
          variant="section-eyebrow"
          style={{ color: colors.text.accent }}
        >
          {`EARNED ${node.kind.toUpperCase()} · READ ONLY`}
        </Typography>
        <Typography accessibilityRole="header" numberOfLines={3} variant="heading">
          {displayLabel}
        </Typography>
        <Typography numberOfLines={5} variant="description">
          {node.description ?? `This ${node.kind} is part of your live Constellation.`}
        </Typography>
      </View>

      <View style={{ gap: 8 }}>
        <Typography variant="section-eyebrow">Live details</Typography>
        {[
          ['First seen', formattedDate(node.firstSeenAt)],
          ['Last activity', formattedDate(node.lastActivityAt)],
          [
            'Visibility',
            node.visibilityScore === null
              ? 'System anchored'
              : node.visibilityScore.toFixed(1),
          ],
        ].map(([label, value]) => (
          <View
            key={label}
            style={{
              alignItems: 'center',
              borderBottomColor: colors.border.divider,
              borderBottomWidth: 1,
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 10,
            }}
          >
            <Typography variant="caption">{label}</Typography>
            <Typography variant="label">{value}</Typography>
          </View>
        ))}
      </View>

      <View style={{ gap: 9 }}>
        <Typography variant="section-eyebrow">
          {`Connected neighborhood · ${neighbors.length}`}
        </Typography>
        {neighbors.length === 0 ? (
          <Typography variant="description">
            No visible connections are currently attached to this node.
          </Typography>
        ) : neighbors.map((neighbor) => (
          <Pressable
            accessibilityLabel={`Focus ${neighborDescription(neighbor)} ${neighbor.node.label}`}
            accessibilityRole="button"
            key={`${neighbor.entityType}:${neighbor.id}`}
            onPress={() => onSelect(neighbor.selectionKey)}
            style={({ pressed }) => ({
              backgroundColor: colors.background.subtle,
              borderColor: colors.border.input,
              borderRadius: 10,
              borderWidth: 1,
              gap: 3,
              opacity: pressed ? 0.7 : 1,
              padding: 12,
            })}
          >
            <Typography numberOfLines={2} variant="label">{neighbor.node.label}</Typography>
            <Typography variant="caption">
              {neighborDescription(neighbor)}
            </Typography>
          </Pressable>
        ))}
      </View>
    </ConstellationInspectorSurface>
  );
}
