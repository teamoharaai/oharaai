import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { GOAL_THEMES } from '@/constants/themes';
import { Badge } from '@/components/ui/Badge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { CountdownTimer } from './CountdownTimer';
import type { GoalWithMeasurables } from '../types';

interface GoalDetailHeaderProps {
  goal: GoalWithMeasurables;
}

export function GoalDetailHeader({ goal }: GoalDetailHeaderProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const theme = GOAL_THEMES[goal.colorTheme];

  return (
    <View style={{ padding: 24, paddingBottom: 16 }}>
      {/* Badges */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <Badge label={goal.category} variant="category" />
        <Badge label={goal.status} variant={goal.status === 'active' ? 'active' : 'complete'} />
        {goal.aiGenerated && <Badge label="AI" variant="ai" />}
      </View>

      {/* Title */}
      <Text
        style={{
          color: '#FAFAFA',
          fontSize: 30,
          fontWeight: '800',
          lineHeight: 36,
          marginBottom: 10,
        }}
      >
        {goal.title}
      </Text>

      {/* Description */}
      {goal.description && (
        <TouchableOpacity
          onPress={() => setDescExpanded((v) => !v)}
          activeOpacity={0.7}
        >
          <Text
            style={{ color: '#8888A0', fontSize: 14, lineHeight: 21 }}
            numberOfLines={descExpanded ? undefined : 2}
          >
            {goal.description}
          </Text>
          {!descExpanded && (
            <Text style={{ color: theme.accent, fontSize: 12, marginTop: 2 }}>Show more</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Countdown + Progress Ring */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {goal.deadline ? (
          <CountdownTimer deadline={goal.deadline} accentColor={theme.accent} />
        ) : (
          <Text style={{ color: '#8888A0', fontSize: 13 }}>No deadline set</Text>
        )}
        <ProgressRing
          progress={goal.progress}
          size={80}
          strokeWidth={7}
          color={theme.accent}
        />
      </View>
    </View>
  );
}
