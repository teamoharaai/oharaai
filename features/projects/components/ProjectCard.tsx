import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { ProjectSummary, ProjectVisualCategory } from '../types';

export function projectCategoryPresentation(category: ProjectVisualCategory, colors: ReturnType<typeof useThemeColors>) {
  if (category === 'Health & Fitness') return { bg: colors.background.selectedRow, color: colors.accent.primary };
  if (category === 'Work & Money') return { bg: colors.feedback.pending.bg, color: colors.feedback.pending.text };
  if (category === 'Learning & Creativity') return { bg: colors.feedback.info.bg, color: colors.accent.teal };
  if (category === 'Life & Relationships') return { bg: colors.feedback.danger.bg, color: colors.feedback.danger.text };
  return { bg: colors.background.subtle, color: colors.text.secondary };
}

export function relativeProjectActivity(value: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
}

export function ProjectCard({ project, width }: { project: ProjectSummary; width?: number }) {
  const colors = useThemeColors();
  const accent = projectCategoryPresentation(project.visualCategory, colors);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open Project ${project.title}`}
      onPress={() => router.push(`/(app)/projects/${project.id}` as never)}
      style={({ pressed }) => ({ alignSelf: 'stretch', backgroundColor: accent.bg, borderColor: colors.border.warmSubtle, borderRadius: RADIUS.xl, borderWidth: 1, minHeight: 238, minWidth: 0, opacity: pressed ? 0.78 : 1, padding: SPACE['2xl'], width: width ?? '100%' })}>
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.xl }}>
        <View style={{ alignItems: 'center', backgroundColor: colors.background.card, borderColor: colors.border.divider, borderRadius: RADIUS.lg, borderWidth: 1, flexShrink: 0, height: 58, justifyContent: 'center', width: 58 }}>
          <Ionicons color={accent.color} name="folder-outline" size={28} />
        </View>
        <View style={{ flex: 1, gap: SPACE.xs, minWidth: 0 }}>
          <Typography variant="title" numberOfLines={1}>{project.title}</Typography>
          <Typography variant="body-small" numberOfLines={2}>{project.description || 'Bring related Goals and material together.'}</Typography>
          <Typography variant="caption">{project.mode === 'guide' ? 'OHARA Guide' : project.mode[0].toUpperCase() + project.mode.slice(1)} · {project.memberCount} {project.memberCount === 1 ? 'person' : 'people'}</Typography>
        </View>
        <Ionicons color={colors.text.muted} name="ellipsis-horizontal" size={18} style={{ flexShrink: 0 }} />
      </View>
      <View style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: SPACE['2xl'], marginTop: SPACE['2xl'], paddingBottom: SPACE.xl }}>
        <View><Typography variant="emphasis-sm">{project.activeGoalCount}</Typography><Typography variant="micro-label">ACTIVE GOALS</Typography></View>
        <View><Typography variant="emphasis-sm">{project.vaultItemCount}</Typography><Typography variant="micro-label">VAULT ITEMS</Typography></View>
        <View><Typography variant="emphasis-sm">{relativeProjectActivity(project.lastActivityAt)}</Typography><Typography variant="micro-label">LAST ACTIVITY</Typography></View>
      </View>
      <View style={{ gap: SPACE.sm, marginTop: SPACE.lg }}>
        <Typography variant="eyebrow">Goals</Typography>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
          {project.goalNames.length ? project.goalNames.map((name) => <View key={name} style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider, borderRadius: RADIUS.round, borderWidth: 1, maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 6 }}><Typography numberOfLines={1} variant="caption">{name}</Typography></View>) : <Typography variant="caption">No active Goals yet.</Typography>}
        </View>
      </View>
    </Pressable>
  );
}

export function ProjectListRow({ project }: { project: ProjectSummary }) {
  const colors = useThemeColors();
  const accent = projectCategoryPresentation(project.visualCategory, colors);
  return (
    <Pressable
      accessibilityLabel={`Open Project ${project.title}`}
      accessibilityRole="button"
      onPress={() => router.push(`/(app)/projects/${project.id}` as never)}
      style={({ pressed }) => ({
        alignItems: 'center',
        alignSelf: 'stretch',
        backgroundColor: accent.bg,
        borderColor: colors.border.warmSubtle,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        flexDirection: 'row',
        gap: SPACE.lg,
        minHeight: 64,
        opacity: pressed ? 0.76 : 1,
        paddingHorizontal: SPACE.xl,
        paddingVertical: SPACE.md,
      })}
    >
      <View style={{ alignItems: 'center', backgroundColor: colors.background.card, borderColor: colors.border.divider, borderRadius: RADIUS.md, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 }}>
        <Ionicons color={accent.color} name="folder-outline" size={21} />
      </View>
      <Typography numberOfLines={1} variant="emphasis-sm" style={{ flex: 1 }}>{project.title}</Typography>
      <Typography numberOfLines={1} variant="micro-label">
        {project.activeGoalCount} {project.activeGoalCount === 1 ? 'ACTIVE GOAL' : 'ACTIVE GOALS'}
      </Typography>
      <Ionicons color={colors.text.muted} name="chevron-forward" size={18} />
    </Pressable>
  );
}
