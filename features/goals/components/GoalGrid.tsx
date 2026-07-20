import { View, useWindowDimensions } from 'react-native';
import { GoalCard } from './GoalCard';
import type { GoalWithDetails } from '../types';

interface GoalGridProps {
  goals: GoalWithDetails[];
  newestId?: string;
}

export function GoalGrid({ goals, newestId }: GoalGridProps) {
  const { width } = useWindowDimensions();
  const numCols = width >= 1024 ? 4 : width >= 640 ? 2 : 1;
  const gap = 12;
  const colPct = `${100 / numCols}%` as `${number}%`;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -(gap / 2) }}>
      {goals.map((goal) => (
        <View key={goal.id} style={{ width: colPct, padding: gap / 2 }}>
          <GoalCard goal={goal} isNewest={goal.id === newestId} />
        </View>
      ))}
    </View>
  );
}
