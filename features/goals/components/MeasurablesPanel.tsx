import { View, Text } from 'react-native';
import { MeasurableCard } from './MeasurableCard';
import type { Measurable } from '../types';

interface MeasurablesPanelProps {
  measurables: Measurable[];
  accentColor: string;
  onLog?: (measurableId: string, value: number) => void;
}

export function MeasurablesPanel({ measurables, accentColor, onLog }: MeasurablesPanelProps) {
  function handleLog(measurableId: string, value: number) {
    onLog?.(measurableId, value);
  }

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: '#FAFAFA', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
        Measurables
      </Text>
      {measurables.length === 0 ? (
        <Text style={{ color: '#8888A0', fontSize: 13 }}>No measurables yet.</Text>
      ) : (
        [...measurables]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((m) => (
            <MeasurableCard
              key={m.id}
              measurable={m}
              accentColor={accentColor}
              onLog={handleLog}
            />
          ))
      )}
    </View>
  );
}
