import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import type { Measurable } from '../types';

interface MeasurableCardProps {
  measurable: Measurable;
  accentColor: string;
  onLog: (measurableId: string, value: number) => void;
}

function CounterContent({
  measurable,
  currentValue,
  accentColor,
  onIncrement,
}: {
  measurable: Measurable;
  currentValue: number;
  accentColor: string;
  onIncrement: () => void;
}) {
  const target = measurable.targetValue ?? 1;
  const pct = Math.min(100, Math.round((currentValue / target) * 100));

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: '#8888A0', fontSize: 13 }}>
          {currentValue}
          <Text style={{ color: '#8888A0' }}>/{target}</Text>
          {measurable.targetUnit ? ` ${measurable.targetUnit}` : ''}
        </Text>
        <TouchableOpacity
          onPress={onIncrement}
          style={{
            backgroundColor: accentColor + '26',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 5,
          }}
        >
          <Text style={{ color: accentColor, fontWeight: '700', fontSize: 16 }}>+</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 4, backgroundColor: '#1E1E2E', borderRadius: 2 }}>
        <View style={{ width: `${pct}%`, height: 4, backgroundColor: accentColor, borderRadius: 2 }} />
      </View>
    </View>
  );
}

function HabitContent({
  currentValue,
  accentColor,
  onToggle,
}: {
  currentValue: number;
  accentColor: string;
  onToggle: () => void;
}) {
  const done = currentValue === 1;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <TouchableOpacity
        onPress={onToggle}
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: done ? accentColor : '#1E1E2E',
          backgroundColor: done ? accentColor + '26' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {done && <Text style={{ color: accentColor, fontSize: 14, fontWeight: '700' }}>✓</Text>}
      </TouchableOpacity>
      <Text style={{ color: done ? '#FAFAFA' : '#8888A0', fontSize: 13 }}>
        {done ? 'Done today' : 'Not done yet'}
      </Text>
    </View>
  );
}

function ChecklistContent({
  title,
  currentValue,
  accentColor,
  onCheck,
}: {
  title: string;
  currentValue: number;
  accentColor: string;
  onCheck: () => void;
}) {
  const done = currentValue === 1;
  return (
    <TouchableOpacity
      onPress={onCheck}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: done ? accentColor : '#1E1E2E',
          backgroundColor: done ? accentColor : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {done && <Text style={{ color: '#0A0A0F', fontSize: 11, fontWeight: '800' }}>✓</Text>}
      </View>
      <Text style={{ color: done ? '#8888A0' : '#FAFAFA', fontSize: 13, textDecorationLine: done ? 'line-through' : 'none' }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export function MeasurableCard({ measurable, accentColor, onLog }: MeasurableCardProps) {
  const [currentValue, setCurrentValue] = useState(measurable.currentValue);

  function handleIncrement() {
    const next = currentValue + 1;
    setCurrentValue(next);
    onLog(measurable.id, next);
  }

  function handleToggle() {
    const next = currentValue === 0 ? 1 : 0;
    setCurrentValue(next);
    onLog(measurable.id, next);
  }

  return (
    <View
      className="bg-dark-card rounded-xl border border-dark-border"
      style={{ padding: 14, marginBottom: 10 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Text style={{ color: '#FAFAFA', fontWeight: '500', fontSize: 14, flex: 1 }}>
          {measurable.title}
        </Text>
        {measurable.isAiSuggested && <Badge label="AI" variant="ai" />}
        {measurable.frequency && (
          <Text style={{ color: '#8888A0', fontSize: 11 }}>{measurable.frequency}</Text>
        )}
      </View>

      {measurable.type === 'counter' && (
        <CounterContent
          measurable={measurable}
          currentValue={currentValue}
          accentColor={accentColor}
          onIncrement={handleIncrement}
        />
      )}
      {measurable.type === 'habit' && (
        <HabitContent
          currentValue={currentValue}
          accentColor={accentColor}
          onToggle={handleToggle}
        />
      )}
      {measurable.type === 'checklist' && (
        <ChecklistContent
          title={measurable.title}
          currentValue={currentValue}
          accentColor={accentColor}
          onCheck={handleToggle}
        />
      )}
    </View>
  );
}
