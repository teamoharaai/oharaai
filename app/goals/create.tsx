import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '@/components/layout/AppHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DatePicker } from '@/components/ui/DatePicker';
import {
  GoalCreationModeToggle,
  type GoalCreationMode,
} from '@/components/ui/GoalCreationModeToggle';
import { Toast } from '@/components/ui/Toast';
import { Toggle } from '@/components/ui/Toggle';
import { Typography } from '@/components/ui/Typography';
import {
  CATEGORY_ACCENT_THEME,
  type CategoryAccentTheme,
} from '@/constants/themes';
import {
  GOAL_CREATION_MAX_ACTIVE_TRACKERS,
  GOAL_CREATION_REASON_MAX_LENGTH,
  type GoalCreationWizardMilestone,
  type GoalCreationWizardTracker,
  useGoalCreationWizard,
} from '@/features/goals/hooks/useGoalCreationWizard';
import { AIGoalCreation } from '@/features/goals/components/AIGoalCreation';
import { fetchGoalById } from '@/features/goals/services/goal-service';
import { useGoalStore } from '@/features/goals/store';
import { goalWorkspaceHref } from '@/features/goals/navigation';
import { useProjectStore } from '@/features/projects/store';
import { authedFetch } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/contracts';
import type {
  CreateGoalWithMilestonesAndTrackersResult,
  ManualGoalCreationInput,
} from '@/lib/db/goals';
import {
  GOAL_CREATION_CATEGORIES,
  GOAL_TRACKER_TYPES,
  type GoalCreationCategory,
  type GoalTrackerType,
} from '@/lib/goals/schema';
import {
  getGoalCreationTemplate,
  type GoalCreationDeadlinePreset,
} from '@/lib/goals/templates';
import { useThemeColors, useUIStore } from '@/store/uiStore';

const STEP_LABELS = ['Start', 'Details', 'Tracking', 'Confirm'] as const;
const DEADLINE_PRESETS = ['30', '60', '90', 'custom'] as const;
const TRACKER_TYPE_LABELS: Record<GoalTrackerType, string> = {
  habit: 'Habit',
  counter: 'Counter',
  checklist: 'Checklist',
};

type UndoState =
  | { kind: 'milestone'; item: GoalCreationWizardMilestone; index: number }
  | { kind: 'tracker'; item: GoalCreationWizardTracker; index: number };

function dateValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function tomorrowValue(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateValue(tomorrow);
}

function formatDate(value: string | null): string {
  if (!value) return 'Pick a date';
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return 'Pick a date';
  return parsed.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(value: string | null): number {
  if (!value) return 0;
  const [year, month, day] = value.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86_400_000));
}

function presetDeadline(preset: GoalCreationDeadlinePreset): string | null {
  if (preset === 'custom') return null;
  const value = new Date();
  value.setDate(value.getDate() + Number(preset));
  return dateValue(value);
}

function trackerTypeColor(type: GoalTrackerType, accent: CategoryAccentTheme) {
  if (type === 'counter') return { backgroundColor: '#F6EBD3', color: '#B4892E' };
  if (type === 'checklist') return { backgroundColor: '#F0E7FA', color: '#7C43C4' };
  return { backgroundColor: accent.tint, color: accent.mid };
}

function nextTrackerType(type: GoalTrackerType): GoalTrackerType {
  const index = GOAL_TRACKER_TYPES.indexOf(type);
  return GOAL_TRACKER_TYPES[(index + 1) % GOAL_TRACKER_TYPES.length];
}

function SectionIntro({
  accent,
  eyebrow,
  title,
  description,
}: {
  accent: CategoryAccentTheme;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <View style={{ alignItems: 'center', marginBottom: 20 }}>
      <Typography
        variant="eyebrow"
        style={{
          color: accent.mid,
          fontFamily: 'Inter-SemiBold',
          letterSpacing: 2,
          marginBottom: 8,
        }}
      >
        {eyebrow}
      </Typography>
      <Typography
        variant="heading"
        style={{
          fontFamily: 'Inter-SemiBold',
          fontSize: 30,
          letterSpacing: -0.4,
          lineHeight: 36,
          textAlign: 'center',
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body"
        style={{ fontSize: 14.5, lineHeight: 21, marginTop: 6, textAlign: 'center' }}
      >
        {description}
      </Typography>
    </View>
  );
}

function CategoryBadge({
  accent,
  label,
  darkMode,
}: {
  accent: CategoryAccentTheme;
  label: string;
  darkMode: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: darkMode ? colors.background.input : accent.tint,
        borderRadius: 999,
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 5,
      }}
    >
      <View style={{ backgroundColor: accent.color, borderRadius: 3, height: 6, width: 6 }} />
      <Typography
        variant="badge-text"
        style={{ color: darkMode ? colors.text.primary : accent.mid, fontFamily: 'Inter-SemiBold' }}
      >
        {label}
      </Typography>
    </View>
  );
}

function AccentButton({
  accent,
  children,
  disabled,
  loading,
  onPress,
  style,
}: {
  accent: CategoryAccentTheme;
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Button
      disabled={disabled}
      loading={loading}
      onPress={onPress}
      style={[
        {
          backgroundColor: accent.color,
          borderColor: accent.color,
          shadowColor: accent.color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
        },
        style,
      ]}
    >
      {children}
    </Button>
  );
}

function ManualTextInput({
  multiline = false,
  style,
  ...props
}: TextInputProps) {
  const colors = useThemeColors();
  const themeMode = useUIStore((current) => current.themeMode);
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      multiline={multiline}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      placeholderTextColor={colors.text.muted}
      style={[
        {
          backgroundColor: colors.background.card,
          borderColor: focused ? colors.accent.primary : colors.border.input,
          borderRadius: 14,
          borderWidth: focused ? 2 : 1,
          color: colors.text.primary,
          fontFamily: 'Inter-Regular',
          fontSize: 14,
          minHeight: multiline ? 76 : 44,
          outlineColor: 'transparent',
          outlineStyle: 'solid',
          outlineWidth: 0,
          paddingHorizontal: focused ? 13 : 14,
          paddingVertical: multiline ? 12 : 10,
          shadowColor: colors.text.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: themeMode === 'dark' ? 0 : focused ? 0.07 : 0.035,
          shadowRadius: focused ? 10 : 6,
          textAlignVertical: multiline ? 'top' : 'center',
        },
        style,
      ]}
      {...props}
    />
  );
}

const TextField = ManualTextInput;

