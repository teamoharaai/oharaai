import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';

import { AuthenticatedPageShell, useScrollToPageContent } from '@/components/layout/AuthenticatedPageShell';
import { AnchoredPopover, type AnchorRect } from '@/components/ui/AnchoredPopover';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { elevationStyle, RADIUS, SPACE, TYPE } from '@/constants/design';
import { getCategoryAccentTheme } from '@/constants/themes';
import { fetchEntries } from '@/features/entries/services/entry-service';
import type { EntryRecord } from '@/features/entries/types';
import { useProjectStore } from '@/features/projects/store';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { useGoalMomentumSummary } from '@/features/momentum/hooks/useMomentumHomeSummary';
import { MomentumTrendChart } from '@/features/momentum/components/MomentumTrendChart';
import { TasksPanel } from '@/features/tasks/components/TasksPanel';
import { useDeadlineDensity } from '../hooks/useDeadlineDensity';
import { SharedGoalsPreview } from './SharedGoalsPreview';
import { GoalActivityPanel } from './GoalActivityPanel';
import { useGoalActivityWindow } from '../hooks/useGoalActivityWindow';
import type { ActivityItem } from '@/types/activity';
import {
  filterGoalsForWorkspace,
  recentWorkspaceGoals,
  getGoalCategoryLabel,
  getGoalStatusLabel,
  getNextGoalMilestone,
  goalMatchesWorkspaceStatus,
  workspaceStatusToGoalStatus,
  type GoalWorkspaceStatusFilter,
} from '../goals-workspace';
import { getGoalWorkspaceSelection } from '../navigation';
import { useActivity } from '../hooks/useActivity';
import { useGoalDetail, type UseGoalDetailResult } from '../hooks/useGoalDetail';
import { useGoals } from '../hooks/useGoals';
import { useGoalStore } from '../store';
import type { GoalMilestone, GoalWithDetails } from '../types';
import { getGoalRingProgress } from '../utils/ringProgress';
import { GoalVault } from './GoalVault';
import { GoalDetailHeader } from './GoalDetailHeader';
import { GoalProjectPickerModal } from './GoalProjectPickerModal';
import { MilestonesPanel } from './MilestonesPanel';
import { StickyNotesPanel } from './StickyNotesPanel';

type WorkspaceTab = 'overview' | 'vault';

const STATUS_OPTIONS: ReadonlyArray<{ label: string; value: GoalWorkspaceStatusFilter }> = [
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Expired', value: 'expired' },
  { label: 'Archive', value: 'archived' },
  { label: 'Paused', value: 'paused' },
];

// The goal-list rail is narrow, so only the two primary filters stay as always-
// visible chips; the rest collapse behind a single overflow pill (the "third"
// slot) that pops out the remaining choices. The pill reflects the active
// overflow filter when one is selected so the current view is never hidden.
const PRIMARY_STATUS_OPTIONS = STATUS_OPTIONS.slice(0, 2);
const OVERFLOW_STATUS_OPTIONS = STATUS_OPTIONS.slice(2);

const DETAIL_TABS: ReadonlyArray<{ label: string; value: WorkspaceTab }> = [
  { label: 'Overview', value: 'overview' },
  { label: 'Vault', value: 'vault' },
];

