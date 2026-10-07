import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { goalWorkspaceHref } from '@/features/goals/navigation';
import { mutateTaskOccurrence } from '@/features/tasks/services/task-service';
import { newTaskIdempotencyKey } from '@/features/tasks/utils';
import { useThemeColors } from '@/store/uiStore';
import type { CalendarItem } from '../types';

export function calendarTimeLabel(item: CalendarItem): string {
  if (item.allDay) return 'All day';
  const date = new Date(item.startAt);
  if (Number.isNaN(date.getTime())) return 'Scheduled';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
}
function openItem(item: CalendarItem) {
  if (!item.goalId) return;
  router.push(goalWorkspaceHref(item.goalId, undefined, {
    ...(item.projectId ? { projectId: item.projectId } : {}),
    ...(item.taskId ? { taskId: item.taskId } : {}),
  }) as never);
}

export function CalendarItemRow({
  item,
  onChanged,
  onExport,
  compact = false,
}: {
  item: CalendarItem;
  onChanged?: () => void;
  onExport?: (item: CalendarItem) => void;
  compact?: boolean;
}) {
  const colors = useThemeColors();
  const completed = item.status === 'completed';
  const canComplete = item.sourceType === 'task_occurrence' && !!item.occurrenceId;

  async function toggleComplete() {
    if (!item.occurrenceId) return;
    await mutateTaskOccurrence(item.occurrenceId, {
      status: completed ? 'pending' : 'completed',
      idempotencyKey: newTaskIdempotencyKey('calendar'),
    });
    onChanged?.();
  }

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: item.isExternal ? colors.background.subtle : colors.background.card,
        borderColor: colors.border.warmSubtle,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        flexDirection: 'row',
        gap: SPACE.lg,
        minHeight: compact ? 58 : 68,
        paddingHorizontal: SPACE.xl,
        paddingVertical: SPACE.md,
      }}
    >
      {canComplete ? (
        <Pressable
          accessibilityLabel={completed ? `Mark ${item.title} incomplete` : `Complete ${item.title}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed }}
          onPress={() => void toggleComplete()}
          style={{
            alignItems: 'center',
            backgroundColor: completed ? colors.accent.primary : 'transparent',
            borderColor: completed ? colors.accent.primary : colors.border.input,
            borderRadius: RADIUS.round,
            borderWidth: 1.5,
            height: 24,
            justifyContent: 'center',
            width: 24,
          }}
        >
          {completed ? <Ionicons color={colors.text.onAccent} name="checkmark" size={15} /> : null}
        </Pressable>
      ) : (
        <View style={{ alignItems: 'center', width: 24 }}>
          <Ionicons
            color={item.isExternal ? colors.text.secondary : colors.text.accent}
            name={item.isExternal ? 'calendar-outline' : item.sourceType === 'milestone' ? 'flag-outline' : 'flag'}
            size={18}
          />
        </View>
      )}

      <Pressable
        accessibilityHint={item.isOharaItem ? 'Opens its Goal context' : undefined}
        accessibilityLabel={`${item.title}, ${calendarTimeLabel(item)}${item.contextTitle ? `, ${item.contextTitle}` : ''}`}
        accessibilityRole={item.isOharaItem ? 'button' : 'text'}
        disabled={!item.isOharaItem}
        onPress={() => openItem(item)}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.65 : 1 })}
      >
        <Typography numberOfLines={1} variant="emphasis-sm" style={completed ? { color: colors.text.muted } : undefined}>
          {item.title}
        </Typography>
        <Typography numberOfLines={1} variant="caption" style={{ color: colors.text.secondary, marginTop: SPACE.xs }}>
          {[item.contextTitle, item.projectTitle].filter(Boolean).join(' · ') || (item.isExternal ? 'Personal Calendar' : 'OHARA')}
        </Typography>
      </Pressable>

      <View style={{ alignItems: 'flex-end', gap: SPACE.xs }}>
        <Typography variant="caption" style={{ color: item.allDay ? colors.text.muted : colors.text.accent }}>
          {calendarTimeLabel(item)}
        </Typography>
        {item.isOharaItem && onExport ? (
          <Pressable
            accessibilityLabel={`Add ${item.title} to Apple Calendar`}
            accessibilityRole="button"
            onPress={() => onExport(item)}
            style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1, padding: 2 })}
          >
            <Ionicons color={colors.text.muted} name="share-outline" size={15} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