export default function GoalCreateScreen() {
  const colors = useThemeColors();
  const themeMode = useUIStore((current) => current.themeMode);
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const showSidebar = width >= 900;
  const { projectId: incomingProjectId } = useLocalSearchParams<{ projectId?: string }>();
  const initialProjectId = typeof incomingProjectId === 'string' ? incomingProjectId : null;
  const wizardOptions = useMemo(() => ({ initialProjectId }), [initialProjectId]);
  const wizard = useGoalCreationWizard(wizardOptions);
  const projects = useProjectStore((current) => current.projects);
  const loadProjects = useProjectStore((current) => current.loadProjects);
  const upsertGoal = useGoalStore((current) => current.upsertGoal);
  const accent = CATEGORY_ACCENT_THEME[wizard.category];
  const darkMode = themeMode === 'dark';
  const pageBackground = darkMode ? colors.background.page : accent.pageBg;

  const [creationMode, setCreationMode] = useState<GoalCreationMode>('manual');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [expandedMilestones, setExpandedMilestones] = useState<string[]>([]);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneWeek, setNewMilestoneWeek] = useState('');
  const [newMilestoneWhy, setNewMilestoneWhy] = useState('');
  const [addingTracker, setAddingTracker] = useState(false);
  const [newTrackerTitle, setNewTrackerTitle] = useState('');
  const [newTrackerType, setNewTrackerType] = useState<GoalTrackerType>('habit');
  const [newTrackerTarget, setNewTrackerTarget] = useState('1');
  const [newTrackerUnit, setNewTrackerUnit] = useState('times');
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepOpacity = useRef(new Animated.Value(1)).current;
  const stepTranslate = useRef(new Animated.Value(0)).current;

  const deadlineValid = Boolean(wizard.deadline && wizard.deadline >= tomorrowValue());
  const trackerInputsValid = wizard.trackerInputs.every((tracker) => (
    tracker.title.trim().length > 0
    && (
      tracker.type !== 'counter'
      || (
        typeof tracker.targetValue === 'number'
        && tracker.targetValue > 0
        && Boolean(tracker.targetUnit?.trim())
      )
    )
  ));
  const trackingTitlesValid = wizard.milestones.every((milestone) => milestone.title.trim())
    && wizard.activeTrackers.every((tracker) => tracker.title.trim());
  const canSubmit = Boolean(wizard.outcome.trim())
    && deadlineValid
    && trackerInputsValid
    && trackingTitlesValid;
  const selectedProject = projects.find((project) => project.id === wizard.projectId) ?? null;
  const remainingDays = daysUntil(wizard.deadline);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (initialProjectId) wizard.setProjectId(initialProjectId);
  }, [initialProjectId, wizard.setProjectId]);

  useEffect(() => {
    stepOpacity.setValue(0.45);
    stepTranslate.setValue(6);
    Animated.parallel([
      Animated.timing(stepOpacity, { duration: 220, toValue: 1, useNativeDriver: true }),
      Animated.timing(stepTranslate, { duration: 220, toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [stepOpacity, stepTranslate, wizard.step]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  function showUndo(message: string, nextUndo: UndoState) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setUndoState(nextUndo);
    setToastMessage(message);
    toastTimer.current = setTimeout(() => setUndoState(null), 5000);
  }

  function undoRemoval() {
    if (!undoState) return;
    if (undoState.kind === 'milestone') {
      wizard.insertMilestone(undoState.item, undoState.index);
    } else {
      wizard.insertTracker(undoState.item, undoState.index);
    }
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setUndoState(null);
  }

  function removeMilestone(item: GoalCreationWizardMilestone) {
    const index = wizard.milestones.findIndex((milestone) => milestone.id === item.id);
    wizard.removeMilestone(item.id);
    showUndo('Milestone removed', { kind: 'milestone', item, index });
  }

  function removeTracker(item: GoalCreationWizardTracker) {
    const index = wizard.trackers.findIndex((tracker) => tracker.id === item.id);
    wizard.removeTracker(item.id);
    showUndo('Tracker removed', { kind: 'tracker', item, index });
  }

  function addMilestone() {
    if (!wizard.addMilestone({
      title: newMilestoneTitle,
      week: newMilestoneWeek,
      why: newMilestoneWhy,
    })) return;
    setNewMilestoneTitle('');
    setNewMilestoneWeek('');
    setNewMilestoneWhy('');
    setAddingMilestone(false);
  }

  function addTracker() {
    const parsedTarget = Number(newTrackerTarget);
    const targetValue = newTrackerType === 'checklist'
      ? null
      : Number.isFinite(parsedTarget) && parsedTarget > 0
        ? parsedTarget
        : 1;
    if (!wizard.addTracker({
      title: newTrackerTitle,
      type: newTrackerType,
      targetValue,
      targetUnit: newTrackerType === 'checklist' ? null : newTrackerUnit,
    })) return;
    setNewTrackerTitle('');
    setNewTrackerType('habit');
    setNewTrackerTarget('1');
    setNewTrackerUnit('times');
    setAddingTracker(false);
  }

  async function createGoal() {
    if (saving || !canSubmit || !wizard.deadline) return;

    const payload: ManualGoalCreationInput = {
      title: wizard.outcome.trim(),
      description: wizard.reason.trim() || null,
      deadline: wizard.deadline,
      category: wizard.category,
      visibility: wizard.isPrivate ? 'private' : 'circle',
      target_frequency: { period: 'week', times: wizard.daysPerWeek },
      project_id: wizard.projectId,
      milestones: wizard.milestoneInputs,
      trackers: wizard.trackerInputs,
    };

    setSaving(true);
    setSubmitError(null);
    try {
      const response = await authedFetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as ApiResponse<CreateGoalWithMilestonesAndTrackersResult>;
      if (!body.ok) throw new Error(body.error.message || 'Could not create the goal.');
      if (!body.data.goalId) throw new Error(body.data.error || 'Could not create the goal.');

      const savedGoal = await fetchGoalById(body.data.goalId);
      if (savedGoal) upsertGoal(savedGoal);
      if (body.data.warning) {
        console.warn('[manual-goal-create] goal saved with warning', {
          goalId: body.data.goalId,
          warning: body.data.warning,
        });
      }
      setCreatedGoalId(body.data.goalId);
      setCreated(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not create the goal.');
    } finally {
      setSaving(false);
    }
  }

  function startAnother() {
    wizard.reset({ initialProjectId: null });
    setCreated(false);
    setCreatedGoalId(null);
    setSubmitError(null);
    setExpandedMilestones([]);
    setAddingMilestone(false);
    setNewMilestoneTitle('');
    setNewMilestoneWeek('');
    setNewMilestoneWhy('');
    setAddingTracker(false);
    setNewTrackerTitle('');
    setNewTrackerType('habit');
    setNewTrackerTarget('1');
    setNewTrackerUnit('times');
    setUndoState(null);
  }

  function renderStepOne() {
    return (
      <View style={{ alignSelf: 'center', maxWidth: 900, width: '100%' }}>
        <SectionIntro
          accent={accent}
          description="Pick a category below and Ohara will draft a sharper version you can accept or override."
          eyebrow="DEFINE · STEP 1 OF 4"
          title="Name your outcome."
        />

        <View style={{ alignSelf: 'center', marginBottom: 22, maxWidth: 680, width: '100%' }}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <CategoryBadge accent={accent} darkMode={darkMode} label={wizard.template.label} />
          </View>
          <ManualTextInput
            accessibilityLabel="Goal outcome"
            autoFocus={!compact}
            onChangeText={wizard.setOutcome}
            placeholder="What do you want to achieve?"
            style={{
              fontFamily: 'Lora-Regular',
              fontSize: compact ? 20 : 22,
              lineHeight: compact ? 27 : 30,
              minHeight: compact ? 58 : 64,
              paddingHorizontal: 18,
              paddingVertical: 13,
              textAlign: 'center',
            }}
            value={wizard.outcome}
          />

          {wizard.suggestionState === 'visible' ? (
            <Card elevated style={{ marginTop: 20, padding: 20 }}>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: darkMode ? colors.background.input : accent.tint,
                    borderRadius: 11,
                    height: 22,
                    justifyContent: 'center',
                    width: 22,
                  }}
                >
                  <Typography variant="caption" style={{ color: accent.mid }}>✦</Typography>
                </View>
                <Typography variant="eyebrow" style={{ color: colors.text.muted }}>
                  A {wizard.template.label.toUpperCase()} VERSION MIGHT BE
                </Typography>
              </View>
              <Typography
                variant="title"
                style={{ fontFamily: 'Inter-SemiBold', fontSize: 20, lineHeight: 27, marginBottom: 14 }}
              >
                {wizard.template.suggestion}
              </Typography>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <AccentButton accent={accent} onPress={wizard.applySuggestion} style={{ minHeight: 40 }}>
                  Use this
                </AccentButton>
                <Button onPress={wizard.dismissSuggestion} style={{ minHeight: 40 }} variant="secondary">
                  Keep mine
                </Button>
              </View>
            </Card>
          ) : null}
        </View>

        <View
          style={{
            alignItems: 'baseline',
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <Typography variant="title" style={{ fontFamily: 'Inter-SemiBold', fontSize: 16 }}>
            Pick a category
          </Typography>
          {!compact ? (
            <Typography variant="caption" style={{ color: colors.text.muted }}>
              Choose one to see its starter template
            </Typography>
          ) : null}
        </View>

        <View style={{ gap: 10 }}>
          {(width >= 1180
            ? [
                GOAL_CREATION_CATEGORIES.slice(0, 2),
                GOAL_CREATION_CATEGORIES.slice(2, 5),
                GOAL_CREATION_CATEGORIES.slice(5, 7),
              ]
            : [GOAL_CREATION_CATEGORIES]
          ).map((categoryRow, rowIndex) => (
            <View
              key={`category-row-${rowIndex}`}
              style={{
                flexDirection: 'row',
                flexWrap: width >= 1180 ? 'nowrap' : 'wrap',
                gap: 10,
                justifyContent: 'center',
              }}
            >
          {categoryRow.map((category) => {
            const template = wizard.category === category
              ? wizard.template
              : undefined;
            const categoryTemplate = template ?? getGoalCreationTemplate(category);
            const categoryAccent = CATEGORY_ACCENT_THEME[category];
            const selected = wizard.category === category;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={category}
                onPress={() => wizard.setCategory(category)}
                style={({ pressed }) => ({
                  alignItems: 'flex-start',
                  backgroundColor: colors.background.card,
                  borderColor: selected ? categoryAccent.color : colors.border.warm,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  flexBasis: compact ? '100%' : width >= 1180 ? 250 : '48%',
                  flexGrow: 0,
                  flexDirection: 'row',
                  gap: 10,
                  height: width >= 1180 ? 78 : undefined,
                  minWidth: compact ? '100%' : width >= 1180 ? 250 : 230,
                  opacity: pressed ? 0.72 : selected ? 1 : 0.66,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  shadowColor: selected ? categoryAccent.color : colors.text.primary,
                  shadowOffset: { width: 0, height: selected ? 8 : 2 },
                  shadowOpacity: darkMode ? 0 : selected ? 0.12 : 0.035,
                  shadowRadius: selected ? 18 : 8,
                })}
              >
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: darkMode ? colors.background.input : categoryAccent.tint,
                    borderRadius: 11,
                    height: 34,
                    justifyContent: 'center',
                    width: 34,
                  }}
                >
                  <Typography style={{ color: categoryAccent.mid, fontSize: 18 }} variant="body">
                    {categoryTemplate.icon}
                  </Typography>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="title"
                    style={{ fontFamily: 'Inter-SemiBold', fontSize: 15.5, marginBottom: 2 }}
                  >
                    {categoryTemplate.label}
                  </Typography>
                  <Typography numberOfLines={2} variant="caption" style={{ lineHeight: 16 }}>
                    {categoryTemplate.description}
                  </Typography>
                </View>
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: selected ? categoryAccent.color : 'transparent',
                    borderColor: selected ? categoryAccent.color : colors.border.warm,
                    borderRadius: 11,
                    borderWidth: 1.5,
                    height: 22,
                    justifyContent: 'center',
                    width: 22,
                  }}
                >
                  {selected ? (
                    <Typography variant="caption" style={{ color: '#FFFFFF', fontSize: 11 }}>✓</Typography>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
            </View>
          ))}
        </View>
      </View>
    );
  }

  function renderStepTwo() {
    return (
      <View style={{ alignSelf: 'center', maxWidth: 660, width: '100%' }}>
        <SectionIntro
          accent={accent}
          description="Why, when, and how often. A minute of clarity now saves weeks later."
          eyebrow="DEFINE · STEP 2 OF 4"
          title="The details that make it real."
        />

        <Card elevated padding="spacious" style={{ marginBottom: 14 }}>
          <Typography variant="field-label" style={{ marginBottom: 4 }}>
            Why does this matter to you?
          </Typography>
          <Typography variant="caption" style={{ color: colors.text.muted, marginBottom: 12 }}>
            Even a sentence helps — this is a note to yourself.
          </Typography>
          <TextField
            accessibilityLabel="Why this goal matters"
            multiline
            onChangeText={wizard.setReason}
            placeholder="I want to…"
            value={wizard.reason}
          />
          <Typography
            variant="caption"
            style={{ color: colors.text.muted, marginTop: 6, textAlign: 'right' }}
          >
            {wizard.reason.length} / {GOAL_CREATION_REASON_MAX_LENGTH}
          </Typography>
        </Card>

        <Card elevated padding="spacious" style={{ marginBottom: 14 }}>
          <Typography variant="field-label" style={{ marginBottom: 12 }}>
            When do you want to achieve this?
          </Typography>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DEADLINE_PRESETS.map((preset) => {
              const selected = wizard.preset === preset;
              const date = preset === 'custom' ? wizard.customDate || null : presetDeadline(preset);
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={preset}
                  onPress={() => wizard.setPreset(preset)}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    backgroundColor: selected
                      ? darkMode ? colors.background.selectedRow : accent.tint
                      : colors.background.input,
                    borderColor: selected ? accent.color : colors.border.warm,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    flex: 1,
                    minWidth: 120,
                    opacity: pressed ? 0.7 : 1,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  })}
                >
                  <Typography
                    variant="meta"
                    style={{ color: selected ? accent.mid : colors.text.primary, fontFamily: 'Inter-SemiBold' }}
                  >
                    {preset === 'custom' ? 'Custom' : `${preset} days`}
                  </Typography>
                  <Typography variant="caption" style={{ color: selected ? accent.mid : colors.text.muted }}>
                    {formatDate(date)}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
          {wizard.preset === 'custom' ? (
            <View style={{ marginTop: 12 }}>
              <DatePicker
                accessibilityLabel="Custom goal deadline"
                error={!deadlineValid && wizard.customDate ? 'Choose a future date.' : null}
                minimumDate={tomorrowValue()}
                onChange={wizard.setCustomDate}
                value={wizard.customDate}
              />
              {!deadlineValid && wizard.customDate ? (
                <Typography
                  accessibilityRole="alert"
                  variant="caption"
                  style={{ color: colors.feedback.danger.text, marginTop: 6 }}
                >
                  Choose a valid future date.
                </Typography>
              ) : null}
            </View>
          ) : null}
        </Card>

        <Card elevated padding="spacious" style={{ marginBottom: 14 }}>
          <Typography variant="field-label" style={{ marginBottom: 12 }}>
            How many days a week are you committing?
          </Typography>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const selected = wizard.daysPerWeek === day;
              return (
                <Pressable
                  accessibilityLabel={`${day} ${day === 1 ? 'day' : 'days'} per week`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={day}
                  onPress={() => wizard.setDaysPerWeek(day)}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    backgroundColor: selected ? accent.color : colors.background.input,
                    borderColor: selected ? accent.color : colors.border.warm,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    flex: 1,
                    minWidth: 34,
                    opacity: pressed ? 0.72 : 1,
                    paddingVertical: 10,
                  })}
                >
                  <Typography
                    variant="meta"
                    style={{ color: selected ? '#FFFFFF' : colors.text.primary, fontFamily: 'Inter-SemiBold' }}
                  >
                    {day}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
          <Typography
            variant="caption"
            style={{ fontFamily: 'Inter-Regular', fontStyle: 'italic', marginTop: 12 }}
          >
            {wizard.template.daysNote}
          </Typography>
        </Card>

        <Card elevated padding="spacious" style={{ marginBottom: 14 }}>
          <Typography variant="field-label" style={{ marginBottom: 4 }}>
            Link to a project <Typography variant="caption">(optional)</Typography>
          </Typography>
          <Typography variant="caption" style={{ color: colors.text.muted, marginBottom: 12 }}>
            Keep this goal grouped with an existing project.
          </Typography>
          {projects.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {projects.map((project) => {
                const selected = wizard.projectId === project.id;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={project.id}
                    onPress={() => wizard.setProjectId(selected ? null : project.id)}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      backgroundColor: selected ? colors.background.selectedRow : colors.background.input,
                      borderColor: selected ? accent.color : colors.border.warm,
                      borderRadius: 999,
                      borderWidth: 1,
                      flexDirection: 'row',
                      gap: 7,
                      opacity: pressed ? 0.7 : 1,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    })}
                  >
                    <View style={{ backgroundColor: accent.color, borderRadius: 4, height: 7, width: 7 }} />
                    <Typography variant="meta">{project.title}</Typography>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Typography variant="caption">No projects available yet.</Typography>
          )}
        </Card>

        <Card
          elevated
          padding="spacious"
          style={{ borderLeftColor: accent.color, borderLeftWidth: 4 }}
        >
          <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
            <Typography variant="eyebrow">YOUR GOAL, SO FAR</Typography>
            <CategoryBadge accent={accent} darkMode={darkMode} label={wizard.template.label} />
          </View>
          <Typography
            variant="title"
            style={{ fontFamily: 'Inter-SemiBold', fontSize: 22, lineHeight: 28, marginVertical: 14 }}
          >
            {wizard.outcome || '—'}
          </Typography>
          <View
            style={{
              borderTopColor: colors.border.warmSubtle,
              borderTopWidth: 1,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 24,
              paddingTop: 14,
            }}
          >
            <View>
              <Typography variant="eyebrow">TARGET</Typography>
              <Typography variant="meta" style={{ color: colors.text.primary, fontFamily: 'Inter-SemiBold' }}>
                {formatDate(wizard.deadline)}
              </Typography>
              <Typography variant="caption">{remainingDays} days remaining</Typography>
            </View>
            <View>
              <Typography variant="eyebrow">COMMITMENT</Typography>
              <Typography variant="meta" style={{ color: colors.text.primary, fontFamily: 'Inter-SemiBold' }}>
                {wizard.daysPerWeek} days / week
              </Typography>
            </View>
          </View>
          {wizard.reason ? (
            <Typography
              variant="body"
              style={{
                borderTopColor: colors.border.warmSubtle,
                borderTopWidth: 1,
                fontFamily: 'Inter-Regular',
                fontSize: 14,
                fontStyle: 'italic',
                lineHeight: 22,
                marginTop: 14,
                paddingTop: 14,
              }}
            >
              “{wizard.reason}”
            </Typography>
          ) : null}
        </Card>
      </View>
    );
  }

  function renderMilestone(item: GoalCreationWizardMilestone, index: number) {
    const expanded = expandedMilestones.includes(item.id);
    return (
      <Card key={item.id} padding="compact" style={{ borderRadius: 14 }}>
        <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 10 }}>
          <View style={{ paddingTop: 1 }}>
            <Pressable
              accessibilityLabel={`Move ${item.title} earlier`}
              disabled={index === 0}
              onPress={() => wizard.moveMilestone(item.id, -1)}
              style={{ opacity: index === 0 ? 0.25 : 1, padding: 2 }}
            >
              <Typography variant="caption">▲</Typography>
            </Pressable>
            <Pressable
              accessibilityLabel={`Move ${item.title} later`}
              disabled={index === wizard.milestones.length - 1}
              onPress={() => wizard.moveMilestone(item.id, 1)}
              style={{ opacity: index === wizard.milestones.length - 1 ? 0.25 : 1, padding: 2 }}
            >
              <Typography variant="caption">▼</Typography>
            </Pressable>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ManualTextInput
              accessibilityLabel="Milestone title"
              onChangeText={(title) => wizard.updateMilestone(item.id, { title })}
              style={{
                color: colors.text.primary,
                flex: 1,
                fontFamily: 'Inter-SemiBold',
                fontSize: 14.5,
                minHeight: 40,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
              value={item.title}
            />
            <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
              <ManualTextInput
                accessibilityLabel="Milestone timing"
                onChangeText={(week) => wizard.updateMilestone(item.id, { week })}
                style={{
                  color: colors.text.secondary,
                  fontFamily: 'Inter-Regular',
                  fontSize: 12,
                  minWidth: 70,
                  minHeight: 36,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                }}
                value={item.week}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setExpandedMilestones((current) => (
                  current.includes(item.id)
                    ? current.filter((id) => id !== item.id)
                    : [...current, item.id]
                ))}
              >
                <Typography variant="caption" style={{ color: accent.mid, fontFamily: 'Inter-Medium' }}>
                  {expanded ? '▾ Hide why' : '▸ Why this?'}
                </Typography>
              </Pressable>
              {item.suggested ? (
                <View
                  style={{
                    backgroundColor: darkMode ? colors.background.input : accent.tint,
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Typography variant="badge-text" style={{ color: accent.mid }}>✦ Suggested</Typography>
                </View>
              ) : null}
            </View>
            {expanded ? (
              <ManualTextInput
                accessibilityLabel="Why this milestone matters"
                multiline
                onChangeText={(why) => wizard.updateMilestone(item.id, { why })}
                placeholder="Why does this checkpoint matter?"
                style={{
                  color: colors.text.secondary,
                  fontFamily: 'Inter-Regular',
                  fontSize: 12.5,
                  lineHeight: 19,
                  marginTop: 10,
                  minHeight: 58,
                  padding: 10,
                  textAlignVertical: 'top',
                }}
                value={item.why}
              />
            ) : null}
          </View>
          <Pressable
            accessibilityLabel={`Remove ${item.title}`}
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => removeMilestone(item)}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
          >
            <Typography variant="body" style={{ color: colors.text.muted, fontSize: 16 }}>×</Typography>
          </Pressable>
        </View>
      </Card>
    );
  }

  function renderTracker(item: GoalCreationWizardTracker) {
    const typeColors = trackerTypeColor(item.type, accent);
    return (
      <Card key={item.id} padding="compact" style={{ borderRadius: 14 }}>
        <View style={{ alignItems: 'center', flexDirection: compact ? 'column' : 'row', gap: 10 }}>
          <ManualTextInput
            accessibilityLabel="Tracker title"
            onChangeText={(title) => wizard.updateTracker(item.id, { title })}
            style={{
              color: colors.text.primary,
              flex: compact ? undefined : 1,
              fontFamily: 'Inter-SemiBold',
              fontSize: 14,
              minWidth: compact ? '100%' : 160,
              minHeight: 40,
              paddingHorizontal: 12,
              paddingVertical: 8,
              width: compact ? '100%' : undefined,
            }}
            value={item.title}
          />
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, width: compact ? '100%' : undefined }}>
            <Pressable
              accessibilityLabel={`Tracker type ${TRACKER_TYPE_LABELS[item.type]}. Activate to change.`}
              accessibilityRole="button"
              onPress={() => {
                const nextType = nextTrackerType(item.type);
                wizard.updateTracker(item.id, {
                  type: nextType,
                  targetValue: nextType === 'checklist' ? null : item.targetValue ?? 1,
                  targetUnit: nextType === 'checklist' ? null : item.targetUnit ?? 'times',
                });
              }}
              style={({ pressed }) => ({
                backgroundColor: darkMode ? colors.background.input : typeColors.backgroundColor,
                borderRadius: 999,
                opacity: pressed ? 0.68 : 1,
                paddingHorizontal: 10,
                paddingVertical: 5,
              })}
            >
              <Typography variant="badge-text" style={{ color: typeColors.color, fontFamily: 'Inter-SemiBold' }}>
                {TRACKER_TYPE_LABELS[item.type]}
              </Typography>
            </Pressable>
            {item.type !== 'checklist' ? (
              <>
                <ManualTextInput
                  accessibilityLabel={`${item.title} weekly target`}
                  keyboardType="numeric"
                  onChangeText={(value) => wizard.updateTracker(item.id, {
                    targetValue: Number.isFinite(Number(value)) ? Number(value) : 0,
                  })}
                  style={{
                    borderRadius: 8,
                    color: colors.text.primary,
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 13,
                    minHeight: 36,
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    textAlign: 'center',
                    width: 54,
                  }}
                  value={String(item.targetValue ?? '')}
                />
                <ManualTextInput
                  accessibilityLabel={`${item.title} target unit`}
                  onChangeText={(targetUnit) => wizard.updateTracker(item.id, { targetUnit })}
                  style={{
                    color: colors.text.secondary,
                    flex: compact ? 1 : undefined,
                    fontFamily: 'Inter-Regular',
                    fontSize: 12,
                    minWidth: 72,
                    minHeight: 36,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                  }}
                  value={item.targetUnit ?? ''}
                />
                <Typography variant="caption">/ week</Typography>
              </>
            ) : null}
            <View style={{ flex: 1 }} />
            <Pressable
              accessibilityLabel={`Remove ${item.title}`}
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => removeTracker(item)}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
            >
              <Typography variant="body" style={{ color: colors.text.muted, fontSize: 16 }}>×</Typography>
            </Pressable>
          </View>
        </View>
        {item.baselinePrompt ? (
          <View
            style={{
              alignItems: compact ? 'stretch' : 'center',
              borderTopColor: colors.border.warmSubtle,
              borderTopWidth: 1,
              flexDirection: compact ? 'column' : 'row',
              gap: 10,
              marginTop: 12,
              paddingTop: 12,
            }}
          >
            <Typography
              variant="caption"
              style={{ flex: 1, fontFamily: 'Inter-Regular', fontStyle: 'italic' }}
            >
              What’s your current weekly distance? This optional baseline helps you choose a realistic target.
            </Typography>
            <ManualTextInput
              accessibilityLabel={`${item.title} current baseline`}
              onChangeText={(baseline) => wizard.updateTracker(item.id, { baseline })}
              placeholder="e.g. 4 km"
              style={{
                borderRadius: 8,
                color: colors.text.primary,
                fontFamily: 'Inter-Regular',
                fontSize: 12.5,
                minHeight: 38,
                paddingHorizontal: 10,
                paddingVertical: 7,
                width: compact ? '100%' : 120,
              }}
              value={item.baseline ?? ''}
            />
          </View>
        ) : null}
      </Card>
    );
  }

  function renderStepThree() {
    return (
      <View style={{ alignSelf: 'center', maxWidth: 740, width: '100%' }}>
        <SectionIntro
          accent={accent}
          description="A starter roadmap and a weekly pack. Adjust anything that doesn’t fit."
          eyebrow="TRACK · STEP 3 OF 4"
          title="Set up your tracking."
        />

        <View style={{ alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Typography variant="title" style={{ fontFamily: 'Inter-SemiBold', fontSize: 16 }}>
            Roadmap
          </Typography>
          <Typography variant="caption">Milestones along the way</Typography>
        </View>

        {wizard.milestones.length ? (
          <View style={{ gap: 10 }}>
            {wizard.milestones.map(renderMilestone)}
          </View>
        ) : (
          <Card padding="spacious" style={{ alignItems: 'center', borderStyle: 'dashed' }}>
            <Typography variant="title" style={{ fontFamily: 'Inter-Regular', fontSize: 16 }}>
              No milestones yet.
            </Typography>
            <Typography variant="caption" style={{ marginTop: 4 }}>
              You can add checkpoints now or from your goal page later.
            </Typography>
          </Card>
        )}

        {addingMilestone ? (
          <Card padding="compact" style={{ gap: 8, marginTop: 12 }}>
            <TextField
              accessibilityLabel="New milestone title"
              onChangeText={setNewMilestoneTitle}
              placeholder="Milestone title"
              value={newMilestoneTitle}
            />
            <View style={{ flexDirection: compact ? 'column' : 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TextField
                  accessibilityLabel="New milestone timing"
                  onChangeText={setNewMilestoneWeek}
                  placeholder="e.g. Week 6"
                  value={newMilestoneWeek}
                />
              </View>
              <View style={{ flex: 2 }}>
                <TextField
                  accessibilityLabel="New milestone reason"
                  onChangeText={setNewMilestoneWhy}
                  placeholder="Why this matters (optional)"
                  value={newMilestoneWhy}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <Button onPress={() => setAddingMilestone(false)} variant="ghost">Cancel</Button>
              <AccentButton
                accent={accent}
                disabled={!newMilestoneTitle.trim()}
                onPress={addMilestone}
              >
                Add milestone
              </AccentButton>
            </View>
          </Card>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setAddingMilestone(true)}
            style={({ pressed }) => ({
              alignItems: 'center',
              borderColor: colors.border.input,
              borderRadius: 14,
              borderStyle: 'dashed',
              borderWidth: 1,
              marginTop: 12,
              opacity: pressed ? 0.62 : 1,
              padding: 14,
            })}
          >
            <Typography variant="meta">＋ Add a milestone</Typography>
          </Pressable>
        )}

        <View style={{ backgroundColor: colors.border.warm, height: 1, marginVertical: 28 }} />

        <View style={{ alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Typography variant="title" style={{ fontFamily: 'Inter-SemiBold', fontSize: 16 }}>
            What you’ll track each week
          </Typography>
          <Typography variant="caption">
            {wizard.activeTrackers.length} / {GOAL_CREATION_MAX_ACTIVE_TRACKERS} active
          </Typography>
        </View>

        <View style={{ gap: 10 }}>
          {wizard.trackers.filter((tracker) => tracker.enabled).map(renderTracker)}
        </View>

        {wizard.optionalTrackers.some((tracker) => !tracker.enabled) ? (
          <View style={{ borderTopColor: colors.border.warm, borderTopWidth: 1, marginTop: 22, paddingTop: 20 }}>
            <Typography variant="eyebrow" style={{ marginBottom: 12 }}>ALSO AVAILABLE</Typography>
            <View style={{ gap: 8 }}>
              {wizard.optionalTrackers.filter((tracker) => !tracker.enabled).map((tracker) => {
                const typeColors = trackerTypeColor(tracker.type, accent);
                return (
                  <Card key={tracker.id} padding="compact" style={{ borderRadius: 12 }}>
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
                      <Typography variant="meta" style={{ color: colors.text.primary, flex: 1 }}>
                        {tracker.title}
                      </Typography>
                      <View
                        style={{
                          backgroundColor: darkMode ? colors.background.input : typeColors.backgroundColor,
                          borderRadius: 999,
                          paddingHorizontal: 9,
                          paddingVertical: 4,
                        }}
                      >
                        <Typography variant="badge-text" style={{ color: typeColors.color }}>
                          {TRACKER_TYPE_LABELS[tracker.type]}
                        </Typography>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        disabled={!wizard.canAddTracker}
                        onPress={() => wizard.toggleTracker(tracker.id)}
                        style={({ pressed }) => ({
                          backgroundColor: darkMode ? colors.background.input : accent.tint,
                          borderRadius: 999,
                          opacity: !wizard.canAddTracker ? 0.4 : pressed ? 0.7 : 1,
                          paddingHorizontal: 13,
                          paddingVertical: 7,
                        })}
                      >
                        <Typography variant="badge-text" style={{ color: accent.mid, fontFamily: 'Inter-SemiBold' }}>
                          + Add this
                        </Typography>
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        ) : null}

        {addingTracker ? (
          <Card padding="compact" style={{ gap: 8, marginTop: 14 }}>
            <TextField
              accessibilityLabel="Custom tracker title"
              onChangeText={setNewTrackerTitle}
              placeholder="Custom tracker name"
              value={newTrackerTitle}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GOAL_TRACKER_TYPES.map((type) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: type === newTrackerType }}
                  key={type}
                  onPress={() => setNewTrackerType(type)}
                  style={({ pressed }) => ({
                    backgroundColor: type === newTrackerType ? accent.tint : colors.background.input,
                    borderColor: type === newTrackerType ? accent.color : colors.border.warm,
                    borderRadius: 999,
                    borderWidth: 1,
                    opacity: pressed ? 0.7 : 1,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  })}
                >
                  <Typography variant="badge-text" style={{ color: type === newTrackerType ? accent.mid : colors.text.secondary }}>
                    {TRACKER_TYPE_LABELS[type]}
                  </Typography>
                </Pressable>
              ))}
            </View>
            {newTrackerType !== 'checklist' ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    accessibilityLabel="Custom tracker target"
                    onChangeText={setNewTrackerTarget}
                    placeholder="Target"
                    value={newTrackerTarget}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <TextField
                    accessibilityLabel="Custom tracker unit"
                    onChangeText={setNewTrackerUnit}
                    placeholder="Unit, e.g. sessions"
                    value={newTrackerUnit}
                  />
                </View>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <Button onPress={() => setAddingTracker(false)} variant="ghost">Cancel</Button>
              <AccentButton
                accent={accent}
                disabled={!newTrackerTitle.trim() || !wizard.canAddTracker}
                onPress={addTracker}
              >
                Add tracker
              </AccentButton>
            </View>
          </Card>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={!wizard.canAddTracker}
            onPress={() => setAddingTracker(true)}
            style={({ pressed }) => ({
              alignItems: 'center',
              borderColor: colors.border.input,
              borderRadius: 12,
              borderStyle: 'dashed',
              borderWidth: 1,
              marginTop: 14,
              opacity: !wizard.canAddTracker ? 0.42 : pressed ? 0.62 : 1,
              padding: 12,
            })}
          >
            <Typography variant="meta">
              {wizard.canAddTracker ? '+ Add custom metric' : '5 is the max — remove one to add your own.'}
            </Typography>
          </Pressable>
        )}
      </View>
    );
  }

  function renderSuccess() {
    return (
      <View style={{ alignItems: 'center', alignSelf: 'center', marginTop: 40, maxWidth: 520, width: '100%' }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: darkMode ? colors.background.input : accent.tint,
            borderColor: accent.color,
            borderRadius: 44,
            borderWidth: 2,
            height: 88,
            justifyContent: 'center',
            marginBottom: 24,
            width: 88,
          }}
        >
          <Typography variant="heading" style={{ color: accent.color, fontSize: 38 }}>✓</Typography>
        </View>
        <Typography variant="heading" style={{ fontFamily: 'Inter-SemiBold', fontSize: 28, textAlign: 'center' }}>
          Goal created.
        </Typography>
        <Typography variant="body" style={{ fontSize: 15, lineHeight: 23, marginBottom: 28, marginTop: 10, textAlign: 'center' }}>
          {wizard.skipTracking
            ? 'Your goal is ready. You can add milestones and trackers from its goal page whenever you’re ready.'
            : 'Your first milestone and this week’s trackers are ready on the goal page.'}
        </Typography>
        <Pressable
          accessibilityLabel={`View goal ${wizard.outcome}`}
          accessibilityRole="button"
          disabled={!createdGoalId}
          onPress={() => createdGoalId && router.replace(goalWorkspaceHref(createdGoalId) as never)}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: colors.background.card,
            borderColor: colors.border.warm,
            borderRadius: 16,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 12,
            opacity: !createdGoalId ? 0.5 : pressed ? 0.72 : 1,
            paddingHorizontal: 20,
            paddingVertical: 18,
            shadowColor: colors.text.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: darkMode ? 0 : 0.06,
            shadowRadius: 18,
            width: '100%',
          })}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: darkMode ? colors.background.input : accent.tint,
              borderRadius: 10,
              height: 38,
              justifyContent: 'center',
              width: 38,
            }}
          >
            <Typography variant="body" style={{ color: accent.color, fontSize: 20 }}>◆</Typography>
          </View>
          <View style={{ flex: 1 }}>
            <Typography variant="title" style={{ fontFamily: 'Inter-SemiBold', fontSize: 16 }}>
              {wizard.outcome}
            </Typography>
            <Typography variant="caption" style={{ marginTop: 2 }}>
              {formatDate(wizard.deadline)} · {wizard.daysPerWeek} days / week
            </Typography>
          </View>
          <Typography variant="body" style={{ color: accent.color, fontSize: 18 }}>→</Typography>
        </Pressable>
        <AccentButton
          accent={accent}
          disabled={!createdGoalId}
          onPress={() => createdGoalId && router.replace(goalWorkspaceHref(createdGoalId) as never)}
          style={{ marginTop: 14, width: '100%' }}
        >
          View goal
        </AccentButton>
        <Button onPress={startAnother} style={{ marginTop: 14 }} variant="ghost">
          ↺ Start another
        </Button>
      </View>
    );
  }

  function renderStepFour() {
    if (created) return renderSuccess();
    return (
      <View style={{ alignSelf: 'center', maxWidth: 720, width: '100%' }}>
        <SectionIntro
          accent={accent}
          description="Read it back to yourself. If it feels honest, start it."
          eyebrow="CONFIRM · STEP 4 OF 4"
          title="One last look."
        />

        <Card padding="compact" style={{ marginBottom: 14 }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <Typography variant="field-label">Keep this goal private</Typography>
              <Typography variant="caption" style={{ lineHeight: 18, marginTop: 2 }}>
                Private goals stay out of circle features and recommendations. You can change this later.
              </Typography>
            </View>
            <Toggle
              accessibilityLabel="Keep this goal private"
              onValueChange={wizard.setPrivate}
              style={{ backgroundColor: wizard.isPrivate ? accent.color : colors.border.input }}
              value={wizard.isPrivate}
            />
          </View>
        </Card>

        <Card elevated padding="none" style={{ borderRadius: 20, overflow: 'hidden' }}>
          <View style={{ backgroundColor: accent.color, height: 6 }} />
          <View style={{ padding: compact ? 20 : 28 }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
              <CategoryBadge accent={accent} darkMode={darkMode} label={wizard.template.label} />
              {wizard.isPrivate ? <Typography variant="caption">🔒 Private</Typography> : <Typography variant="caption">Circle</Typography>}
            </View>
            <Typography
              variant="heading"
              style={{ fontFamily: 'Inter-SemiBold', fontSize: compact ? 26 : 30, lineHeight: compact ? 32 : 36 }}
            >
              {wizard.outcome}
            </Typography>

            <View
              style={{
                borderBottomColor: colors.border.warmSubtle,
                borderBottomWidth: 1,
                borderTopColor: colors.border.warmSubtle,
                borderTopWidth: 1,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: compact ? 18 : 28,
                marginTop: 16,
                paddingVertical: 16,
              }}
            >
              {[
                ['TARGET DATE', formatDate(wizard.deadline)],
                ['COMMITMENT', `${wizard.daysPerWeek} days / week`],
                ['MILESTONES', `${wizard.milestones.length}${wizard.skipTracking ? ' (skipped)' : ''}`],
                ['TRACKERS', `${wizard.activeTrackers.length}${wizard.skipTracking ? ' (skipped)' : ''}`],
              ].map(([label, value]) => (
                <View key={label} style={{ minWidth: 110 }}>
                  <Typography variant="eyebrow">{label}</Typography>
                  <Typography variant="meta" style={{ color: colors.text.primary, fontFamily: 'Inter-SemiBold' }}>
                    {value}
                  </Typography>
                </View>
              ))}
            </View>

            {wizard.reason ? (
              <Typography
                variant="body"
                style={{
                  borderBottomColor: colors.border.warmSubtle,
                  borderBottomWidth: 1,
                  fontFamily: 'Inter-Regular',
                  fontSize: 14.5,
                  fontStyle: 'italic',
                  lineHeight: 23,
                  paddingVertical: 16,
                }}
              >
                “{wizard.reason}”
              </Typography>
            ) : null}

            {selectedProject ? (
              <View style={{ paddingTop: 16 }}>
                <Typography variant="eyebrow">PROJECT</Typography>
                <Typography variant="meta" style={{ color: colors.text.primary }}>{selectedProject.title}</Typography>
              </View>
            ) : null}

            {wizard.milestones.length ? (
              <View style={{ paddingTop: 16 }}>
                <Typography variant="eyebrow" style={{ marginBottom: 8 }}>ROADMAP</Typography>
                {wizard.milestones.slice(0, 3).map((milestone) => (
                  <View key={milestone.id} style={{ alignItems: 'center', flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                    <View style={{ borderColor: colors.border.input, borderRadius: 4, borderWidth: 1.5, height: 14, width: 14 }} />
                    <Typography variant="meta" style={{ color: colors.text.primary, flex: 1 }}>
                      {milestone.title}
                    </Typography>
                    <Typography variant="caption">{milestone.week}</Typography>
                  </View>
                ))}
                {wizard.milestones.length > 3 ? (
                  <Typography variant="caption" style={{ marginLeft: 22, marginTop: 4 }}>
                    +{wizard.milestones.length - 3} more
                  </Typography>
                ) : null}
              </View>
            ) : null}

            {wizard.activeTrackers.length ? (
              <View style={{ paddingTop: 16 }}>
                <Typography variant="eyebrow" style={{ marginBottom: 8 }}>TRACKERS</Typography>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {wizard.activeTrackers.map((tracker) => (
                    <View
                      key={tracker.id}
                      style={{
                        backgroundColor: colors.background.input,
                        borderColor: colors.border.warm,
                        borderRadius: 999,
                        borderWidth: 1,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                      }}
                    >
                      <Typography variant="caption" style={{ color: colors.text.primary }}>
                        {tracker.title}
                      </Typography>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </Card>

        {submitError ? (
          <Typography
            accessibilityRole="alert"
            variant="caption"
            style={{ color: colors.feedback.danger.text, marginTop: 12, textAlign: 'center' }}
          >
            {submitError}
          </Typography>
        ) : null}
        {!trackerInputsValid ? (
          <Typography
            accessibilityRole="alert"
            variant="caption"
            style={{ color: colors.feedback.danger.text, marginTop: 8, textAlign: 'center' }}
          >
            Counter trackers need a target above zero and a unit.
          </Typography>
        ) : null}
        {!trackingTitlesValid ? (
          <Typography
            accessibilityRole="alert"
            variant="caption"
            style={{ color: colors.feedback.danger.text, marginTop: 8, textAlign: 'center' }}
          >
            Milestones and active trackers need a title. Go back to edit or remove blank items.
          </Typography>
        ) : null}
      </View>
    );
  }

  const stepContent = wizard.step === 1
    ? renderStepOne()
    : wizard.step === 2
      ? renderStepTwo()
      : wizard.step === 3
        ? renderStepThree()
        : renderStepFour();

  const nextEnabled = wizard.step === 1
    ? Boolean(wizard.outcome.trim())
    : wizard.step === 2
      ? deadlineValid
      : true;

  return (
    <SafeAreaView style={{ backgroundColor: pageBackground, flex: 1, flexDirection: 'row' }}>
      {showSidebar ? <Sidebar /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppHeader
          backLabel="Journey"
          onBack={() => router.back()}
          style={{ backgroundColor: pageBackground }}
          title="New goal"
          actions={
            creationMode === 'manual' ? (
              <Typography variant="caption" style={{ color: colors.text.muted }}>
                Step {wizard.step} of 4 · {STEP_LABELS[wizard.step - 1]}
              </Typography>
            ) : null
          }
        />
        <View
          style={{
            backgroundColor: pageBackground,
            paddingHorizontal: compact ? 16 : 40,
            paddingTop: 10,
          }}
        >
          <GoalCreationModeToggle
            compact={compact}
            mode={creationMode}
            onChange={setCreationMode}
          />
        </View>

        {creationMode === 'ai' ? (
          <AIGoalCreation onSwitchToManual={() => setCreationMode('manual')} />
        ) : (
          <>
        <View style={{ backgroundColor: pageBackground, flexDirection: 'row', gap: 6, paddingHorizontal: compact ? 16 : 40, paddingTop: 10 }}>
          {STEP_LABELS.map((label, index) => (
            <View
              accessibilityLabel={`${label}${index + 1 <= wizard.step ? ', completed' : ''}`}
              key={label}
              style={{
                backgroundColor: index + 1 <= wizard.step ? accent.color : colors.border.warm,
                borderRadius: 3,
                flex: 1,
                height: 5,
              }}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingBottom: 24,
            paddingHorizontal: compact ? 16 : 40,
            paddingTop: compact ? 20 : 18,
          }}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
        >
          <Animated.View style={{ opacity: stepOpacity, transform: [{ translateY: stepTranslate }] }}>
            {stepContent}
          </Animated.View>
        </ScrollView>

        {!created ? (
          <View
            style={{
              alignItems: 'center',
              backgroundColor: pageBackground,
              borderTopColor: colors.border.warm,
              borderTopWidth: 1,
              flexDirection: compact ? 'column' : 'row',
              gap: 10,
              paddingHorizontal: compact ? 16 : 40,
              paddingVertical: compact ? 12 : 14,
            }}
          >
            {compact ? (
              <>
                {wizard.step < 4 ? (
                  <AccentButton
                    accent={accent}
                    disabled={!nextEnabled}
                    onPress={wizard.next}
                    style={{ width: '100%' }}
                  >
                    {wizard.step === 2 ? 'Set up tracking →' : 'Next →'}
                  </AccentButton>
                ) : (
                  <AccentButton
                    accent={accent}
                    disabled={!canSubmit}
                    loading={saving}
                    onPress={() => void createGoal()}
                    style={{ width: '100%' }}
                  >
                    Start this goal ✓
                  </AccentButton>
                )}
                {wizard.step > 1 ? (
                  <View
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <Button onPress={wizard.back} variant="ghost">← Back</Button>
                    {wizard.step === 2 ? (
                      <Button onPress={wizard.skipToConfirm} variant="ghost">Skip tracking</Button>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : (
              <>
                {wizard.step > 1 ? (
                  <Button onPress={wizard.back} variant="ghost">← Back</Button>
                ) : null}
                <View style={{ flex: 1 }} />
                {wizard.step === 2 ? (
                  <Button onPress={wizard.skipToConfirm} variant="ghost">
                    Skip — I’ll add tracking later
                  </Button>
                ) : null}
                {wizard.step < 4 ? (
                  <AccentButton accent={accent} disabled={!nextEnabled} onPress={wizard.next}>
                    {wizard.step === 2 ? 'Set up tracking →' : 'Next →'}
                  </AccentButton>
                ) : (
                  <AccentButton accent={accent} disabled={!canSubmit} loading={saving} onPress={() => void createGoal()}>
                    Start this goal ✓
                  </AccentButton>
                )}
              </>
            )}
          </View>
        ) : null}
          </>
        )}
      </View>

      <Toast message={toastMessage} onUndo={undoRemoval} visible={undoState !== null} />
    </SafeAreaView>
  );
}
