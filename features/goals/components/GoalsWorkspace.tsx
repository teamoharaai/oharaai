import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';

import { AuthenticatedPageShell } from '@/components/layout/AuthenticatedPageShell';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Typography } from '@/components/ui/Typography';
import { elevationStyle, RADIUS, SPACE } from '@/constants/design';
import { getCategoryAccentTheme } from '@/constants/themes';
import { fetchEntries } from '@/features/entries/services/entry-service';
import type { EntryRecord } from '@/features/entries/types';
import { useProjectStore } from '@/features/projects/store';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { useGoalMomentumSummary } from '@/features/momentum/hooks/useMomentumHomeSummary';
import { MomentumTrendChart } from '@/features/momentum/components/MomentumTrendChart';
import type { ActivityItem } from '@/types/activity';
import {
  filterGoalsForWorkspace,
  getGoalCategoryLabel,
  getGoalStatusLabel,
  getNextGoalMilestone,
  type GoalWorkspaceStatusFilter,
} from '../goals-workspace';
import { getGoalWorkspaceSelection } from '../navigation';
import { useActivity } from '../hooks/useActivity';
import { useGoalDetail, type UseGoalDetailResult } from '../hooks/useGoalDetail';
import { useGoals } from '../hooks/useGoals';
import { useGoalStore } from '../store';
import type { GoalMilestone, GoalWithDetails, Tracker } from '../types';
import { getGoalRingProgress } from '../utils/ringProgress';
import { CountdownTimer } from './CountdownTimer';
import { GoalDetailHeader } from './GoalDetailHeader';
import { GoalProjectPickerModal } from './GoalProjectPickerModal';
import { MilestonesPanel } from './MilestonesPanel';
import { TrackersPanel } from './TrackersPanel';

type WorkspaceTab = 'overview' | 'milestones' | 'tasks' | 'reflections' | 'notes' | 'insights';

const STATUS_OPTIONS: ReadonlyArray<{ label: string; value: GoalWorkspaceStatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
];

const DETAIL_TABS: ReadonlyArray<{ label: string; value: WorkspaceTab }> = [
  { label: 'Overview', value: 'overview' },
  { label: 'Milestones', value: 'milestones' },
  { label: 'Tasks', value: 'tasks' },
  { label: 'Reflections', value: 'reflections' },
  { label: 'Notes', value: 'notes' },
  { label: 'Insights', value: 'insights' },
];

function formatDate(date: Date | null, fallback = 'Not set'): string {
  if (!date || Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatRelativeDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const difference = Date.now() - date.getTime();
  const days = Math.floor(difference / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
}

function dueLabel(date: Date | null): string {
  if (!date) return 'No target date';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days < 7) return `In ${days} days`;
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  return formatDate(date);
}

function activityPresentation(item: ActivityItem): { detail?: string; icon: keyof typeof Ionicons.glyphMap; title: string } {
  switch (item.kind) {
    case 'milestone_completed':
      return { icon: 'checkmark-circle-outline', title: `Reached ${item.label}` };
    case 'tracker_logged':
      return {
        detail: `${item.value}${item.note ? ` · ${item.note}` : ''}`,
        icon: 'trending-up-outline',
        title: `Logged ${item.label}`,
      };
    case 'goal_created':
      return { icon: 'flag-outline', title: 'Goal created' };
    case 'vault_item_added':
      return { icon: 'bookmark-outline', title: `Added ${item.title}` };
    case 'insight_confirmed':
      return { detail: item.content, icon: 'sparkles-outline', title: 'Confirmed an insight' };
    case 'echo_linked':
      return { detail: item.preview, icon: 'link-outline', title: 'Linked a reflection' };
    case 'echo_entry':
      return { detail: item.preview, icon: 'chatbubble-ellipses-outline', title: 'Reflected on this goal' };
  }
}

function Surface({
  children,
  style,
  subtle = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  subtle?: boolean;
}) {
  const colors = useThemeColors();
  const dark = useUIStore((state) => state.themeMode) === 'dark';

  return (
    <View
      style={[
        {
          ...elevationStyle(subtle ? 'sm' : 'md', colors, dark),
          backgroundColor: colors.background.card,
          borderColor: colors.border.warmSubtle,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          minWidth: 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function CategoryGlyph({ goal, size = 48 }: { goal: GoalWithDetails; size?: number }) {
  const colors = useThemeColors();
  const dark = useUIStore((state) => state.themeMode) === 'dark';
  const accent = getCategoryAccentTheme(goal.category);
  const iconByCategory: Partial<Record<GoalWithDetails['category'], keyof typeof Ionicons.glyphMap>> = {
    body: 'fitness-outline',
    health: 'fitness-outline',
    mind: 'book-outline',
    education: 'book-outline',
    money: 'wallet-outline',
    finance: 'wallet-outline',
    career: 'briefcase-outline',
    create: 'color-palette-outline',
    creative: 'color-palette-outline',
    connect: 'heart-outline',
    relationships: 'heart-outline',
    contribute: 'leaf-outline',
    growth: 'leaf-outline',
  };

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: dark ? colors.background.input : accent.tint,
        borderColor: dark ? `${accent.color}55` : `${accent.color}28`,
        borderRadius: size * 0.32,
        borderWidth: 1,
        height: size,
        justifyContent: 'center',
        width: size,
      }}
    >
      <Ionicons color={accent.color} name={iconByCategory[goal.category] ?? 'flag-outline'} size={size * 0.48} />
    </View>
  );
}

function QuietPill({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        backgroundColor: accent ? colors.background.selectedRow : colors.background.input,
        borderRadius: RADIUS.round,
        paddingHorizontal: SPACE.lg,
        paddingVertical: SPACE.sm,
      }}
    >
      <Typography variant="caption" style={{ color: accent ? colors.text.accent : colors.text.secondary }}>
        {children}
      </Typography>
    </View>
  );
}

function HeaderAction({
  icon,
  label,
  onPress,
  primary = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: primary ? colors.accent.primary : colors.background.card,
        borderColor: primary ? colors.accent.primary : colors.border.input,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        flexDirection: 'row',
        gap: SPACE.md,
        minHeight: 44,
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: SPACE.xl,
      })}
    >
      <Ionicons color={primary ? colors.text.onAccent : colors.text.primary} name={icon} size={18} />
      <Typography
        variant="emphasis-sm"
        style={{ color: primary ? colors.text.onAccent : colors.text.primary }}
      >
        {label}
      </Typography>
    </Pressable>
  );
}