function formatDate(date: Date | null, fallback = 'Not set'): string {
  if (!date || Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
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
      style={({ hovered, pressed }) => ({
        alignItems: 'center',
        backgroundColor: primary
          ? hovered || pressed ? colors.accent.primaryHover : colors.accent.primary
          : hovered ? colors.background.subtle : colors.background.card,
        borderColor: primary
          ? hovered || pressed ? colors.accent.primaryHover : colors.accent.primary
          : colors.border.input,
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
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
          <BrandIcon name="goals" size={28} color={colors.accent.primary} />
          <Typography accessibilityRole="header" variant="heading">
            Goals
          </Typography>
        </View>
        <Typography variant="card-title" style={{ marginTop: SPACE.md }}>
          Your journeys, your becoming.
        </Typography>
        <Typography variant="body-small" style={{ marginTop: SPACE.xs }}>
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
              ...TYPE.control,
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

function StatusChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
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
        {label}
      </Typography>
    </Pressable>
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const pillRef = useRef<View | null>(null);

  const activeOverflow = OVERFLOW_STATUS_OPTIONS.find((option) => option.value === value) ?? null;
  const overflowSelected = activeOverflow !== null;
  // Pill mirrors the active overflow filter when one is on; otherwise it's a
  // neutral "More" affordance.
  const pillLabel = activeOverflow?.label ?? 'More';

  function openMenu() {
    const node = pillRef.current as
      | (View & {
          measureInWindow?: (
            callback: (x: number, y: number, width: number, height: number) => void,
          ) => void;
        })
      | null;
    if (node?.measureInWindow) {
      node.measureInWindow((x, y, width, height) => {
        setAnchorRect({ x, y, width, height, top: y, left: x, right: x + width, bottom: y + height });
        setMenuOpen(true);
      });
      return;
    }
    setMenuOpen(true);
  }

  function selectOverflow(next: GoalWorkspaceStatusFilter) {
    setMenuOpen(false);
    onChange(next);
  }

  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
      {PRIMARY_STATUS_OPTIONS.map((option) => (
        <StatusChip
          key={option.value}
          label={option.label}
          onPress={() => onChange(option.value)}
          selected={option.value === value}
        />
      ))}

      <View collapsable={false} ref={pillRef}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More goal filters"
          accessibilityState={{ expanded: menuOpen, selected: overflowSelected }}
          onPress={openMenu}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: overflowSelected ? colors.background.selectedRow : colors.background.input,
            borderRadius: RADIUS.round,
            flexDirection: 'row',
            gap: SPACE.sm,
            justifyContent: 'center',
            minHeight: 36,
            minWidth: 60,
            opacity: pressed ? 0.7 : 1,
            paddingHorizontal: SPACE.lg,
          })}
        >
          <Typography variant="caption" style={{ color: overflowSelected ? colors.text.accent : colors.text.secondary }}>
            {pillLabel}
          </Typography>
          <Ionicons
            color={overflowSelected ? colors.text.accent : colors.text.secondary}
            name="chevron-down"
            size={13}
          />
        </Pressable>
      </View>

      <AnchoredPopover
        anchorRect={anchorRect}
        onDismiss={() => setMenuOpen(false)}
        visible={menuOpen}
        contentStyle={{ minWidth: 160, paddingVertical: SPACE.sm }}
      >
        {OVERFLOW_STATUS_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              accessibilityRole="menuitem"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => selectOverflow(option.value)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed || selected ? colors.background.selectedRow : 'transparent',
                flexDirection: 'row',
                gap: SPACE.md,
                justifyContent: 'space-between',
                minHeight: 44,
                paddingHorizontal: SPACE.lg,
              })}
            >
              <Typography variant="caption" style={{ color: selected ? colors.text.accent : colors.text.primary }}>
                {option.label}
              </Typography>
              {selected ? <Ionicons color={colors.text.accent} name="checkmark" size={14} /> : null}
            </Pressable>
          );
        })}
      </AnchoredPopover>
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
    <View
      style={{
        borderTopColor: colors.border.divider,
        borderTopWidth: 0,
        marginTop: SPACE.lg,
        paddingTop: SPACE.lg,
      }}
    >
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
    </View>
  );
}

