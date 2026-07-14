import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Sidebar } from '@/components/layout/Sidebar';
import { Typography } from '@/components/ui/Typography';
import { LIGHT_THEME } from '@/constants/colors';
import { CATEGORY_COLOR_THEME, GOAL_THEMES } from '@/constants/themes';
import { fetchGoalById } from '@/features/goals/services/goal-service';
import { useGoalStore } from '@/features/goals/store';
import { useProjectStore } from '@/features/projects/store';
import { authedFetch } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/contracts';
import type { AiResponse } from '@/lib/ai/contracts';
import type {
  CreateGoalWithMeasurablesResult,
  ManualGoalCreationInput,
} from '@/lib/db/goals';
import {
  GOAL_CATEGORIES,
  GOAL_MEASURABLE_TYPES,
  type GoalCategory,
  type GoalMeasurableType,
} from '@/lib/goals/schema';

type Period = 'week' | 'month';
type Milestone = { id: string; title: string; type: GoalMeasurableType };
type GoalSuggestion = ManualGoalCreationInput['milestones'][number];

const aiAssistEnabled = true;
const START_TRACKABLE = true;
const INITIAL_COUNT = 3;
const PROJECT_DOT_COLORS = ['#2F8F6D', '#B45309', '#4A7C5F'] as const;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const TYPE_META: Record<
  GoalMeasurableType,
  { label: string; color: string; backgroundColor: string }
> = {
  counter: {
    label: 'Counter',
    color: '#2F8F6D',
    backgroundColor: 'rgba(47,143,109,0.12)',
  },
  habit: {
    label: 'Habit',
    color: '#4A7C5F',
    backgroundColor: 'rgba(74,124,95,0.12)',
  },
  checklist: {
    label: 'Checklist',
    color: '#B45309',
    backgroundColor: 'rgba(180,83,9,0.12)',
  },
};

const CARD_STYLE = {
  backgroundColor: LIGHT_THEME.background.card,
  borderColor: LIGHT_THEME.border.warm,
  borderRadius: 16,
  borderWidth: 1,
  elevation: 1,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 12,
} as const;

function todayDateValue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validateDeadline(
  value: string,
  showRequired = false,
): { valid: boolean; iso: string | null; error: string | null } {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      valid: false,
      iso: null,
      error: showRequired ? 'A target date is required.' : null,
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { valid: false, iso: null, error: 'That date is not valid.' };
  }

  const [year, month, day] = trimmed.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return { valid: false, iso: null, error: 'That date is not valid.' };
  }

  if (trimmed < todayDateValue()) {
    return { valid: false, iso: null, error: 'Deadline must be in the future.' };
  }

  return { valid: true, iso: parsed.toISOString(), error: null };
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function Eyebrow({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <Typography
      variant="eyebrow"
      style={[
        {
          color: LIGHT_THEME.text.secondary,
          fontFamily: 'Inter-SemiBold',
          fontSize: 11,
          letterSpacing: 1.5,
        },
        style,
      ]}
    >
      {children}
    </Typography>
  );
}

function FormCard({ children, last = false }: { children: ReactNode; last?: boolean }) {
  return (
    <View
      style={[
        CARD_STYLE,
        {
          marginBottom: last ? 20 : 16,
          paddingHorizontal: 24,
          paddingVertical: 20,
        },
      ]}
    >
      {children}
    </View>
  );
}

type DateFieldProps = {
  error: string | null;
  onBlur: (value: string) => void;
  onChange: (value: string) => void;
  value: string;
};

function DateField({ error, onBlur, onChange, value }: DateFieldProps) {
  const borderColor = error ? LIGHT_THEME.feedback.danger : LIGHT_THEME.border.input;

  if (Platform.OS === 'web') {
    const style: CSSProperties = {
      backgroundColor: '#FFFFFF',
      border: `1px solid ${borderColor}`,
      borderRadius: 999,
      boxSizing: 'border-box',
      color: LIGHT_THEME.text.primary,
      fontFamily: 'Inter-Regular',
      fontSize: 13,
      height: 36,
      outline: 'none',
      padding: '8px 16px',
      width: 170,
    };

    return createElement('input', {
      'aria-label': 'Target date',
      defaultValue: value,
      min: todayDateValue(),
      onBlur: (event: ChangeEvent<HTMLInputElement>) => {
        const nextValue = event.currentTarget.value;
        onChange(nextValue);
        onBlur(nextValue);
      },
      onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value),
      onInput: (event: FormEvent<HTMLInputElement>) => onChange(event.currentTarget.value),
      style,
      type: 'date',
    });
  }

  return (
    <TextInput
      accessibilityLabel="Target date"
      autoCapitalize="none"
      autoCorrect={false}
      onBlur={() => onBlur(value)}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={LIGHT_THEME.text.muted}
      style={{
        backgroundColor: '#FFFFFF',
        borderColor,
        borderRadius: 999,
        borderWidth: 1,
        color: LIGHT_THEME.text.primary,
        fontFamily: 'Inter-Regular',
        fontSize: 13,
        height: 36,
        paddingHorizontal: 16,
        paddingVertical: 8,
        width: 170,
      }}
      value={value}
    />
  );
}