function GoalsHeader({
  compact,
  filterOpen,
  onToggleFilter,
  query,
  setQuery,
}: {
  compact: boolean;
  filterOpen: boolean;
  onToggleFilter: () => void;
  query: string;
  setQuery: (value: string) => void;
}) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        alignItems: compact ? 'stretch' : 'flex-end',
        flexDirection: compact ? 'column' : 'row',
        gap: SPACE['3xl'],
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
          <BrandIcon name="goals" size={20} color={colors.accent.primary} />
          <Typography variant="eyebrow" style={{ color: colors.text.primary, fontSize: 12 }}>
            GOALS
          </Typography>
        </View>
        <Typography
          accessibilityRole="header"
          variant="heading"
          style={{ fontSize: compact ? 30 : 36, lineHeight: compact ? 38 : 44, marginTop: SPACE.sm }}
        >
          Your journeys, your becoming.
        </Typography>
        <Typography variant="body" style={{ color: colors.text.secondary, marginTop: SPACE.xs }}>
          Every goal is a living journey. Reflect, adjust, and grow.
        </Typography>
      </View>

      <View style={{ flexDirection: compact ? 'column' : 'row', gap: SPACE.lg, minWidth: compact ? 0 : 460 }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.background.card,
            borderColor: colors.border.input,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            flex: 1,
            flexDirection: 'row',
            gap: SPACE.md,
            minHeight: 44,
            paddingHorizontal: SPACE.lg,
          }}
        >
          <Ionicons color={colors.text.secondary} name="search-outline" size={18} />
          <TextInput
            accessibilityLabel="Search goals"
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder="Search goals..."
            placeholderTextColor={colors.text.muted}
            style={{
              color: colors.text.primary,
              flex: 1,
              fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
              fontSize: 14,
              minWidth: 0,
              outlineStyle: 'none',
            } as never}
            value={query}
          />
          {query ? (
            <Pressable accessibilityLabel="Clear goal search" onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons color={colors.text.muted} name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: SPACE.lg }}>
          <HeaderAction icon="options-outline" label={filterOpen ? 'Close filters' : 'Filter'} onPress={onToggleFilter} />
          <HeaderAction icon="add-outline" label="New Goal" onPress={() => router.push('/goals/create')} primary />
        </View>
      </View>
    </View>
  );
}

function GoalStatusTabs({
  onChange,
  value,
}: {
  onChange: (value: GoalWorkspaceStatusFilter) => void;
  value: GoalWorkspaceStatusFilter;
}) {
  const colors = useThemeColors();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
      {STATUS_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: selected ? colors.background.selectedRow : 'transparent',
              borderRadius: RADIUS.round,
              justifyContent: 'center',
              minHeight: 36,
              minWidth: 60,
              opacity: pressed ? 0.7 : 1,
              paddingHorizontal: SPACE.lg,
            })}
          >
            <Typography variant="caption" style={{ color: selected ? colors.text.accent : colors.text.secondary }}>
              {option.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

function CategoryFilters({
  categories,
  onChange,
  value,
}: {
  categories: readonly GoalWithDetails['category'][];
  onChange: (value: GoalWithDetails['category'] | null) => void;
  value: GoalWithDetails['category'] | null;
}) {
  const colors = useThemeColors();
  return (
    <Surface style={{ marginTop: SPACE.lg, padding: SPACE.xl }} subtle>
      <Typography variant="eyebrow" style={{ color: colors.text.secondary, marginBottom: SPACE.lg }}>
        CATEGORY
      </Typography>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
        <Pressable
          onPress={() => onChange(null)}
          style={{
            backgroundColor: value === null ? colors.background.selectedRow : colors.background.input,
            borderRadius: RADIUS.round,
            minHeight: 40,
            justifyContent: 'center',
            paddingHorizontal: SPACE.xl,
          }}
        >
          <Typography variant="emphasis-sm" style={{ color: value === null ? colors.text.accent : colors.text.secondary }}>
            All categories
          </Typography>
        </Pressable>
        {categories.map((category) => (
          <Pressable
            key={category}
            onPress={() => onChange(category)}
            style={{
              backgroundColor: value === category ? colors.background.selectedRow : colors.background.input,
              borderRadius: RADIUS.round,
              minHeight: 40,
              justifyContent: 'center',
              paddingHorizontal: SPACE.xl,
            }}
          >
            <Typography variant="emphasis-sm" style={{ color: value === category ? colors.text.accent : colors.text.secondary }}>
              {getGoalCategoryLabel(category)}
            </Typography>
          </Pressable>
        ))}
      </View>
    </Surface>
  );
}

function GoalListCard({
  goal,
  onSelect,
  selected,
}: {
  goal: GoalWithDetails;
  onSelect: () => void;
  selected: boolean;
}) {
  const colors = useThemeColors();
  const dark = useUIStore((state) => state.themeMode) === 'dark';
  const accent = getCategoryAccentTheme(goal.category);
  const next = getNextGoalMilestone(goal.milestones);

  return (
    <Pressable
      accessibilityHint="Shows this goal in the workspace"
      accessibilityLabel={`Select ${goal.title}`}
      accessibilityRole="button"
      onPress={onSelect}
      style={({ pressed }) => ({
        ...elevationStyle(selected ? 'sm' : 'none', colors, dark),
        backgroundColor: selected ? colors.background.selectedRow : colors.background.card,
        borderColor: selected ? colors.border.accent : colors.border.warmSubtle,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        opacity: pressed ? 0.76 : 1,
        overflow: 'hidden',
        padding: SPACE.xl,
      })}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
        <CategoryGlyph goal={goal} size={46} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Typography numberOfLines={1} variant="goal-title" style={{ fontSize: 16 }}>
            {goal.title}
          </Typography>
          <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: 2 }}>
            {getGoalCategoryLabel(goal.category)}
          </Typography>
        </View>
        <ProgressRing color={accent.color} progress={goal.progress} size={58} strokeWidth={4} variant="warm" />
      </View>
      {goal.description ? (
        <Typography
          numberOfLines={2}
          variant="description"
          style={{ marginLeft: 58, marginTop: SPACE.md }}
        >
          {goal.description}
        </Typography>
      ) : null}
      <View
        style={{
          alignItems: 'center',
          borderTopColor: colors.border.divider,
          borderTopWidth: 1,
          flexDirection: 'row',
          gap: SPACE.md,
          justifyContent: 'space-between',
          marginTop: SPACE.xl,
          paddingTop: SPACE.lg,
        }}
      >
        <Typography numberOfLines={1} variant="caption" style={{ flex: 1 }}>
          <Typography variant="caption" style={{ color: colors.text.accent }}>Next: </Typography>
          {next?.title ?? 'No next milestone'}
        </Typography>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
          <Ionicons color={colors.text.secondary} name="calendar-clear-outline" size={14} />
          <Typography variant="caption">{dueLabel(next?.dueDate ?? goal.deadline)}</Typography>
        </View>
      </View>
    </Pressable>
  );
}