function GoalListCard({ goal, onSelect, selected }: {
  goal: GoalWithDetails; onSelect: () => void; selected: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable accessibilityLabel={`Select ${goal.title}`} accessibilityRole="button"
      accessibilityState={{ selected }} onPress={onSelect}
      style={({ pressed }) => ({
        backgroundColor: selected ? colors.background.selectedRow : 'transparent',
        borderLeftColor: selected ? colors.accent.primary : 'transparent',
        borderLeftWidth: 3, padding: SPACE.lg, opacity: pressed ? 0.7 : 1,
      })}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
        <CategoryGlyph goal={goal} size={32} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Typography numberOfLines={2} variant="emphasis-sm">{goal.title}</Typography>
          <Typography variant="caption" style={{ marginTop: 3 }}>
            {getGoalCategoryLabel(goal.category)} · {getGoalStatusLabel(goal.status)}
          </Typography>
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
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const [compactOpen, setCompactOpen] = useState(false);
  const browsing = expanded || filterOpen;
  const visits = useGoalStore((state) => state.recentGoalVisits);
  const recent = recentWorkspaceGoals(goals, visits, selectedGoalId);
  const visible = browsing ? goals : recent;
  const collapsed = width < 1000 && !compactOpen && !browsing;
  return (
    <View style={{ gap: SPACE.xl }}>
    <Surface style={{ minWidth: 0, overflow: 'hidden' }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: !collapsed }}
        onPress={() => setCompactOpen((value) => !value)}
        disabled={width >= 1000} style={{ padding: SPACE.xl }}>
        <Typography variant="title">{browsing ? 'All Goals' : 'Recent Goals'}</Typography>
        {collapsed ? <Typography variant="caption" style={{ marginTop: SPACE.sm }}>Switch Goal ↓</Typography> : null}
      </Pressable>
      {browsing ? <View style={{ padding: SPACE.xl, paddingTop: 0 }}>
        <GoalStatusTabs onChange={onStatusChange} value={status} />
        {filterOpen ? (
          <CategoryFilters categories={categories} onChange={onCategoryChange} value={category} />
        ) : null}
      </View> : null}

      {!collapsed ? visible.length ? visible.map((goal) => (
        <GoalListCard
          goal={goal}
          key={goal.id}
          onSelect={() => onSelect(goal.id)}
          selected={selectedGoalId === goal.id}
        />
      )) : (
        <View
          style={{
            alignItems: 'center',
            borderTopColor: colors.border.divider,
            borderTopWidth: 1,
            paddingHorizontal: SPACE['3xl'],
            paddingVertical: SPACE['5xl'],
          }}
        >
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
        </View>
      ) : null}
      {!collapsed ? <Pressable accessibilityRole="button" onPress={() => setExpanded((value) => !value)}
        style={{ padding: SPACE.xl, minHeight: 44 }}>
        <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
          {expanded ? 'Show recent Goals ↑' : 'View all Goals →'}
        </Typography>
      </Pressable> : null}
    </Surface>
    {!collapsed ? <Surface><SharedGoalsPreview /></Surface> : null}
    </View>
  );
}

