import { Pressable, View } from 'react-native';
import { getCategoryAccentTheme } from '@/constants/themes';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import type {
  ConstellationGoalCategoryNodeDTO,
  ConstellationGraphViewNode,
} from '../types';
import { ConstellationInspectorSurface } from './ConstellationInspectorSurface';

interface ConstellationGoalCategoryInspectorProps {
  neighbors: readonly ConstellationGraphViewNode[];
  node: ConstellationGoalCategoryNodeDTO;
  onClose: () => void;
  onSelect: (selectionKey: string) => void;
}

export function ConstellationGoalCategoryInspector({
  neighbors,
  node,
  onClose,
  onSelect,
}: ConstellationGoalCategoryInspectorProps) {
  const colors = useThemeColors();
  const accent = getCategoryAccentTheme(node.category);
  const goals = neighbors.filter(
    (neighbor) => (
      neighbor.entityType === 'earned_node'
      && neighbor.node.kind === 'goal'
    ),
  );

  return (
    <ConstellationInspectorSurface
      accessibilityLabel={`${node.label} goal category inspector`}
      onClose={onClose}
      selectionKey={node.selectionKey}
    >
      <View style={{ gap: 8 }}>
        <Typography
          variant="section-eyebrow"
          style={{ color: accent.mid }}
        >
          GOAL CATEGORY · LIVE
        </Typography>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: accent.tint,
              borderColor: accent.color,
              borderRadius: 24,
              borderWidth: 1,
              height: 48,
              justifyContent: 'center',
              width: 48,
            }}
          >
            <Typography style={{ color: accent.mid, fontSize: 22 }}>
              {node.symbol}
            </Typography>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Typography accessibilityRole="header" variant="heading">
              {node.label}
            </Typography>
            <Typography variant="description">
              {`${node.goalCount} active ${node.goalCount === 1 ? 'goal' : 'goals'}`}
            </Typography>
          </View>
        </View>
      </View>

      <View style={{ gap: 9 }}>
        <Typography variant="section-eyebrow">
          {`Related goals · ${goals.length}`}
        </Typography>
        {goals.map((goal) => (
          <Pressable
            accessibilityLabel={`Inspect goal ${goal.node.label}`}
            accessibilityRole="button"
            key={goal.selectionKey}
            onPress={() => onSelect(goal.selectionKey)}
            style={({ pressed }) => ({
              backgroundColor: colors.background.subtle,
              borderColor: colors.border.input,
              borderRadius: 10,
              borderWidth: 1,
              opacity: pressed ? 0.7 : 1,
              padding: 12,
            })}
          >
            <Typography numberOfLines={2} variant="label">
              {goal.node.label}
            </Typography>
          </Pressable>
        ))}
      </View>
    </ConstellationInspectorSurface>
  );
}