function GoalList({
  category,
  categories,
  filterOpen,
  goals,
  onCategoryChange,
  onSelect,
  onStatusChange,
  selectedGoalId,
  status,
}: {
  category: GoalWithDetails['category'] | null;
  categories: readonly GoalWithDetails['category'][];
  filterOpen: boolean;
  goals: readonly GoalWithDetails[];
  onCategoryChange: (value: GoalWithDetails['category'] | null) => void;
  onSelect: (goalId: string) => void;
  onStatusChange: (value: GoalWorkspaceStatusFilter) => void;
  selectedGoalId: string | null;
  status: GoalWorkspaceStatusFilter;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ gap: SPACE.lg, minWidth: 0 }}>
      <Surface style={{ padding: SPACE.xl }} subtle>
        <GoalStatusTabs onChange={onStatusChange} value={status} />
        {filterOpen ? (
          <CategoryFilters categories={categories} onChange={onCategoryChange} value={category} />
        ) : null}
      </Surface>

      {goals.length ? goals.map((goal) => (
        <GoalListCard
          goal={goal}
          key={goal.id}
          onSelect={() => onSelect(goal.id)}
          selected={selectedGoalId === goal.id}
        />
      )) : (
        <Surface style={{ alignItems: 'center', paddingHorizontal: SPACE['3xl'], paddingVertical: SPACE['5xl'] }} subtle>
          <BrandIcon name="goals" size={30} color={colors.text.accent} />
          <Typography variant="title" style={{ marginTop: SPACE.xl, textAlign: 'center' }}>
            No goals match this view.
          </Typography>
          <Typography variant="body" style={{ marginTop: SPACE.md, maxWidth: 280, textAlign: 'center' }}>
            Adjust the search or filters, or begin a new journey.
          </Typography>
          <Button onPress={() => router.push('/goals/create')} size="compact" style={{ marginTop: SPACE.xl }}>
            New Goal
          </Button>
        </Surface>
      )}
    </View>
  );
}

function GoalMeta({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md, minWidth: 128 }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.background.selectedRow,
          borderRadius: RADIUS.round,
          height: 34,
          justifyContent: 'center',
          width: 34,
        }}
      >
        <Ionicons color={colors.text.accent} name={icon} size={17} />
      </View>
      <View style={{ minWidth: 0 }}>
        <Typography variant="caption">{label}</Typography>
        <Typography numberOfLines={1} variant="emphasis-sm" style={{ marginTop: 1 }}>
          {value}
        </Typography>
      </View>
    </View>
  );
}

function SelectedGoalHero({ goal }: { goal: GoalWithDetails }) {
  const colors = useThemeColors();
  const dark = useUIStore((state) => state.themeMode) === 'dark';
  const accent = getCategoryAccentTheme(goal.category);
  return (
    <Surface style={{ overflow: 'hidden' }}>
      <View
        style={{
          backgroundColor: dark ? colors.background.subtle : `${accent.tint}88`,
          padding: SPACE['3xl'],
        }}
      >
        <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.xl }}>
          <CategoryGlyph goal={goal} size={66} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
              <Typography variant="heading" style={{ flexShrink: 1, fontSize: 26, lineHeight: 34 }}>
                {goal.title}
              </Typography>
              <QuietPill accent>{getGoalStatusLabel(goal.status)}</QuietPill>
            </View>
            {goal.description ? (
              <Typography variant="body" style={{ marginTop: SPACE.md, maxWidth: 560 }}>
                {goal.description}
              </Typography>
            ) : (
              <Typography variant="body" style={{ marginTop: SPACE.md }}>
                No description has been added yet.
              </Typography>
            )}
          </View>
          <View style={{ alignItems: 'center', gap: SPACE.sm }}>
            <ProgressRing color={accent.color} progress={goal.progress} size={94} strokeWidth={6} variant="warm" />
            <Typography variant="caption">Progress</Typography>
          </View>
        </View>

        <View
          style={{
            backgroundColor: colors.background.card,
            borderColor: colors.border.warmSubtle,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: SPACE['2xl'],
            marginTop: SPACE['3xl'],
            padding: SPACE.lg,
          }}
        >
          <GoalMeta icon="pricetag-outline" label="Category" value={getGoalCategoryLabel(goal.category)} />
          <GoalMeta icon="calendar-outline" label="Target" value={formatDate(goal.deadline)} />
          <GoalMeta icon="time-outline" label="Created" value={formatDate(goal.createdAt)} />
        </View>
      </View>
    </Surface>
  );
}