function DetailTabs({ onChange, value }: { onChange: (value: WorkspaceTab) => void; value: WorkspaceTab }) {
  const colors = useThemeColors();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        borderTopColor: colors.border.divider,
        borderTopWidth: 0,
        borderBottomColor: colors.border.divider,
        borderBottomWidth: 0,
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: SPACE.lg,
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
            <Typography variant={selected ? "emphasis-sm" : "body"} style={{ color: selected ? colors.text.accent : colors.text.secondary }}>
              {tab.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

function WorkspaceSection({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  return (
    <View style={{ paddingHorizontal: width < 560 ? SPACE.xl : SPACE['3xl'], paddingVertical: SPACE.lg }}>
      {children}
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
    <View>
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
  tab,
}: {
  activityError: string | null;
  activityItems: readonly ActivityItem[];
  activityLoading: boolean;
  entriesError: string | null;
  goal: GoalWithDetails;
  goalDetail: UseGoalDetailResult;
  linkedEntries: readonly EntryRecord[];
  tab: WorkspaceTab;
}) {
  const colors = useThemeColors();
  const { density: deadlineDensity } = useDeadlineDensity();
  const [allTasks, setAllTasks] = useState(false);
  const next = getNextGoalMilestone(goal.milestones);
  const milestoneRef = useRef<View>(null);
  const scrollToContent = useScrollToPageContent();
  const { width } = useWindowDimensions();
  if (tab === 'vault') return (
    <Surface><GoalVault key={goal.id} goal={goal} entries={linkedEntries} entriesError={entriesError}
      privateNotes={<StickyNotesPanel embedded notes={goal.notes} error={goalDetail.noteError}
        onAdd={goalDetail.onAddNote} onSave={goalDetail.onSaveNote} onDelete={goalDetail.onDeleteNote}
        onAttachPhoto={goalDetail.onAttachNotePhoto} onDismissError={goalDetail.clearNoteError}
        resolvePhotoUrl={goalDetail.resolveNotePhotoUrl}
        readOnly={goal.has_successor || goal.status === 'complete' || goal.status === 'archived'} />}
      activityItems={activityItems} activityLoading={activityLoading} activityError={activityError} /></Surface>
  );
  const deadlineProgress = getGoalRingProgress(goal);
  const ended = deadlineProgress !== null && deadlineProgress >= 100;
  return (
    <View style={{ gap: SPACE.xl }}>
      <Surface>
      <TasksPanel deadlineDensity={deadlineDensity} full={allTasks} goalId={goal.id} goalStatus={goal.status}
        milestones={goal.milestones} onSeeAll={() => setAllTasks(true)} />
      {allTasks ? <Pressable accessibilityRole="button" onPress={() => setAllTasks(false)}
        style={{ paddingHorizontal: SPACE['3xl'], minHeight: 44 }}>
        <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Show fewer Tasks ↑</Typography>
      </Pressable> : null}
      <WorkspaceSection>
        <NextStepCard goal={goal} milestone={next} onOpen={() => {
          if (Platform.OS === 'web') (milestoneRef.current as unknown as HTMLElement)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
          else scrollToContent(milestoneRef.current);
        }} />
      </WorkspaceSection>
      </Surface>
      <View ref={milestoneRef} collapsable={false}>
      <Surface>
      <View style={{ padding: width < 560 ? SPACE.xl : SPACE['3xl'] }}>
        <MilestonesPanel deadlineDensity={deadlineDensity} archived={goal.status === 'archived'}
          completingIds={goalDetail.completingMilestoneIds} embedded
          ended={ended || goal.status === 'complete'} error={goalDetail.milestoneError}
          hasSuccessor={goal.has_successor} milestones={goal.milestones}
          onAdd={goalDetail.onAddMilestone} onAttachPhoto={goalDetail.onAttachMilestonePhoto}
          onComplete={goalDetail.onCompleteMilestone} onDelete={goalDetail.onDeleteMilestone}
          onDismissError={goalDetail.clearMilestoneError} onSave={goalDetail.onSaveMilestone}
          resolvePhotoUrl={goalDetail.resolveMilestonePhotoUrl} />
      </View>
      </Surface>
      </View>
    </View>
  );
}

function GoalAnalyticsCard({ goal }: { goal: GoalWithDetails }) {
  const colors = useThemeColors();
  const activity = useGoalActivityWindow(goal.id, 70);
  const momentum = useGoalMomentumSummary(goal.id);
  const summary = momentum.goalSummary;
  return (
    <View style={{ padding: SPACE.xl, gap: SPACE.lg }}>
      <Typography variant="title">Momentum</Typography>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: SPACE.md }}>
        <Typography variant="body">{summary?.status ?? (momentum.isLoading ? 'Calculating…' : 'Unavailable')}</Typography>
        <Typography variant="heading" style={{ color: colors.text.accent }}>{summary?.displayedValue ?? '—'} / 100</Typography>
      </View>
      <Typography variant="caption">This week · {summary?.periodState ?? 'provisional'}</Typography>
      <View style={{ paddingVertical: SPACE.lg, gap: SPACE.lg }}>
        <SectionHeading>ACTIVITY</SectionHeading>
        {activity.error ? <Typography variant="body">Activity could not be loaded.</Typography> :
          <GoalActivityPanel buckets={activity.buckets} loading={activity.loading} />}
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border.divider, paddingTop: SPACE['3xl'], gap: SPACE.lg }}>
      <SectionHeading>MOMENTUM TREND</SectionHeading>
      {summary?.history.length ? <MomentumTrendChart height={287} fitHeight
        points={summary.history.map((point) => point.value)}
        xLabels={summary.history.map((point, index, all) => (
          index === 0 || index === all.length - 1 ? new Date(point.periodStart.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
        ))} yDomainMax={100} /> : null}
      <Typography variant="body">{summary?.reasons[0]?.message ?? momentum.error ?? 'Momentum history will appear after calculation.'}</Typography>
      </View>
    </View>
  );
}