type CreateButtonProps = {
  compact?: boolean;
  enabled: boolean;
  saving: boolean;
  onPress: () => void;
};

function CreateButton({ compact = false, enabled, saving, onPress }: CreateButtonProps) {
  const interactive = enabled && !saving;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !interactive, busy: saving }}
      disabled={!interactive}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: LIGHT_THEME.accent.primary,
        borderRadius: compact ? 999 : 14,
        justifyContent: 'center',
        minHeight: compact ? 35 : 50,
        opacity: interactive ? (pressed ? 0.82 : 1) : 0.45,
        paddingHorizontal: compact ? 16 : 20,
        paddingVertical: compact ? 9 : 15,
        width: compact ? undefined : '100%',
      })}
    >
      {saving ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Typography
          variant="emphasis-sm"
          style={{
            color: '#FFFFFF',
            fontFamily: 'Inter-SemiBold',
            fontSize: compact ? 13 : 15,
          }}
        >
          Create goal
        </Typography>
      )}
    </Pressable>
  );
}

export default function GoalCreateScreen() {
  const { projectId: incomingProjectId } = useLocalSearchParams<{ projectId?: string }>();
  const upsertGoal = useGoalStore((state) => state.upsertGoal);
  const projects = useProjectStore((state) => state.projects);
  const loadProjects = useProjectStore((state) => state.loadProjects);

  const [titleText, setTitleText] = useState('');
  const [whyText, setWhyText] = useState('');
  const [deadline, setDeadline] = useState('');
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory | null>(null);
  const [trackable, setTrackable] = useState(START_TRACKABLE);
  const [period, setPeriod] = useState<Period>('week');
  const [count, setCount] = useState(INITIAL_COUNT);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    typeof incomingProjectId === 'string' ? incomingProjectId : null,
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftType, setDraftType] = useState<GoalMeasurableType>('habit');
  const [created, setCreated] = useState(false);
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const overlayScale = useRef(new Animated.Value(0.7)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const deadlineValidation = useMemo(() => validateDeadline(deadline), [deadline]);
  const createEnabled =
    titleText.trim().length > 0 && deadlineValidation.valid && selectedCategory !== null;

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (typeof incomingProjectId === 'string') {
      setSelectedProjectId(incomingProjectId);
    }
  }, [incomingProjectId]);

  useEffect(() => {
    if (!created) return;

    overlayScale.setValue(0.7);
    overlayOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(overlayScale, {
        damping: 10,
        mass: 0.7,
        stiffness: 180,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        duration: 220,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [created, overlayOpacity, overlayScale]);

  function handleDeadlineChange(value: string) {
    setDeadline(value);
    setDeadlineError(value.trim() ? validateDeadline(value).error : null);
  }

  function handlePeriodChange(nextPeriod: Period) {
    setPeriod(nextPeriod);
    setCount((current) => Math.min(current, nextPeriod === 'week' ? 7 : 30));
  }

  function openAddForm() {
    setShowAddForm(true);
    setDraftTitle('');
    setDraftType('habit');
  }

  function cancelAddForm() {
    setShowAddForm(false);
    setDraftTitle('');
    setDraftType('habit');
  }

  function addMilestone() {
    const title = draftTitle.trim();
    if (!title) return;

    setMilestones((current) => [
      ...current,
      {
        id: `milestone-${Date.now()}-${current.length}`,
        title,
        type: draftType,
      },
    ]);
    setShowAddForm(false);
    setDraftTitle('');
    setDraftType('habit');
  }

  async function suggestMilestone() {
    if (!aiAssistEnabled || suggesting) return;

    setSuggesting(true);
    try {
      const response = await authedFetch('/api/goals/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleText, why: whyText }),
      });
      const body = (await response.json()) as AiResponse<GoalSuggestion | null>;

      if (!body.ok) {
        console.error('[goal-suggestion] request failed:', body.error.code);
        return;
      }

      const suggestion = body.data;
      if (!suggestion) return;

      setMilestones((current) => [
        ...current,
        {
          id: `milestone-${Date.now()}-${current.length}`,
          title: suggestion.title,
          type: suggestion.type,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[goal-suggestion] request failed:', message);
    } finally {
      setSuggesting(false);
    }
  }

  function resetForm() {
    setTitleText('');
    setWhyText('');
    setDeadline('');
    setDeadlineError(null);
    setSelectedCategory(null);
    setTrackable(START_TRACKABLE);
    setPeriod('week');
    setCount(INITIAL_COUNT);
    setMilestones([]);
    setSelectedProjectId(null);
    setShowAddForm(false);
    setDraftTitle('');
    setDraftType('habit');
    setSubmitError(null);
    setCreatedGoalId(null);
    setCreated(false);
  }

  function goToCreatedGoal() {
    if (!createdGoalId) return;

    router.replace(`/(app)/goals/${createdGoalId}` as never);
  }

  async function handleCreateGoal() {
    if (saving) return;

    const resolvedDeadline = validateDeadline(deadline, true);
    if (!resolvedDeadline.valid || !resolvedDeadline.iso) {
      setDeadlineError(resolvedDeadline.error);
      return;
    }
    if (!titleText.trim() || !selectedCategory) return;

    const payload: ManualGoalCreationInput = {
      title: titleText,
      description: whyText || null,
      deadline: resolvedDeadline.iso,
      category: selectedCategory,
      target_frequency: trackable ? { times: count, period } : null,
      project_id: selectedProjectId || null,
      milestones: milestones.map(({ title, type }) => ({ title, type })),
    };

    setSaving(true);
    setSubmitError(null);

    try {
      const response = await authedFetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as ApiResponse<CreateGoalWithMeasurablesResult>;

      if (!body.ok) {
        throw new Error(body.error.message || 'Could not create the goal.');
      }
      if (!body.data.goalId) {
        throw new Error(body.data.error || 'Could not create the goal.');
      }

      const savedGoal = await fetchGoalById(body.data.goalId);
      if (savedGoal) {
        upsertGoal(savedGoal);
      } else {
        console.warn('[manual-goal-create] goal saved but hydration returned no row', {
          goalId: body.data.goalId,
        });
      }

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

  return (
    <SafeAreaView
      style={{
        backgroundColor: LIGHT_THEME.background.page,
        flex: 1,
        flexDirection: 'row',
      }}
    >
      <Sidebar />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: LIGHT_THEME.background.page,
            borderBottomColor: LIGHT_THEME.background.subtle,
            borderBottomWidth: 0.5,
            flexDirection: 'row',
            minHeight: 60,
            paddingHorizontal: 24,
            paddingVertical: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => ({
              alignItems: 'center',
              flexDirection: 'row',
              gap: 6,
              marginRight: 12,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Typography variant="nav-back">←</Typography>
            <Typography variant="nav-back">Goals</Typography>
          </Pressable>
          <View
            style={{
              backgroundColor: LIGHT_THEME.background.subtle,
              height: 16,
              marginRight: 12,
              width: 1,
            }}
          />
          <Typography variant="nav-title">New goal</Typography>
          <View style={{ flex: 1 }} />
          <CreateButton
            compact
            enabled={createEnabled}
            onPress={handleCreateGoal}
            saving={saving}
          />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            alignSelf: 'center',
            maxWidth: 660,
            paddingBottom: 80,
            paddingHorizontal: 24,
            paddingTop: 36,
            width: '100%',
          }}
          keyboardShouldPersistTaps="handled"
        >
          <FormCard>
            <Eyebrow style={{ marginBottom: 14 }}>Name the goal</Eyebrow>
            <TextInput
              accessibilityLabel="Goal title"
              autoFocus
              onChangeText={setTitleText}
              placeholder="e.g. Lose 2 lbs by August 31"
              placeholderTextColor={LIGHT_THEME.text.muted}
              style={{
                color: LIGHT_THEME.text.primary,
                fontFamily: 'Inter-SemiBold',
                fontSize: 26,
                fontWeight: '600',
                letterSpacing: -0.3,
                lineHeight: 34,
                margin: 0,
                outlineWidth: 0,
                padding: 0,
              }}
              value={titleText}
            />

            <View
              style={{
                backgroundColor: LIGHT_THEME.border.warmSubtle,
                height: 1,
                marginBottom: 14,
                marginTop: 16,
              }}
            />

            <View style={{ flexDirection: 'row', marginBottom: 9 }}>
              <Eyebrow>Category</Eyebrow>
              <Typography
                variant="eyebrow"
                style={{
                  color: LIGHT_THEME.feedback.danger,
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 11,
                  marginLeft: 3,
                }}
              >
                *
              </Typography>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GOAL_CATEGORIES.map((category) => {
                const selected = selectedCategory === category;
                const themeName = CATEGORY_COLOR_THEME[category];
                const dotColor = GOAL_THEMES[themeName].accent;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      backgroundColor: selected ? LIGHT_THEME.background.sidebar : '#FFFFFF',
                      borderColor: selected
                        ? LIGHT_THEME.background.sidebar
                        : LIGHT_THEME.background.subtle,
                      borderRadius: 999,
                      borderWidth: 1,
                      flexDirection: 'row',
                      opacity: pressed ? 0.72 : 1,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    })}
                  >
                    <View
                      style={{
                        backgroundColor: dotColor,
                        borderRadius: 3.5,
                        height: 7,
                        marginRight: 7,
                        width: 7,
                      }}
                    />
                    <Typography
                      variant="meta"
                      style={{
                        color: selected
                          ? LIGHT_THEME.text.inverse
                          : LIGHT_THEME.text.secondary,
                        fontSize: 13,
                        lineHeight: 16,
                      }}
                    >
                      {titleCase(category)}
                    </Typography>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={{
                backgroundColor: LIGHT_THEME.border.warmSubtle,
                height: 1,
                marginBottom: 14,
                marginTop: 16,
              }}
            />

            <Eyebrow style={{ letterSpacing: 1, marginBottom: 8 }}>Why it matters</Eyebrow>
            <TextInput
              accessibilityLabel="Why this goal matters"
              multiline
              numberOfLines={2}
              onChangeText={setWhyText}
              placeholder="Why is this worth it to you? What changes when you get there?"
              placeholderTextColor={LIGHT_THEME.text.muted}
              style={{
                color: LIGHT_THEME.text.accent,
                fontFamily: 'Lora-Italic',
                fontSize: 16,
                fontStyle: 'italic',
                lineHeight: 24.8,
                minHeight: 50,
                outlineWidth: 0,
                padding: 0,
                textAlignVertical: 'top',
              }}
              value={whyText}
            />
          </FormCard>

          <FormCard>
            <Eyebrow style={{ marginBottom: 14 }}>Set a deadline</Eyebrow>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 28 }}>
              <View>
                <Typography
                  variant="field-label"
                  style={{ fontSize: 13, marginBottom: 8 }}
                >
                  Target date{' '}
                  <Typography
                    variant="field-label"
                    style={{ color: LIGHT_THEME.feedback.danger, fontSize: 13 }}
                  >
                    *
                  </Typography>
                </Typography>
                <DateField
                  error={deadlineError}
                  key={deadline ? 'selected-deadline' : 'empty-deadline'}
                  onBlur={(value) => {
                    setDeadline(value);
                    setDeadlineError(validateDeadline(value, true).error);
                  }}
                  onChange={handleDeadlineChange}
                  value={deadline}
                />
                {deadlineError ? (
                  <Typography
                    variant="caption"
                    style={{
                      color: LIGHT_THEME.feedback.danger,
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
                    {deadlineError}
                  </Typography>
                ) : null}
              </View>

              <View style={{ flex: 1, minWidth: 220 }}>
                <Typography
                  variant="field-label"
                  style={{ fontSize: 13, marginBottom: 8 }}
                >
                  Link to a project{' '}
                  <Typography
                    variant="field-label"
                    style={{
                      color: LIGHT_THEME.text.muted,
                      fontFamily: 'Inter-Regular',
                      fontSize: 13,
                    }}
                  >
                    (optional)
                  </Typography>
                </Typography>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {projects.map((project, index) => {
                    const selected = selectedProjectId === project.id;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={project.id}
                        onPress={() =>
                          setSelectedProjectId((current) =>
                            current === project.id ? null : project.id,
                          )
                        }
                        style={({ pressed }) => ({
                          alignItems: 'center',
                          backgroundColor: selected
                            ? LIGHT_THEME.background.sidebar
                            : '#FFFFFF',
                          borderColor: selected
                            ? LIGHT_THEME.background.sidebar
                            : LIGHT_THEME.background.subtle,
                          borderRadius: 999,
                          borderWidth: 1,
                          flexDirection: 'row',
                          opacity: pressed ? 0.72 : 1,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                        })}
                      >
                        <View
                          style={{
                            backgroundColor:
                              PROJECT_DOT_COLORS[index % PROJECT_DOT_COLORS.length],
                            borderRadius: 3.5,
                            height: 7,
                            marginRight: 7,
                            width: 7,
                          }}
                        />
                        <Typography
                          variant="meta"
                          style={{
                            color: selected
                              ? LIGHT_THEME.text.inverse
                              : LIGHT_THEME.text.secondary,
                            fontSize: 13,
                            lineHeight: 16,
                          }}
                        >
                          {project.title}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View
              style={{
                alignItems: 'flex-start',
                backgroundColor: LIGHT_THEME.background.goalCard,
                borderColor: LIGHT_THEME.border.warmSubtle,
                borderRadius: 12,
                borderWidth: 1,
                flexDirection: 'row',
                gap: 10,
                marginTop: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Typography
                variant="body"
                style={{ color: LIGHT_THEME.text.accent, fontSize: 14, marginTop: 1 }}
              >
                ◷
              </Typography>
              <Typography
                variant="body"
                style={{
                  color: LIGHT_THEME.text.secondary,
                  flex: 1,
                  fontSize: 12.5,
                  lineHeight: 19.375,
                }}
              >
                Progress is measured against this date. As the deadline approaches your goal
                naturally fills toward{' '}
                <Typography
                  variant="body"
                  style={{
                    color: LIGHT_THEME.text.primary,
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 12.5,
                  }}
                >
                  100%
                </Typography>{' '}
                — so even partial effort still counts as progress.
              </Typography>
            </View>
          </FormCard>

          <FormCard>
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <Eyebrow>Your rhythm</Eyebrow>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
                <Typography
                  variant="caption"
                  style={{ color: LIGHT_THEME.text.secondary, fontSize: 12 }}
                >
                  Track a cadence
                </Typography>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: trackable }}
                  onPress={() => setTrackable((current) => !current)}
                  style={({ pressed }) => ({
                    backgroundColor: trackable
                      ? LIGHT_THEME.accent.primary
                      : LIGHT_THEME.border.input,
                    borderRadius: 13,
                    height: 26,
                    justifyContent: 'center',
                    opacity: pressed ? 0.78 : 1,
                    padding: 3,
                    width: 46,
                  })}
                >
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 10,
                      height: 20,
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.25,
                      shadowRadius: 2,
                      transform: [{ translateX: trackable ? 20 : 0 }],
                      width: 20,
                    }}
                  />
                </Pressable>
              </View>
            </View>

            {trackable ? (
              <View style={{ paddingTop: 14 }}>
                <Typography
                  variant="field-label"
                  style={{ fontSize: 14, marginBottom: 3 }}
                >
                  How often will you show up?
                </Typography>
                <Typography
                  variant="caption"
                  style={{ color: LIGHT_THEME.text.muted, fontSize: 12.5, marginBottom: 14 }}
                >
                  Pick a pace you can realistically keep — consistency beats intensity.
                </Typography>

                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: LIGHT_THEME.background.input,
                    borderRadius: 10,
                    flexDirection: 'row',
                    marginBottom: 20,
                    padding: 3,
                  }}
                >
                  {(['week', 'month'] as const).map((option) => {
                    const active = period === option;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        key={option}
                        onPress={() => handlePeriodChange(option)}
                        style={({ pressed }) => ({
                          backgroundColor: active ? '#FFFFFF' : 'transparent',
                          borderRadius: 8,
                          elevation: active ? 1 : 0,
                          opacity: pressed ? 0.7 : 1,
                          paddingHorizontal: 16,
                          paddingVertical: 7,
                          shadowColor: '#000000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: active ? 0.08 : 0,
                          shadowRadius: active ? 3 : 0,
                        })}
                      >
                        <Typography
                          variant="meta"
                          style={{
                            color: active
                              ? LIGHT_THEME.text.primary
                              : LIGHT_THEME.text.secondary,
                            fontFamily: active ? 'Inter-SemiBold' : 'Inter-Medium',
                            fontSize: 13,
                            lineHeight: 18,
                          }}
                        >
                          per {option}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>

                <View
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 20,
                    marginBottom: 20,
                  }}
                >
                  <View
                    style={{
                      alignItems: 'center',
                      borderColor: LIGHT_THEME.border.warm,
                      borderRadius: 12,
                      borderWidth: 1,
                      flexDirection: 'row',
                      overflow: 'hidden',
                    }}
                  >
                    <Pressable
                      accessibilityLabel="Decrease cadence"
                      accessibilityRole="button"
                      onPress={() => setCount((current) => Math.max(current - 1, 1))}
                      style={({ pressed }) => ({
                        alignItems: 'center',
                        height: 44,
                        justifyContent: 'center',
                        opacity: pressed ? 0.6 : 1,
                        width: 44,
                      })}
                    >
                      <Typography
                        variant="body"
                        style={{ color: LIGHT_THEME.text.accent, fontSize: 22, lineHeight: 26 }}
                      >
                        −
                      </Typography>
                    </Pressable>
                    <Typography
                      variant="body"
                      style={{
                        color: LIGHT_THEME.text.primary,
                        fontFamily: 'Inter-SemiBold',
                        fontSize: 24,
                        textAlign: 'center',
                        width: 56,
                      }}
                    >
                      {count}
                    </Typography>
                    <Pressable
                      accessibilityLabel="Increase cadence"
                      accessibilityRole="button"
                      onPress={() =>
                        setCount((current) =>
                          Math.min(current + 1, period === 'week' ? 7 : 30),
                        )
                      }
                      style={({ pressed }) => ({
                        alignItems: 'center',
                        height: 44,
                        justifyContent: 'center',
                        opacity: pressed ? 0.6 : 1,
                        width: 44,
                      })}
                    >
                      <Typography
                        variant="body"
                        style={{ color: LIGHT_THEME.text.accent, fontSize: 22, lineHeight: 26 }}
                      >
                        +
                      </Typography>
                    </Pressable>
                  </View>

                  <View>
                    <Typography
                      variant="body"
                      style={{
                        color: LIGHT_THEME.text.primary,
                        fontFamily: 'Lora-Regular',
                        fontSize: 18,
                        fontWeight: '600',
                        lineHeight: 24,
                      }}
                    >
                      {count}× a {period}
                    </Typography>
                    <Typography
                      variant="caption"
                      style={{ color: LIGHT_THEME.text.secondary, fontSize: 12, marginTop: 2 }}
                    >
                      A checkmark lands each time you log progress.
                    </Typography>
                  </View>
                </View>

                {period === 'week' ? (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {DAY_LABELS.map((label, index) => {
                      const filled = index < count;
                      return (
                        <View
                          key={`${label}-${index}`}
                          style={{
                            alignItems: 'center',
                            backgroundColor: filled
                              ? LIGHT_THEME.accent.primary
                              : LIGHT_THEME.background.input,
                            borderRadius: 15,
                            height: 30,
                            justifyContent: 'center',
                            width: 30,
                          }}
                        >
                          <Typography
                            variant="caption"
                            style={{
                              color: filled ? '#FFFFFF' : LIGHT_THEME.text.muted,
                              fontFamily: 'Inter-SemiBold',
                              fontSize: 12,
                            }}
                          >
                            {label}
                          </Typography>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : (
              <View
                style={{
                  alignItems: 'flex-start',
                  flexDirection: 'row',
                  gap: 12,
                  paddingTop: 14,
                }}
              >
                <View
                  style={{
                    backgroundColor: LIGHT_THEME.text.muted,
                    borderRadius: 4,
                    flexShrink: 0,
                    height: 8,
                    marginTop: 6,
                    width: 8,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Typography
                    variant="field-label"
                    style={{ fontSize: 14, marginBottom: 3 }}
                  >
                    A direction, not a streak
                  </Typography>
                  <Typography
                    variant="body"
                    style={{
                      color: LIGHT_THEME.text.secondary,
                      fontSize: 13,
                      lineHeight: 19.5,
                    }}
                  >
                    This stays a narrative goal — no checkmarks or streaks, just something
                    meaningful to move toward.
                  </Typography>
                </View>
              </View>
            )}
          </FormCard>

          <FormCard last>
            <Eyebrow style={{ marginBottom: 2 }}>Milestones</Eyebrow>

            {milestones.length === 0 ? (
              <View style={{ paddingBottom: 4, paddingTop: 12 }}>
                <Typography
                  variant="description"
                  style={{ color: LIGHT_THEME.text.secondary, fontSize: 14, lineHeight: 21 }}
                >
                  What will you track to know it&apos;s working? A goal to lose weight might
                  track weight 3–5× a week and log workouts. Add each measure yourself.
                </Typography>
              </View>
            ) : null}

            {milestones.length > 0 ? (
              <View style={{ gap: 8, marginTop: 14 }}>
                {milestones.map((milestone) => {
                  const meta = TYPE_META[milestone.type];
                  return (
                    <View
                      key={milestone.id}
                      style={{
                        alignItems: 'center',
                        backgroundColor: LIGHT_THEME.background.goalCard,
                        borderColor: LIGHT_THEME.border.warmSubtle,
                        borderRadius: 12,
                        borderWidth: 1,
                        flexDirection: 'row',
                        gap: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: meta.backgroundColor,
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                        }}
                      >
                        <Typography
                          variant="badge-text"
                          style={{
                            color: meta.color,
                            fontFamily: 'Inter-SemiBold',
                            fontSize: 11,
                          }}
                        >
                          {meta.label}
                        </Typography>
                      </View>
                      <Typography
                        variant="content"
                        style={{ color: LIGHT_THEME.text.primary, flex: 1, fontSize: 14 }}
                      >
                        {milestone.title}
                      </Typography>
                      <Pressable
                        accessibilityLabel={`Remove ${milestone.title}`}
                        accessibilityRole="button"
                        hitSlop={6}
                        onPress={() =>
                          setMilestones((current) =>
                            current.filter((item) => item.id !== milestone.id),
                          )
                        }
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.55 : 1,
                          padding: 4,
                        })}
                      >
                        <Typography
                          variant="body"
                          style={{ color: LIGHT_THEME.text.muted, fontSize: 18, lineHeight: 18 }}
                        >
                          ×
                        </Typography>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {showAddForm ? (
              <View
                style={{
                  backgroundColor: LIGHT_THEME.background.page,
                  borderColor: LIGHT_THEME.background.subtle,
                  borderRadius: 12,
                  borderWidth: 1,
                  marginTop: 12,
                  padding: 14,
                }}
              >
                <TextInput
                  accessibilityLabel="Milestone name"
                  autoFocus
                  onChangeText={setDraftTitle}
                  onSubmitEditing={addMilestone}
                  placeholder="Milestone name"
                  placeholderTextColor={LIGHT_THEME.text.muted}
                  style={{
                    backgroundColor: LIGHT_THEME.background.input,
                    borderColor: LIGHT_THEME.background.subtle,
                    borderRadius: 10,
                    borderWidth: 1,
                    color: LIGHT_THEME.text.primary,
                    fontFamily: 'Inter-Regular',
                    fontSize: 13,
                    marginBottom: 10,
                    outlineWidth: 0,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                  }}
                  value={draftTitle}
                />

                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  {GOAL_MEASURABLE_TYPES.map((type) => {
                    const meta = TYPE_META[type];
                    const active = draftType === type;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        key={type}
                        onPress={() => setDraftType(type)}
                        style={({ pressed }) => ({
                          alignItems: 'center',
                          backgroundColor: active ? meta.backgroundColor : 'transparent',
                          borderColor: active ? meta.color : LIGHT_THEME.background.subtle,
                          borderRadius: 8,
                          borderWidth: 1,
                          flex: 1,
                          opacity: pressed ? 0.68 : 1,
                          paddingVertical: 7,
                        })}
                      >
                        <Typography
                          variant="caption"
                          style={{
                            color: active ? meta.color : LIGHT_THEME.text.muted,
                            fontFamily: 'Inter-Medium',
                            fontSize: 12,
                          }}
                        >
                          {meta.label}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={cancelAddForm}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      borderColor: LIGHT_THEME.background.subtle,
                      borderRadius: 8,
                      borderWidth: 1,
                      flex: 1,
                      opacity: pressed ? 0.65 : 1,
                      padding: 9,
                    })}
                  >
                    <Typography
                      variant="meta"
                      style={{ color: LIGHT_THEME.text.secondary, fontSize: 13 }}
                    >
                      Cancel
                    </Typography>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !draftTitle.trim() }}
                    disabled={!draftTitle.trim()}
                    onPress={addMilestone}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      backgroundColor: LIGHT_THEME.accent.primary,
                      borderRadius: 8,
                      flex: 1,
                      opacity: !draftTitle.trim() ? 0.45 : pressed ? 0.75 : 1,
                      padding: 9,
                    })}
                  >
                    <Typography
                      variant="meta"
                      style={{ color: '#FFFFFF', fontFamily: 'Inter-SemiBold', fontSize: 13 }}
                    >
                      Add
                    </Typography>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
              <Pressable
                accessibilityRole="button"
                onPress={openAddForm}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  borderColor: LIGHT_THEME.border.input,
                  borderRadius: 10,
                  borderStyle: 'dashed',
                  borderWidth: 1,
                  flexDirection: 'row',
                  opacity: pressed ? 0.6 : 1,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                })}
              >
                <Typography
                  variant="meta"
                  style={{ color: LIGHT_THEME.text.secondary, fontSize: 13 }}
                >
                  ＋ Add milestone
                </Typography>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !aiAssistEnabled || suggesting }}
                disabled={!aiAssistEnabled || suggesting}
                onPress={() => void suggestMilestone()}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: '#F1F6F2',
                  borderColor: '#D6E4DB',
                  borderRadius: 10,
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: 6,
                  opacity: !aiAssistEnabled || suggesting ? 0.45 : pressed ? 0.72 : 1,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                })}
              >
                <Typography
                  variant="meta"
                  style={{ color: LIGHT_THEME.text.accent, fontSize: 13 }}
                >
                  ✦
                </Typography>
                <Typography
                  variant="meta"
                  style={{
                    color: LIGHT_THEME.text.accent,
                    fontFamily: 'Inter-Medium',
                    fontSize: 13,
                  }}
                >
                  Suggest one with Ohara
                </Typography>
              </Pressable>
            </View>
          </FormCard>

          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: 8,
              marginBottom: 16,
              paddingHorizontal: 2,
            }}
          >
            <Typography
              variant="meta"
              style={{ color: LIGHT_THEME.text.muted, fontSize: 13 }}
            >
              ✦
            </Typography>
            <Typography
              variant="body"
              style={{
                color: LIGHT_THEME.text.muted,
                flex: 1,
                fontSize: 12.5,
                lineHeight: 18.75,
              }}
            >
              Ohara only ever suggests. Nothing is written until you create the goal yourself.
            </Typography>
          </View>

          {submitError ? (
            <Typography
              accessibilityRole="alert"
              variant="caption"
              style={{
                color: LIGHT_THEME.feedback.danger,
                fontSize: 12,
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              {submitError}
            </Typography>
          ) : null}

          <CreateButton
            enabled={createEnabled}
            onPress={handleCreateGoal}
            saving={saving}
          />
        </ScrollView>
      </View>

      {created ? (
        <View
          accessibilityViewIsModal
          style={[
            StyleSheet.absoluteFillObject,
            {
              alignItems: 'center',
              backgroundColor: 'rgba(30,50,38,0.55)',
              justifyContent: 'center',
              zIndex: 50,
            },
          ]}
        >
          <Animated.View
            style={{
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              elevation: 12,
              marginHorizontal: 24,
              maxWidth: 540,
              opacity: overlayOpacity,
              paddingHorizontal: 48,
              paddingVertical: 40,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.25,
              shadowRadius: 60,
              transform: [{ scale: overlayScale }],
              width: '100%',
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: '#EAF3ED',
                borderRadius: 32,
                height: 64,
                justifyContent: 'center',
                marginBottom: 18,
                width: 64,
              }}
            >
              <Typography
                variant="body"
                style={{ color: LIGHT_THEME.text.accent, fontSize: 32, lineHeight: 38 }}
              >
                ✓
              </Typography>
            </View>
            <Typography
              variant="title"
              style={{
                color: LIGHT_THEME.text.primary,
                fontFamily: 'Lora-Regular',
                fontSize: 22,
                fontWeight: '600',
                marginBottom: 6,
                textAlign: 'center',
              }}
            >
              {titleText.trim() || 'New goal'}
            </Typography>
            <Typography
              variant="body"
              style={{
                color: LIGHT_THEME.text.secondary,
                fontSize: 14,
                marginBottom: 24,
                textAlign: 'center',
              }}
            >
              Your goal is created — exactly as you shaped it.
            </Typography>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              <Pressable
                accessibilityRole="button"
                onPress={resetForm}
                style={({ pressed }) => ({
                  borderColor: LIGHT_THEME.border.warm,
                  borderRadius: 999,
                  borderWidth: 1,
                  opacity: pressed ? 0.65 : 1,
                  paddingHorizontal: 22,
                  paddingVertical: 11,
                })}
              >
                <Typography
                  variant="body"
                  style={{
                    color: LIGHT_THEME.text.accent,
                    fontFamily: 'Inter-Medium',
                    fontSize: 14,
                  }}
                >
                  Create another
                </Typography>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !createdGoalId }}
                disabled={!createdGoalId}
                onPress={goToCreatedGoal}
                style={({ pressed }) => ({
                  backgroundColor: LIGHT_THEME.accent.primary,
                  borderRadius: 999,
                  opacity: !createdGoalId ? 0.45 : pressed ? 0.75 : 1,
                  paddingHorizontal: 22,
                  paddingVertical: 11,
                })}
              >
                <Typography
                  variant="body"
                  style={{
                    color: '#FFFFFF',
                    fontFamily: 'Inter-Medium',
                    fontSize: 14,
                  }}
                >
                  Go back to goal
                </Typography>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