function DetailTabs({ onChange, value }: { onChange: (value: WorkspaceTab) => void; value: WorkspaceTab }) {
  const colors = useThemeColors();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        borderBottomColor: colors.border.divider,
        borderBottomWidth: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: SPACE.xl,
      }}
    >
      {DETAIL_TABS.map((tab) => {
        const selected = value === tab.value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={tab.value}
            onPress={() => onChange(tab.value)}
            style={({ pressed }) => ({
              borderBottomColor: selected ? colors.accent.primary : 'transparent',
              borderBottomWidth: 2,
              minHeight: 46,
              justifyContent: 'center',
              opacity: pressed ? 0.65 : 1,
              paddingHorizontal: SPACE.lg,
            })}
          >
            <Typography variant="caption" style={{ color: selected ? colors.text.primary : colors.text.secondary }}>
              {tab.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionHeading({ action, children }: { action?: ReactNode; children: ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
      <Typography variant="eyebrow" style={{ color: colors.text.secondary }}>
        {children}
      </Typography>
      {action}
    </View>
  );
}

function NextStepCard({ goal, milestone, onOpen }: { goal: GoalWithDetails; milestone: GoalMilestone | null; onOpen: () => void }) {
  const colors = useThemeColors();
  return (
    <Surface style={{ padding: SPACE.xl }} subtle>
      <SectionHeading>NEXT STEP</SectionHeading>
      {milestone ? (
        <Pressable
          accessibilityLabel={`Open ${goal.title}`}
          onPress={onOpen}
          style={({ pressed }) => ({
            alignItems: 'center',
            flexDirection: 'row',
            gap: SPACE.lg,
            marginTop: SPACE.lg,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: colors.background.selectedRow,
              borderRadius: RADIUS.round,
              height: 42,
              justifyContent: 'center',
              width: 42,
            }}
          >
            <Ionicons color={colors.text.accent} name="navigate-outline" size={20} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Typography variant="emphasis-sm">{milestone.title}</Typography>
            {milestone.description ? (
              <Typography numberOfLines={1} variant="caption" style={{ marginTop: 2 }}>
                {milestone.description}
              </Typography>
            ) : null}
          </View>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
            <Ionicons color={colors.text.secondary} name="calendar-clear-outline" size={15} />
            <Typography variant="caption">{dueLabel(milestone.dueDate ?? goal.deadline)}</Typography>
            <Ionicons color={colors.text.secondary} name="chevron-forward" size={16} />
          </View>
        </Pressable>
      ) : (
        <Typography variant="body" style={{ marginTop: SPACE.lg }}>
          No next milestone is recorded for this goal yet.
        </Typography>
      )}
    </Surface>
  );
}

function MilestoneJourney({ milestones }: { milestones: readonly GoalMilestone[] }) {
  const colors = useThemeColors();
  const sorted = [...milestones].sort((left, right) => left.sortOrder - right.sortOrder);
  if (!sorted.length) {
    return (
      <Surface style={{ padding: SPACE.xl }} subtle>
        <SectionHeading>MILESTONES</SectionHeading>
        <Typography variant="body" style={{ marginTop: SPACE.lg }}>
          No milestones have been added to this goal yet.
        </Typography>
      </Surface>
    );
  }

  const currentIndex = Math.max(0, sorted.findIndex((item) => item.completedAt === null));
  return (
    <Surface style={{ padding: SPACE.xl }} subtle>
      <SectionHeading>MILESTONES</SectionHeading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.lg, marginTop: SPACE.xl }}>
        {sorted.map((milestone, index) => {
          const completed = milestone.completedAt !== null;
          const current = !completed && index === currentIndex;
          return (
            <View key={milestone.id} style={{ flex: 1, minWidth: 112 }}>
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: completed || current ? colors.background.selectedRow : colors.background.input,
                    borderColor: completed || current ? colors.border.accent : colors.border.input,
                    borderRadius: RADIUS.round,
                    borderWidth: 1,
                    height: 30,
                    justifyContent: 'center',
                    width: 30,
                  }}
                >
                  <Ionicons
                    color={completed || current ? colors.text.accent : colors.text.muted}
                    name={completed ? 'checkmark' : current ? 'ellipse' : 'ellipse-outline'}
                    size={15}
                  />
                </View>
                {index < sorted.length - 1 ? (
                  <View style={{ backgroundColor: completed ? colors.accent.primary : colors.border.divider, flex: 1, height: 1 }} />
                ) : null}
              </View>
              <Typography numberOfLines={2} variant="emphasis-sm" style={{ fontSize: 12, marginTop: SPACE.md }}>
                {milestone.title}
              </Typography>
              <Typography variant="caption" style={{ marginTop: SPACE.xs }}>
                {completed ? `Completed ${formatDate(milestone.completedAt)}` : current ? 'Current' : dueLabel(milestone.dueDate)}
              </Typography>
            </View>
          );
        })}
      </View>
    </Surface>
  );
}

function ActivityList({ error, items, loading }: { error: string | null; items: readonly ActivityItem[]; loading: boolean }) {
  const colors = useThemeColors();
  const visibleItems = items.slice(0, 4);
  return (
    <Surface style={{ padding: SPACE.xl }} subtle>
      <SectionHeading>RECENT ACTIVITY</SectionHeading>
      {loading ? (
        <ActivityIndicator color={colors.accent.primary} style={{ alignSelf: 'flex-start', marginTop: SPACE.xl }} />
      ) : error ? (
        <Typography variant="body" style={{ marginTop: SPACE.lg }}>
          Recent activity could not be loaded right now.
        </Typography>
      ) : visibleItems.length ? (
        <View style={{ gap: SPACE.lg, marginTop: SPACE.lg }}>
          {visibleItems.map((item) => {
            const presentation = activityPresentation(item);
            return (
              <View key={item.id} style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.lg }}>
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: colors.background.selectedRow,
                    borderRadius: RADIUS.round,
                    height: 34,
                    justifyContent: 'center',
                    width: 34,
                  }}
                >
                  <Ionicons color={colors.text.accent} name={presentation.icon} size={17} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Typography numberOfLines={1} variant="emphasis-sm">{presentation.title}</Typography>
                  {presentation.detail ? (
                    <Typography numberOfLines={2} variant="caption" style={{ marginTop: 2 }}>
                      {presentation.detail}
                    </Typography>
                  ) : null}
                </View>
                <Typography variant="caption">{formatRelativeDate(item.timestamp)}</Typography>
              </View>
            );
          })}
        </View>
      ) : (
        <Typography variant="body" style={{ marginTop: SPACE.lg }}>
          No activity has been recorded for this goal yet.
        </Typography>
      )}
    </Surface>
  );
}

function EntriesList({ entries, emptyCopy }: { entries: readonly EntryRecord[]; emptyCopy: string }) {
  const colors = useThemeColors();
  if (!entries.length) return <Typography variant="body">{emptyCopy}</Typography>;
  return (
    <View style={{ gap: SPACE.lg }}>
      {entries.slice(0, 6).map((entry) => (
        <Pressable
          accessibilityLabel={`Open ${entry.title || entry.entryType}`}
          key={entry.id}
          onPress={() => router.push({ pathname: '/(app)/entries/[id]' as never, params: { id: entry.id } })}
          style={({ pressed }) => ({
            alignItems: 'flex-start',
            backgroundColor: colors.background.subtle,
            borderRadius: RADIUS.md,
            flexDirection: 'row',
            gap: SPACE.lg,
            minHeight: 64,
            opacity: pressed ? 0.68 : 1,
            padding: SPACE.lg,
          })}
        >
          <Ionicons color={colors.text.accent} name={entry.entryType === 'note' ? 'document-text-outline' : 'sparkles-outline'} size={19} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Typography numberOfLines={1} variant="emphasis-sm">
              {entry.title || (entry.entryType === 'note' ? 'Untitled note' : 'Reflection')}
            </Typography>
            <Typography numberOfLines={2} variant="caption" style={{ marginTop: 2 }}>
              {entry.plainText || 'No preview available.'}
            </Typography>
          </View>
          <Typography variant="caption">{formatRelativeDate(entry.updatedAt)}</Typography>
        </Pressable>
      ))}
    </View>
  );
}

function MilestoneList({ milestones }: { milestones: readonly GoalMilestone[] }) {
  const colors = useThemeColors();
  if (!milestones.length) return <Typography variant="body">No milestones have been added yet.</Typography>;
  return (
    <View style={{ gap: SPACE.lg }}>
      {[...milestones].sort((a, b) => a.sortOrder - b.sortOrder).map((milestone) => (
        <View key={milestone.id} style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.lg }}>
          <Ionicons
            color={milestone.completedAt ? colors.text.accent : colors.text.muted}
            name={milestone.completedAt ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Typography variant="emphasis-sm">{milestone.title}</Typography>
            {milestone.description ? <Typography variant="caption" style={{ marginTop: 2 }}>{milestone.description}</Typography> : null}
          </View>
          <Typography variant="caption">
            {milestone.completedAt ? formatDate(milestone.completedAt) : dueLabel(milestone.dueDate)}
          </Typography>
        </View>
      ))}
    </View>
  );
}

