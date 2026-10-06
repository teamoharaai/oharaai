import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Typography } from '@/components/ui/Typography';
import { FONT, RADIUS, SPACE, elevationStyle } from '@/constants/design';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import type { EntryDetailDto, EntryGoalOption } from '../types';
import { RichTextEditor } from './RichTextEditor';

function sharingLabel(detail: EntryDetailDto): string {
  if (detail.entry.echoOwned) return 'Captured in Echo';
  const project = detail.context.project?.title;
  if (!project) return detail.context.shareScope === 'guide' ? 'Shared with Guide' : 'Shared with Project';
  return detail.context.shareScope === 'guide'
    ? `Shared with Guide via ${project}`
    : `Shared via ${project}`;
}

function detailGoals(detail: EntryDetailDto): EntryGoalOption[] {
  return detail.entry.goals.map((goal) => ({
    ...goal,
    milestones: detail.entry.milestones.filter((milestone) => milestone.goalId === goal.id),
  }));
}

export function SharedEntryReadView({
  detail,
  onBack,
}: {
  detail: EntryDetailDto;
  onBack: () => void;
}) {
  const colors = useThemeColors();
  const darkMode = useUIStore((state) => state.themeMode === 'dark');
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const entry = detail.entry;
  const date = (entry.completedAt ?? entry.createdAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const metadata = (
    <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
      <Avatar avatarUrl={detail.author.avatarUrl} displayName={detail.author.displayName} size={32} />
      <View style={{ minWidth: 0 }}>
        <Typography variant="emphasis-sm">{detail.author.displayName || 'OHARA member'}</Typography>
        <Typography variant="caption" style={{ color: colors.text.muted }}>{date}</Typography>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ alignItems: 'center', backgroundColor: colors.background.selectedRow, borderRadius: RADIUS.round, flexDirection: 'row', gap: SPACE.xs, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm }}>
        <Ionicons color={colors.text.accent} name="eye-outline" size={15} />
        <Typography variant="caption" style={{ color: colors.text.accent }}>View only</Typography>
      </View>
    </View>
  );

  return (
    <View style={{ backgroundColor: colors.background.page, flex: 1, minHeight: 0 }}>
      <View style={{ alignItems: 'center', backgroundColor: colors.background.card, borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: 'row', gap: SPACE.md, minHeight: 64, paddingHorizontal: compact ? SPACE.lg : SPACE['2xl'] }}>
        <Pressable accessibilityLabel={`Back to ${entry.entryType === 'note' ? 'Notes' : 'Journal'}`} accessibilityRole="button" hitSlop={8} onPress={onBack} style={{ alignItems: 'center', height: 42, justifyContent: 'center', width: 42 }}>
          <Ionicons color={colors.text.primary} name="arrow-back" size={22} />
        </Pressable>
        <BrandIcon color={colors.text.accent} name={entry.entryType === 'note' ? 'notes' : 'reflections'} size={22} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Typography numberOfLines={1} variant="nav-title">{entry.echoOwned ? 'Echo Journal Entry' : entry.entryType === 'note' ? 'Shared Note' : 'Shared Journal Entry'}</Typography>
          <Typography numberOfLines={1} variant="caption" style={{ color: colors.text.secondary }}>{sharingLabel(detail)}</Typography>
        </View>
        {entry.echoOwned ? (
          // Echo owns this Entry (TD-005 B10): it is edited and deleted there.
          <Button onPress={() => router.push('/(app)/echo' as never)} size="compact" variant="ghost">Edit in Echo</Button>
        ) : null}
      </View>

      {entry.entryType === 'note' ? (
        <View style={{ alignSelf: 'center', flex: 1, minHeight: 0, paddingHorizontal: compact ? 0 : SPACE['2xl'], paddingTop: compact ? 0 : SPACE.lg, width: '100%' }}>
          <View style={[{
            backgroundColor: colors.background.card,
            borderColor: colors.border.divider,
            borderRadius: compact ? 0 : RADIUS.xl,
            borderWidth: compact ? 0 : 1,
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }, compact ? {} : elevationStyle('sm', colors, darkMode)]}>
            <View style={{ gap: SPACE.lg, paddingHorizontal: compact ? SPACE.xl : SPACE['3xl'], paddingTop: SPACE['2xl'] }}>
              <Typography accessibilityRole="header" style={{ color: colors.text.primary, fontFamily: FONT.editorial.semibold, fontSize: compact ? 28 : 38, lineHeight: compact ? 36 : 46 }}>
                {entry.title}
              </Typography>
              {metadata}
              {detail.context.goals.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
                  {detail.context.goals.map((goal) => (
                    <View key={goal.id} style={{ backgroundColor: colors.background.input, borderRadius: RADIUS.round, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm }}>
                      <Typography variant="caption">{goal.title}</Typography>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, minHeight: 360 }}>
              <RichTextEditor
                document={entry.content}
                entryId={entry.id}
                goals={detailGoals(detail)}
                onChange={() => {}}
                readOnly
              />
            </View>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ alignItems: 'center', padding: compact ? SPACE.xl : SPACE['4xl'], paddingBottom: SPACE['6xl'] }}>
          <View style={[{
            backgroundColor: colors.background.card,
            borderColor: colors.border.warmSubtle,
            borderRadius: RADIUS.xl,
            borderWidth: 1,
            gap: SPACE['2xl'],
            maxWidth: 820,
            padding: compact ? SPACE['2xl'] : SPACE['4xl'],
            width: '100%',
          }, elevationStyle('sm', colors, darkMode)]}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
              <BrandIcon color={colors.text.accent} name="reflections" size={22} />
              <Typography variant="eyebrow" style={{ color: colors.text.accent }}>JOURNAL ENTRY</Typography>
            </View>
            <Typography accessibilityRole="header" style={{ color: colors.text.primary, fontFamily: FONT.editorial.semibold, fontSize: compact ? 28 : 38, lineHeight: compact ? 36 : 48 }}>
              {entry.title}
            </Typography>
            {metadata}
            <View style={{ borderTopColor: colors.border.divider, borderTopWidth: 1, minHeight: 300, paddingTop: SPACE.lg }}>
              <RichTextEditor
                document={entry.content}
                entryId={entry.id}
                goals={detailGoals(detail)}
                onChange={() => {}}
                readOnly
              />
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
