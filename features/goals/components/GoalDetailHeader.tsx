import { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { GOAL_THEMES } from '@/constants/themes';
import { Badge } from '@/components/ui/Badge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Typography } from '@/components/ui/Typography';
import { CountdownTimer } from './CountdownTimer';
import type { GoalWithMeasurables } from '../types';

interface GoalDetailHeaderProps {
  goal: GoalWithMeasurables;
}

function getStatusBadgeVariant(status: GoalWithMeasurables['status']): 'active' | 'complete' | 'paused' | 'archived' {
  switch (status) {
    case 'active':
      return 'active';
    case 'stagnant':
      return 'paused';
    case 'discovered':
      return 'archived';
    case 'complete':
    default:
      return 'complete';
  }
}

export function GoalDetailHeader({ goal }: GoalDetailHeaderProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const theme = GOAL_THEMES[goal.colorTheme];

  return (
    <View style={{ padding: 24, paddingBottom: 16 }}>
      {/* Badges */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <Badge label={goal.category} variant="category" />
        <Badge label={goal.status} variant={getStatusBadgeVariant(goal.status)} />
        {goal.aiGenerated && <Badge label="AI" variant="ai" />}
      </View>

      {/* Title */}
      <Typography variant="heading" className="text-3xl" style={{ marginBottom: 10 }}>
        {goal.title}
      </Typography>

      {/* Description */}
      {goal.description && (
        <TouchableOpacity
          onPress={() => setDescExpanded((v) => !v)}
          activeOpacity={0.7}
        >
          <Typography
            variant="body"
            numberOfLines={descExpanded ? undefined : 2}
          >
            {goal.description}
          </Typography>
          {!descExpanded && (
            <Typography variant="caption" style={{ color: theme.accent, marginTop: 2 }}>
              Show more
            </Typography>
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
          <Typography variant="label">No deadline set</Typography>
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
