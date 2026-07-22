import { View, useWindowDimensions } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { GoalCard } from './GoalCard';
import type { GoalWithDetails } from '../types';

interface GoalRingGridProps {
  goals: GoalWithDetails[];
  emptyMessage?: string;
}

export function GoalRingGrid({ goals, emptyMessage }: GoalRingGridProps) {
  const { width } = useWindowDimensions();
  if (goals.length === 0) {
    return emptyMessage ? <Typography variant="hint">{emptyMessage}</Typography> : null;
  }

  const columns = width >= 720 ? 2 : 1;
  const gap = 14;
  const widthPercent = `${100 / columns}%` as `${number}%`;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -(gap / 2) }}>
      {goals.map((goal) => (
        <View key={goal.id} style={{ padding: gap / 2, width: widthPercent }}>
          <GoalCard goal={goal} showMenu={false} />
        </View>
      ))}
    </View>
  );
}