function TrackerList({ trackers }: { trackers: readonly Tracker[] }) {
  const colors = useThemeColors();
  if (!trackers.length) {
    return (
      <Typography variant="body">
        A dedicated task list is not stored for this goal. Trackers and completed activity will appear here when available.
      </Typography>
    );
  }
  return (
    <View style={{ gap: SPACE.lg }}>
      {trackers.map((tracker) => {
        const target = tracker.targetValue ?? 0;
        const progress = target > 0 ? Math.min(100, (tracker.currentValue / target) * 100) : 0;
        return (
          <View key={tracker.id} style={{ backgroundColor: colors.background.subtle, borderRadius: RADIUS.md, padding: SPACE.lg }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
              <Typography variant="emphasis-sm">{tracker.title}</Typography>
              <Typography variant="caption">
                {tracker.currentValue}{target ? ` / ${target}` : ''}{tracker.targetUnit ? ` ${tracker.targetUnit}` : ''}
              </Typography>
            </View>
            <View style={{ backgroundColor: colors.border.divider, borderRadius: RADIUS.round, height: 5, marginTop: SPACE.md, overflow: 'hidden' }}>
              <View style={{ backgroundColor: colors.accent.primary, height: 5, width: `${progress}%` }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function GoalTabContent({
  activityError,
  activityItems,
  activityLoading,
  entriesError,
  goal,
  goalDetail,
  linkedEntries,
  onTabChange,
  tab,
}: {
  activityError: string | null;
  activityItems: readonly ActivityItem[];
  activityLoading: boolean;
  entriesError: string | null;
  goal: GoalWithDetails;
  goalDetail: UseGoalDetailResult;
  linkedEntries: readonly EntryRecord[];
  onTabChange: (value: WorkspaceTab) => void;
  tab: WorkspaceTab;
}) {
  const colors = useThemeColors();
  const next = getNextGoalMilestone(goal.milestones);
  const notes = linkedEntries.filter((entry) => entry.entryType === 'note');
  const reflections = linkedEntries.filter((entry) => entry.entryType === 'reflection');
  const insights = activityItems.filter((item) => item.kind === 'insight_confirmed');

  if (tab === 'overview') {
    const deadlineProgress = getGoalRingProgress(goal);
    const ended = deadlineProgress !== null && deadlineProgress >= 100;
    const mutationsDisabled = ended || goal.status === 'complete';
    return (
      <View style={{ gap: SPACE.xl }}>
        <CountdownTimer
          createdAt={goal.createdAt}
          deadline={goal.deadline}
          disabled={goal.has_successor || goal.status === 'archived' || goal.status === 'complete'}
          onUpdateDeadline={goalDetail.onUpdateDeadline}
        />
        <NextStepCard goal={goal} milestone={next} onOpen={() => onTabChange('milestones')} />
        <MilestonesPanel
          archived={goal.status === 'archived'}
          completingIds={goalDetail.completingMilestoneIds}
          ended={mutationsDisabled}
          error={goalDetail.milestoneError}
          hasSuccessor={goal.has_successor}
          milestones={goal.milestones}
          onAdd={goalDetail.onAddMilestone}
          onComplete={goalDetail.onCompleteMilestone}
          onDelete={goalDetail.onDeleteMilestone}
          onDismissError={goalDetail.clearMilestoneError}
          onSave={goalDetail.onSaveMilestone}
        />
        <TrackersPanel
          archived={goal.status === 'archived'}
          completedIds={goalDetail.completedTrackerIds}
          ended={mutationsDisabled}
          error={goalDetail.trackerError}
          hasSuccessor={goal.has_successor}
          onAdd={goalDetail.onAddTracker}
          onDelete={goalDetail.onDeleteTracker}
          onDismissError={goalDetail.clearTrackerError}
          onLogComplete={goalDetail.onCompleteTracker}
          onSave={goalDetail.onSaveTracker}
          trackers={goal.trackers}
        />
        <ActivityList error={activityError} items={activityItems} loading={activityLoading} />
      </View>
    );
  }

  const title = DETAIL_TABS.find((item) => item.value === tab)?.label ?? '';
  return (
    <Surface style={{ padding: SPACE.xl }} subtle>
      <SectionHeading
        action={tab === 'notes' ? (
          <Pressable onPress={() => router.push('/(app)/entries?create=note')} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>+ New note</Typography>
          </Pressable>
        ) : tab === 'reflections' ? (
          <Pressable
            onPress={() => router.push({ pathname: '/(app)/entries/reflection', params: { goalId: goal.id, type: 'goal' } })}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>+ Reflect</Typography>
          </Pressable>
        ) : undefined}
      >
        {title.toUpperCase()}
      </SectionHeading>
      <View style={{ marginTop: SPACE.xl }}>
        {tab === 'milestones' ? (
          <MilestonesPanel
            archived={goal.status === 'archived'}
            completingIds={goalDetail.completingMilestoneIds}
            ended={goal.status === 'complete'}
            error={goalDetail.milestoneError}
            hasSuccessor={goal.has_successor}
            milestones={goal.milestones}
            onAdd={goalDetail.onAddMilestone}
            onComplete={goalDetail.onCompleteMilestone}
            onDelete={goalDetail.onDeleteMilestone}
            onDismissError={goalDetail.clearMilestoneError}
            onSave={goalDetail.onSaveMilestone}
          />
        ) : null}
        {tab === 'tasks' ? (
          <TrackersPanel
            archived={goal.status === 'archived'}
            completedIds={goalDetail.completedTrackerIds}
            ended={goal.status === 'complete'}
            error={goalDetail.trackerError}
            hasSuccessor={goal.has_successor}
            onAdd={goalDetail.onAddTracker}
            onDelete={goalDetail.onDeleteTracker}
            onDismissError={goalDetail.clearTrackerError}
            onLogComplete={goalDetail.onCompleteTracker}
            onSave={goalDetail.onSaveTracker}
            trackers={goal.trackers}
          />
        ) : null}
        {tab === 'reflections' ? (
          entriesError ? <Typography variant="body">Linked reflections could not be loaded right now.</Typography> :
          <EntriesList entries={reflections} emptyCopy="No reflections are linked to this goal yet." />
        ) : null}
        {tab === 'notes' ? (
          entriesError ? <Typography variant="body">Linked notes could not be loaded right now.</Typography> :
          <EntriesList entries={notes} emptyCopy="No notes are linked to this goal yet." />
        ) : null}
        {tab === 'insights' ? (
          insights.length ? (
            <View style={{ gap: SPACE.lg }}>
              {insights.map((item) => item.kind === 'insight_confirmed' ? (
                <View key={item.id} style={{ backgroundColor: colors.background.subtle, borderRadius: RADIUS.md, padding: SPACE.xl }}>
                  <Typography variant="emphasis-sm">Confirmed insight</Typography>
                  <Typography variant="body" style={{ marginTop: SPACE.md }}>{item.content}</Typography>
                  <Typography variant="caption" style={{ marginTop: SPACE.md }}>{formatRelativeDate(item.timestamp)}</Typography>
                </View>
              ) : null)}
            </View>
          ) : (
            <Typography variant="body">
              No confirmed insight is stored for this goal yet. OHARA will only show an insight here when it is backed by real goal context.
            </Typography>
          )
        ) : null}
      </View>
    </Surface>
  );
}

function GoalAnalyticsCard({ goal, items, entries }: { goal: GoalWithDetails; items: readonly ActivityItem[]; entries: readonly EntryRecord[] }) {
  const colors = useThemeColors();
  const accent = getCategoryAccentTheme(goal.category);
  const momentum = useGoalMomentumSummary(goal.id);
  const goalMomentum = momentum.goalSummary;
  const completedMilestones = goal.milestones.filter((milestone) => milestone.completedAt !== null).length;
  const recordedActions = items.filter((item) => item.kind !== 'goal_created').length;
  return (
    <Surface style={{ padding: SPACE.xl }} subtle>
      <SectionHeading>GOAL ANALYTICS</SectionHeading>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.xl, marginTop: SPACE.xl }}>
        <ProgressRing color={accent.color} progress={goal.progress} size={74} strokeWidth={5} variant="warm" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Typography variant="emphasis-sm">Current progress</Typography>
          <Typography variant="body" style={{ marginTop: SPACE.sm }}>
            {goal.progress}% complete from the goal&apos;s authoritative progress value.
          </Typography>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.xl }}>
        {[
          { label: 'Milestones reached', value: `${completedMilestones}/${goal.milestones.length}` },
          { label: 'Recorded activity', value: String(recordedActions) },
          { label: 'Linked entries', value: String(entries.length) },
        ].map((metric) => (
          <View key={metric.label} style={{ backgroundColor: colors.background.card, borderRadius: RADIUS.md, flex: 1, minWidth: 0, padding: SPACE.lg }}>
            <Typography variant="title">{metric.value}</Typography>
            <Typography variant="caption" style={{ marginTop: SPACE.xs }}>{metric.label}</Typography>
          </View>
        ))}
      </View>
      <Typography variant="caption" style={{ marginTop: SPACE.lg }}>
        Goal progress and Goal Momentum are distinct: progress is the goal&apos;s completion value; Momentum reflects this week&apos;s consistency, progress evidence, reflection, and initiative.
      </Typography>
      <View style={{ backgroundColor: colors.background.card, borderRadius: RADIUS.md, marginTop: SPACE.xl, padding: SPACE.lg }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Typography variant="emphasis-sm">Goal Momentum</Typography>
            <Typography variant="caption" style={{ marginTop: SPACE.xs }}>
              {goalMomentum ? `${goalMomentum.status.charAt(0).toUpperCase()}${goalMomentum.status.slice(1)}` : momentum.isLoading ? 'Calculating…' : 'Unavailable'}
            </Typography>
            {goalMomentum ? (
              <Typography variant="caption" style={{ marginTop: SPACE.xs }}>
                This week · {goalMomentum.periodState}
              </Typography>
            ) : null}
          </View>
          <Typography variant="heading" style={{ color: accent.color }}>
            {goalMomentum?.displayedValue ?? '—'} / 100
          </Typography>
        </View>
        {goalMomentum?.history.length ? (
          <View style={{ marginTop: SPACE.lg }}>
            <MomentumTrendChart
              height={118}
              points={goalMomentum.history.map((point) => point.value)}
              xLabels={goalMomentum.history.map(() => '')}
              yDomainMax={100}
            />
          </View>
        ) : null}
        <Typography variant="caption" style={{ marginTop: SPACE.md }}>
          {goalMomentum?.reasons[0]?.message ?? momentum.error ?? 'Momentum V1.1 history will appear after calculation.'}
        </Typography>
      </View>
    </Surface>
  );
}

function InsightContextCard({ goal, items }: { goal: GoalWithDetails; items: readonly ActivityItem[] }) {
  const colors = useThemeColors();
  const dark = useUIStore((state) => state.themeMode) === 'dark';
  const insight = items.find((item) => item.kind === 'insight_confirmed');
  return (
    <View
      style={[
        {
          backgroundColor: colors.background.selectedRow,
          borderColor: colors.border.accent,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          overflow: 'hidden',
          padding: SPACE.xl,
        },
        elevationStyle('md', colors, dark),
      ]}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
        <Ionicons color={colors.text.accent} name="sparkles-outline" size={18} />
        <SectionHeading>OHARA INTELLIGENCE</SectionHeading>
      </View>
      {insight?.kind === 'insight_confirmed' ? (
        <>
          <Typography variant="title" style={{ marginTop: SPACE.xl }}>A confirmed insight from this journey.</Typography>
          <Typography variant="body" style={{ marginTop: SPACE.md }}>{insight.content}</Typography>
        </>
      ) : (
        <>
          <Typography variant="title" style={{ marginTop: SPACE.xl }}>No confirmed insight yet.</Typography>
          <Typography variant="body" style={{ marginTop: SPACE.md }}>
            {goal.latestBrtTags?.length
              ? `Recent reflection themes: ${goal.latestBrtTags.join(', ')}. These are context signals, not an AI conclusion.`
              : 'Keep reflecting and recording real activity. OHARA will not invent an interpretation before enough context exists.'}
          </Typography>
        </>
      )}
    </View>
  );
}

function RecommendationsContextCard({ goal }: { goal: GoalWithDetails }) {
  return (
    <Surface style={{ padding: SPACE.xl }} subtle>
      <SectionHeading>RECOMMENDATIONS</SectionHeading>
      <Typography variant="title" style={{ marginTop: SPACE.xl }}>No personalized recommendation yet.</Typography>
      <Typography variant="body" style={{ marginTop: SPACE.md }}>
        {goal.trackers.length || goal.milestones.length
          ? 'OHARA is collecting real milestone and tracker activity. Recommendations will appear only when a supported recommendation source is available.'
          : 'Add milestones, trackers, notes, or reflections to build the context needed for a useful recommendation.'}
      </Typography>
    </Surface>
  );
}

function LinkedContextCard({ entries, error, goalId }: { entries: readonly EntryRecord[]; error: string | null; goalId: string }) {
  const colors = useThemeColors();
  const note = entries.find((entry) => entry.entryType === 'note');
  const reflection = entries.find((entry) => entry.entryType === 'reflection');
  const recent = [note, reflection].filter((entry): entry is EntryRecord => Boolean(entry));
  return (
    <Surface style={{ padding: SPACE.xl }} subtle>
      <SectionHeading
        action={(
          <Pressable
            accessibilityLabel="Add a note"
            onPress={() => router.push('/(app)/entries?create=note')}
            style={{ alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }}
          >
            <Ionicons color={colors.text.primary} name="add" size={21} />
          </Pressable>
        )}
      >
        LINKED NOTES & REFLECTIONS
      </SectionHeading>
      <View style={{ marginTop: SPACE.lg }}>
        {error ? (
          <Typography variant="body">Linked context could not be loaded right now.</Typography>
        ) : recent.length ? (
          <EntriesList entries={recent} emptyCopy="" />
        ) : (
          <>
            <Typography variant="body">No note or reflection is explicitly linked to this goal yet.</Typography>
            <Pressable
              onPress={() => router.push({ pathname: '/(app)/entries/reflection', params: { goalId, type: 'goal' } })}
              style={{ marginTop: SPACE.lg, minHeight: 44, justifyContent: 'center' }}
            >
              <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Reflect on this goal →</Typography>
            </Pressable>
          </>
        )}
      </View>
    </Surface>
  );
}

function ContextRail({
  entries,
  entriesError,
  goal,
  items,
}: {
  entries: readonly EntryRecord[];
  entriesError: string | null;
  goal: GoalWithDetails;
  items: readonly ActivityItem[];
}) {
  return (
    <View style={{ gap: SPACE.xl, minWidth: 0 }}>
      <InsightContextCard goal={goal} items={items} />
      <GoalAnalyticsCard entries={entries} goal={goal} items={items} />
      <RecommendationsContextCard goal={goal} />
      <LinkedContextCard entries={entries} error={entriesError} goalId={goal.id} />
    </View>
  );
}

function SelectedGoalWorkspace({
  activityError,
  activityItems,
  activityLoading,
  entries,
  entriesError,
  goal,
  goalDetail,
  tab,
  onTabChange,
}: {
  activityError: string | null;
  activityItems: readonly ActivityItem[];
  activityLoading: boolean;
  entries: readonly EntryRecord[];
  entriesError: string | null;
  goal: GoalWithDetails;
  goalDetail: UseGoalDetailResult;
  onTabChange: (value: WorkspaceTab) => void;
  tab: WorkspaceTab;
}) {
  const colors = useThemeColors();
  const [projectPickerVisible, setProjectPickerVisible] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const projects = useProjectStore((state) => state.projects);
  const projectsLoading = useProjectStore((state) => state.isLoading);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const linkedEntries = entries.filter((entry) => entry.goals.some((linkedGoal) => linkedGoal.id === goal.id));
  const deadlineProgress = getGoalRingProgress(goal);
  const ended = deadlineProgress !== null && deadlineProgress >= 100;

  function openProjectPicker() {
    if (goal.has_successor) return;
    setProjectError(null);
    setProjectPickerVisible(true);
    void loadProjects();
  }

  async function saveProject(projectId: string | null) {
    setProjectSaving(true);
    setProjectError(null);
    const saved = await goalDetail.onUpdateProject(projectId);
    setProjectSaving(false);
    if (!saved) {
      setProjectError('Could not move this goal. Please try again.');
      return;
    }
    setProjectPickerVisible(false);
  }

  return (
    <>
      <GoalDetailHeader
        deadlineProgress={goal.progress}
        ended={ended}
        goal={goal}
        isMomentum={!goal.has_successor && goal.previous_goal_id !== null}
        isSuperseded={goal.has_successor}
        onArchive={goalDetail.onArchiveGoal}
        onComplete={goalDetail.onCompleteGoal}
        onOpenProjectPicker={openProjectPicker}
        onUpdateDescription={goalDetail.onUpdateDescription}
        successorGoalId={goal.successor?.id ?? null}
      />
      {goalDetail.goalError ? (
        <Surface style={{ backgroundColor: colors.feedback.danger.bg, borderColor: colors.feedback.danger.border, marginBottom: SPACE.lg, padding: SPACE.lg }} subtle>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
            <Typography variant="body" style={{ color: colors.feedback.danger.text, flex: 1 }}>{goalDetail.goalError}</Typography>
            <Pressable onPress={goalDetail.clearGoalError} style={{ justifyContent: 'center', minHeight: 44 }}>
              <Typography variant="emphasis-sm" style={{ color: colors.feedback.danger.text }}>Dismiss</Typography>
            </Pressable>
          </View>
        </Surface>
      ) : null}
      <DetailTabs onChange={onTabChange} value={tab} />
      <View style={{ marginTop: SPACE.xl }}>
        <GoalTabContent
          activityError={activityError}
          activityItems={activityItems}
          activityLoading={activityLoading}
          entriesError={entriesError}
          goal={goal}
          goalDetail={goalDetail}
          linkedEntries={linkedEntries}
          onTabChange={onTabChange}
          tab={tab}
        />
      </View>
      <GoalProjectPickerModal
        currentProjectId={goal.projectId}
        error={projectError}
        isLoading={projectsLoading}
        isSaving={projectSaving}
        onClose={() => setProjectPickerVisible(false)}
        onSave={saveProject}
        projects={projects}
        visible={projectPickerVisible}
      />
    </>
  );
}

function GoalEmptyState() {
  const colors = useThemeColors();
  return (
    <Surface style={{ alignItems: 'center', paddingHorizontal: SPACE['4xl'], paddingVertical: SPACE['6xl'] }}>
      <BrandIcon name="goals" size={42} color={colors.accent.primary} />
      <Typography variant="heading" style={{ fontSize: 28, marginTop: SPACE.xl, textAlign: 'center' }}>
        Begin a journey that matters.
      </Typography>
      <Typography variant="body" style={{ marginTop: SPACE.md, maxWidth: 520, textAlign: 'center' }}>
        Goals become more useful when they connect intention, reflection, and the next meaningful step.
      </Typography>
      <Button onPress={() => router.push('/goals/create')} style={{ marginTop: SPACE['3xl'] }}>
        Create your first Goal
      </Button>
    </Surface>
  );
}

export function GoalsWorkspace() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ goal?: string | string[]; selected?: string | string[] }>();
  const { width: windowWidth } = useWindowDimensions();
  const [workspaceWidth, setWorkspaceWidth] = useState(0);
  const responsiveWidth = workspaceWidth || windowWidth;
  const wide = responsiveWidth >= 1120;
  const tablet = responsiveWidth >= 680 && !wide;
  const compactHeader = responsiveWidth < 700;
  const { goals, isLoading } = useGoals();
  const selectedGoalId = useGoalStore((state) => state.selectedGoalId);
  const setSelectedGoalId = useGoalStore((state) => state.setSelectedGoalId);
  const routeSelected = getGoalWorkspaceSelection(params);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<GoalWorkspaceStatusFilter>('all');
  const [category, setCategory] = useState<GoalWithDetails['category'] | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [tab, setTab] = useState<WorkspaceTab>('overview');
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchEntries()
      .then((result) => {
        if (active) setEntries(result);
      })
      .catch(() => {
        if (active) setEntriesError('Linked entries could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading || goals.length === 0) return;
    const validRouteGoal = routeSelected && goals.some((goal) => goal.id === routeSelected)
      ? routeSelected
      : null;
    const validStoredGoal = selectedGoalId && goals.some((goal) => goal.id === selectedGoalId)
      ? selectedGoalId
      : null;
    const next = validRouteGoal ?? validStoredGoal ?? goals[0].id;
    if (selectedGoalId !== next) setSelectedGoalId(next);
  }, [goals, isLoading, routeSelected, selectedGoalId, setSelectedGoalId]);

  const categories = useMemo(
    () => [...new Set(goals.map((goal) => goal.category))].sort((left, right) => (
      getGoalCategoryLabel(left).localeCompare(getGoalCategoryLabel(right))
    )),
    [goals],
  );
  const filteredGoals = useMemo(
    () => filterGoalsForWorkspace(goals, query, status, category),
    [category, goals, query, status],
  );
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) ?? null;
  const selectedGoalDetail = useGoalDetail(selectedGoal?.id ?? '');
  const workspaceGoal = selectedGoalDetail.goal ?? selectedGoal;
  const selectedEntries = workspaceGoal
    ? entries.filter((entry) => entry.goals.some((linkedGoal) => linkedGoal.id === workspaceGoal.id))
    : [];
  const selectedActivity = useActivity(workspaceGoal?.id ?? '');

  function selectGoal(goalId: string) {
    setSelectedGoalId(goalId);
    setTab('overview');
    router.setParams({ goal: goalId } as never);
  }

  return (
    <AuthenticatedPageShell>
      <View
        onLayout={(event) => setWorkspaceWidth(event.nativeEvent.layout.width)}
        style={{ gap: SPACE['3xl'] }}
      >
        <GoalsHeader
          compact={compactHeader}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((open) => !open)}
          query={query}
          setQuery={setQuery}
        />

        {isLoading ? (
          <Surface style={{ alignItems: 'center', justifyContent: 'center', minHeight: 420 }}>
            <ActivityIndicator color={colors.accent.primary} size="large" />
            <Typography variant="body" style={{ marginTop: SPACE.xl }}>Loading your Goals…</Typography>
          </Surface>
        ) : goals.length === 0 ? (
          <GoalEmptyState />
        ) : wide ? (
          <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.xl }}>
            <View style={{ flex: 0.82, gap: SPACE.lg, minWidth: 300 }}>
              <GoalList
                categories={categories}
                category={category}
                filterOpen={filterOpen}
                goals={filteredGoals}
                onCategoryChange={setCategory}
                onSelect={selectGoal}
                onStatusChange={setStatus}
                selectedGoalId={selectedGoalId}
                status={status}
              />
            </View>
            <View style={{ flex: 1.48, minWidth: 0 }}>
              {workspaceGoal ? (
                <SelectedGoalWorkspace
                  activityError={selectedActivity.error}
                  activityItems={selectedActivity.items}
                  activityLoading={selectedActivity.loading}
                  entries={entries}
                  entriesError={entriesError}
                  goal={workspaceGoal}
                  goalDetail={selectedGoalDetail}
                  onTabChange={setTab}
                  tab={tab}
                />
              ) : null}
            </View>
            <View style={{ flex: 0.9, minWidth: 280 }}>
              {workspaceGoal ? (
                <ContextRail
                  entries={selectedEntries}
                  entriesError={entriesError}
                  goal={workspaceGoal}
                  items={selectedActivity.items}
                />
              ) : null}
            </View>
          </View>
        ) : tablet ? (
          <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.xl }}>
            <View style={{ flex: 0.8, minWidth: 280 }}>
              <GoalList
                categories={categories}
                category={category}
                filterOpen={filterOpen}
                goals={filteredGoals}
                onCategoryChange={setCategory}
                onSelect={selectGoal}
                onStatusChange={setStatus}
                selectedGoalId={selectedGoalId}
                status={status}
              />
            </View>
            <View style={{ flex: 1.35, gap: SPACE.xl, minWidth: 0 }}>
              {workspaceGoal ? (
                <>
                  <SelectedGoalWorkspace
                    activityError={selectedActivity.error}
                    activityItems={selectedActivity.items}
                    activityLoading={selectedActivity.loading}
                    entries={entries}
                    entriesError={entriesError}
                    goal={workspaceGoal}
                    goalDetail={selectedGoalDetail}
                    onTabChange={setTab}
                    tab={tab}
                  />
                  <ContextRail
                    entries={selectedEntries}
                    entriesError={entriesError}
                    goal={workspaceGoal}
                    items={selectedActivity.items}
                  />
                </>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={{ gap: SPACE.xl }}>
            <GoalList
              categories={categories}
              category={category}
              filterOpen={filterOpen}
              goals={filteredGoals}
              onCategoryChange={setCategory}
              onSelect={selectGoal}
              onStatusChange={setStatus}
              selectedGoalId={selectedGoalId}
              status={status}
            />
            {workspaceGoal ? (
              <>
                <SelectedGoalWorkspace
                  activityError={selectedActivity.error}
                  activityItems={selectedActivity.items}
                  activityLoading={selectedActivity.loading}
                  entries={entries}
                  entriesError={entriesError}
                  goal={workspaceGoal}
                  goalDetail={selectedGoalDetail}
                  onTabChange={setTab}
                  tab={tab}
                />
                <ContextRail
                  entries={selectedEntries}
                  entriesError={entriesError}
                  goal={workspaceGoal}
                  items={selectedActivity.items}
                />
              </>
            ) : null}
          </View>
        )}
      </View>
    </AuthenticatedPageShell>
  );
}