function InsightContextCard({ goal, items }: { goal: GoalWithDetails; items: readonly ActivityItem[] }) {
  const colors = useThemeColors();
  const insight = items.find((item) => item.kind === 'insight_confirmed');
  return (
    <View
      style={{
        backgroundColor: colors.background.selectedRow,
        padding: SPACE.xl,
      }}
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

function ContextRail({
  goal,
  items,
}: {
  goal: GoalWithDetails;
  items: readonly ActivityItem[];
}) {
  return (
    <View style={{ gap: SPACE.xl }}>
      <Typography variant="eyebrow" style={{ paddingHorizontal: SPACE.xl }}>Goal Analytics</Typography>
      <Surface style={{ overflow: 'hidden' }}><InsightContextCard goal={goal} items={items} /></Surface>
      <Surface><GoalAnalyticsCard goal={goal} /></Surface>
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
  const { density: deadlineDensity } = useDeadlineDensity();
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
      <View style={{ gap: SPACE.xl, minWidth: 0 }}>
        <Surface style={{ minWidth: 0 }}>
          <GoalDetailHeader
            deadlineDensity={deadlineDensity}
          deadlineProgress={goal.progress}
          embedded
          ended={ended}
          goal={goal}
          isMomentum={!goal.has_successor && goal.previous_goal_id !== null}
          isSuperseded={goal.has_successor}
          onArchive={goalDetail.onArchiveGoal}
          onComplete={goalDetail.onCompleteGoal}
          onOpenProjectPicker={openProjectPicker}
          onUpdateDeadline={goalDetail.onUpdateDeadline}
          onUpdateDescription={goalDetail.onUpdateDescription}
          successorGoalId={goal.successor?.id ?? null}
        />
        {goalDetail.goalError ? (
          <View
            style={{
              backgroundColor: colors.feedback.danger.bg,
              borderColor: colors.feedback.danger.border,
              borderRadius: RADIUS.md,
              borderWidth: 1,
              marginBottom: SPACE.lg,
              marginHorizontal: SPACE['3xl'],
              padding: SPACE.lg,
            }}
          >
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
              <Typography variant="body" style={{ color: colors.feedback.danger.text, flex: 1 }}>{goalDetail.goalError}</Typography>
              <Pressable onPress={goalDetail.clearGoalError} style={{ justifyContent: 'center', minHeight: 44 }}>
                <Typography variant="emphasis-sm" style={{ color: colors.feedback.danger.text }}>Dismiss</Typography>
              </Pressable>
            </View>
          </View>
        ) : null}
        </Surface>
        <DetailTabs onChange={onTabChange} value={tab} />
          <GoalTabContent
            key={goal.id}
            activityError={activityError}
            activityItems={activityItems}
            activityLoading={activityLoading}
            entriesError={entriesError}
            goal={goal}
            goalDetail={goalDetail}
            linkedEntries={linkedEntries}
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

function GoalEmptyState({ status }: { status: GoalWorkspaceStatusFilter }) {
  const colors = useThemeColors();
  const historical = status !== 'active';
  return (
    <Surface style={{ alignItems: 'center', paddingHorizontal: SPACE['4xl'], paddingVertical: SPACE['6xl'] }}>
      <BrandIcon name="goals" size={42} color={colors.accent.primary} />
      <Typography variant="heading" style={{ fontSize: 28, marginTop: SPACE.xl, textAlign: 'center' }}>
        {historical ? `No ${status === 'completed' ? 'completed' : status} Goals yet.` : 'Begin a journey that matters.'}
      </Typography>
      <Typography variant="body" style={{ marginTop: SPACE.md, maxWidth: 520, textAlign: 'center' }}>
        {historical
          ? 'Goals will remain available here when they enter this lifecycle state.'
          : 'Goals become more useful when they connect intention, reflection, and the next meaningful step.'}
      </Typography>
      {!historical ? (
        <Button onPress={() => router.push('/goals/create')} style={{ marginTop: SPACE['3xl'] }}>
          Create your first Goal
        </Button>
      ) : null}
    </Surface>
  );
}

export function GoalsWorkspace() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{
    goal?: string | string[];
    selected?: string | string[];
    status?: string | string[];
  }>();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [workspaceWidth, setWorkspaceWidth] = useState(0);
  const responsiveWidth = workspaceWidth || windowWidth;
  const wide = responsiveWidth >= 1120;
  const tablet = responsiveWidth >= 1000 && !wide;
  const compactHeader = responsiveWidth < 700;
  // Side-by-side layouts: pin the goal-list rail and give it its own scroll
  // ("scrollable roll") so a long list rolls internally instead of stretching
  // the page, while the center panel keeps scrolling the whole page. Web-only —
  // sticky/overflow-y have no native equivalent, and the stacked narrow layout
  // shouldn't cap the list height.
  const stickyRail: StyleProp<ViewStyle> = Platform.OS === 'web'
    ? ({ position: 'sticky', top: SPACE.lg, maxHeight: windowHeight - SPACE.lg * 2, overflowY: 'auto' } as unknown as ViewStyle)
    : null;
  const requestedStatus = Array.isArray(params.status) ? params.status[0] : params.status;
  const [status, setStatus] = useState<GoalWorkspaceStatusFilter>(() => (
    STATUS_OPTIONS.some((option) => option.value === requestedStatus)
      ? requestedStatus as GoalWorkspaceStatusFilter
      : 'active'
  ));
  const { goals, isLoading } = useGoals({ status: workspaceStatusToGoalStatus(status) });
  const selectedGoalId = useGoalStore((state) => state.selectedGoalId);
  const setSelectedGoalId = useGoalStore((state) => state.setSelectedGoalId);
  const routeSelected = getGoalWorkspaceSelection(params);
  const [query, setQuery] = useState('');
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
    const statusGoals = goals.filter((goal) => goalMatchesWorkspaceStatus(goal, status));
    if (isLoading) return;
    if (statusGoals.length === 0) {
      if (selectedGoalId !== null) setSelectedGoalId(null);
      return;
    }
    const validRouteGoal = routeSelected && statusGoals.some((goal) => goal.id === routeSelected)
      ? routeSelected
      : null;
    const validStoredGoal = selectedGoalId && statusGoals.some((goal) => goal.id === selectedGoalId)
      ? selectedGoalId
      : null;
    const next = validRouteGoal ?? validStoredGoal ?? statusGoals[0].id;
    if (selectedGoalId !== next) setSelectedGoalId(next);
  }, [goals, isLoading, routeSelected, selectedGoalId, setSelectedGoalId, status]);

  const statusGoals = useMemo(
    () => goals.filter((goal) => goalMatchesWorkspaceStatus(goal, status)),
    [goals, status],
  );

  const categories = useMemo(
    () => [...new Set(statusGoals.map((goal) => goal.category))].sort((left, right) => (
      getGoalCategoryLabel(left).localeCompare(getGoalCategoryLabel(right))
    )),
    [statusGoals],
  );
  const filteredGoals = useMemo(
    () => filterGoalsForWorkspace(goals, query, status, category),
    [category, goals, query, status],
  );
  const selectedGoal = statusGoals.find((goal) => goal.id === selectedGoalId) ?? null;
  const selectedGoalDetail = useGoalDetail(selectedGoal?.id ?? '');
  const workspaceGoal = selectedGoalDetail.goal ?? selectedGoal;
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
        ) : statusGoals.length === 0 ? (
          <View style={{ gap: SPACE.lg }}>
            <Surface style={{ paddingHorizontal: SPACE['3xl'], paddingVertical: SPACE.xl }}>
              <GoalStatusTabs onChange={setStatus} value={status} />
            </Surface>
            <GoalEmptyState status={status} />
          </View>
        ) : wide ? (
          <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.xl }}>
            <View style={[{ flex: 0.65, gap: SPACE.lg, minWidth: 220 }, stickyRail]}>
              <GoalList
                categories={categories}
                category={category}
                filterOpen={filterOpen || Boolean(query.trim())}
                goals={filteredGoals}
                onCategoryChange={setCategory}
                onSelect={selectGoal}
                onStatusChange={setStatus}
                selectedGoalId={selectedGoalId}
                status={status}
              />
            </View>
            <View style={{ flex: 1.7, minWidth: 0 }}>
              {workspaceGoal ? (
                <SelectedGoalWorkspace
                  key={workspaceGoal.id}
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
            <View style={{ flex: 0.85, minWidth: 270 }}>
              {workspaceGoal ? (
                <ContextRail
                  goal={workspaceGoal}
                  items={selectedActivity.items}
                />
              ) : null}
            </View>
          </View>
        ) : tablet ? (
          <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.xl }}>
            <View style={[{ flex: 0.8, minWidth: 280 }, stickyRail]}>
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
                  key={workspaceGoal.id}
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
              filterOpen={filterOpen || Boolean(query.trim())}
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
                  key={workspaceGoal.id}
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
