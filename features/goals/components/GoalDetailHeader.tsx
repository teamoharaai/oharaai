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

function getStatusBadgeVariant(status: GoalWithMeasurables['status']): 'active' | 'complete' | 'paused' | 'archived' {
  switch (status) {
    case 'active':    return 'active';
    case 'stagnant':  return 'paused';
    case 'discovered': return 'archived';
    case 'complete':
    default:          return 'complete';
  }
}

export function GoalDetailHeader({ goal }: GoalDetailHeaderProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const theme = GOAL_THEMES[goal.colorTheme];

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: theme.accent,
        marginBottom: 12,
        paddingHorizontal: 20,
        paddingVertical: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 2,
      }}
    >
      {/* Badges */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <Badge label={goal.category} variant="category" />
        <Badge label={goal.status} variant={getStatusBadgeVariant(goal.status)} />
        {goal.aiGenerated && <Badge label="AI" variant="ai" />}
      </View>

      {/* Title */}
      <Text
        style={{
          fontFamily: 'Inter',
          fontSize: 26,
          fontWeight: '600',
          color: '#1A1F1C',
          lineHeight: 32,
          marginBottom: goal.description ? 10 : 0,
        }}
      >
        {goal.title}
      </Text>

      {/* Description (collapsible) */}
      {goal.description && (
        <TouchableOpacity onPress={() => setDescExpanded((v) => !v)} activeOpacity={0.7}>
          <Text
            style={{ fontFamily: 'Inter', fontSize: 14, color: '#6B7B6E', lineHeight: 22 }}
            numberOfLines={descExpanded ? undefined : 2}
          >
            {goal.description}
          </Text>
          {!descExpanded && goal.description.length > 100 && (
            <Text style={{ fontSize: 12, color: theme.accent, marginTop: 3 }}>Show more</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: '#EAE7E0', marginVertical: 16 }} />

      {/* Progress row: countdown + ring */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        {goal.deadline ? (
          <CountdownTimer deadline={goal.deadline} accentColor={theme.accent} />
        ) : (
          <Text style={{ fontSize: 13, color: '#9CAF9F' }}>No deadline set</Text>
        )}
        <ProgressRing
          progress={goal.progress}
          size={72}
          strokeWidth={6}
          color={theme.accent}
        />
      </View>
    </View>
  );
}
