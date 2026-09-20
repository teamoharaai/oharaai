import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { Modal } from '@/components/ui/Modal';
import { SPACE, RADIUS } from '@/constants/design';
import { FEATURES } from '@/constants/features';
import { useThemeColors } from '@/store/uiStore';
import { useAuthStore } from '@/features/auth/store';
import { useCirclesStore } from '@/features/circles/store';
import { SharedGoalSheet } from '@/features/circles/components/CirclesSheets';
import { CategoryGlyph } from '@/features/circles/components/primitives';
import { firstName, goalStatusBadge, toCategory } from '@/features/circles/format';

/** Compact presentation of Home's canonical, server-authorized Goal summaries. */
export function SharedGoalsPreview() {
  const colors = useThemeColors();
  const goals = useCirclesStore((s) => s.sharedWithMe);
  const status = useCirclesStore((s) => s.sharedStatus);
  const load = useCirclesStore((s) => s.loadSharedWithMe);
  const userId = useAuthStore((s) => s.session?.user.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (FEATURES.CIRCLES_ENABLED && userId) void load(); }, [load, userId]);
  const selected = goals.find((goal) => goal.id === selectedId) ?? null;
  const rows = (all: boolean) => (all ? goals : goals.slice(0, 3)).map((goal) => (
    <Pressable key={goal.id} accessibilityRole="button"
      accessibilityLabel={`${goal.title}, shared by ${firstName(goal.owner)}, ${goalStatusBadge(goal.status).label}`}
      onPress={() => { setExpanded(false); setSelectedId(goal.id); }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 76,
        paddingVertical: SPACE.lg, paddingHorizontal: SPACE.md, borderRadius: RADIUS.sm,
        backgroundColor: pressed || hovered ? colors.background.selectedRow : 'transparent',
      })}>
      <CategoryGlyph category={toCategory(goal.category)} size={32} />
      <View style={{ flex: 1, minWidth: 0, gap: SPACE.xs }}>
        <Typography numberOfLines={1} variant="emphasis-sm">{goal.title}</Typography>
        <Typography numberOfLines={1} variant="caption">Shared by {firstName(goal.owner)}</Typography>
        <Typography numberOfLines={1} variant="caption">{goalStatusBadge(goal.status).label}</Typography>
      </View>
    </Pressable>
  ));
  return <View testID="goals-shared-preview" style={{ padding: SPACE.xl, gap: SPACE.md }}>
    <Typography variant="title">Shared Goals</Typography>
    {FEATURES.CIRCLES_ENABLED && (status === 'idle' || status === 'loading') && !goals.length ?
      <View style={{ minHeight: 76, justifyContent: 'center' }}><Typography variant="caption">Loading shared Goals…</Typography></View> : null}
    {status === 'error' ? <View style={{ gap: SPACE.sm }}>
      <Typography variant="caption">Shared Goals couldn't load.</Typography>
      <Pressable accessibilityRole="button" onPress={() => void load(true)} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Retry</Typography>
      </Pressable>
    </View> : null}
    {(!FEATURES.CIRCLES_ENABLED || status === 'loaded') && !goals.length ?
      <Typography variant="body">Goals shared through Circles will appear here.</Typography> : null}
    {FEATURES.CIRCLES_ENABLED ? rows(false) : null}
    {goals.length > 3 ? <Pressable accessibilityRole="button" onPress={() => setExpanded(true)} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>View all →</Typography>
    </Pressable> : null}
    <Modal visible={expanded} onClose={() => setExpanded(false)} contentStyle={{ maxWidth: 520, maxHeight: '85%' }}>
      <Typography variant="title">Shared Goals</Typography><ScrollView style={{ flexShrink: 1 }}>{rows(true)}</ScrollView>
    </Modal>
    <SharedGoalSheet goal={selected} owner={selected?.owner ?? null} onClose={() => setSelectedId(null)} onViewUpdates={() => {
      if (selected) useCirclesStore.getState().setScope({ kind: 'goal', goalId: selected.id });
      setSelectedId(null);
      router.push('/(app)/dashboard');
    }} />
  </View>;
}
