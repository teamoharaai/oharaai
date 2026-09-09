import { useEffect, useRef, useState } from 'react';
import { Easing, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import {
  DatePicker,
  formatCalendarDate,
  parseCalendarDate,
} from '@/components/ui/DatePicker';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { FONT, RADIUS, SPACE, TYPE } from '@/constants/design';
import { authedFetch } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/contracts';
import type { CreateGoalWithMilestonesAndTrackersResult } from '@/lib/db/goals';
import { useGoalStore } from '../store';
import type { GoalWithDetails, Tracker } from '../types';
import { goalWorkspaceHref } from '../navigation';
import { useThemeColors } from '@/store/uiStore';

type ExtendGoalStep = 1 | 2 | 3;
type DeadlineOption = 30 | 60 | 90 | 'custom';

export interface ExtendGoalState {
  currentStep: ExtendGoalStep;
  title: string;
  deadline: string | null;
  reflection: string;
}

interface ExtendGoalModalProps {
  visible: boolean;
  goal: GoalWithDetails;
  onClose: () => void;
}

const EXTEND_MODAL_MOTION = {
  backdropDuration: 200,
  backdropEasing: Easing.bezier(0.25, 0.1, 0.25, 1),
  contentDuration: 280,
  initialTranslateY: 14,
  contentEasing: Easing.bezier(0.2, 0.7, 0.2, 1),
};

const DEADLINE_PRESETS = [30, 60, 90] as const;

function createInitialState(title: string): ExtendGoalState {
  return {
    currentStep: 1,
    title,
    deadline: null,
    reflection: '',
  };
}

function getChecklistComplete(tracker: Tracker): boolean {
  return tracker.currentValue === 1;
}

function getDateAfterDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function formatDateInput(date: Date): string {
  return formatCalendarDate(date);
}

function getMinimumCustomDate(): string {
  return formatDateInput(getDateAfterDays(1));
}

function getCustomDeadline(value: string): { iso: string | null; error: string | null } {
  const parsed = parseCalendarDate(value);
  if (!parsed) {
    return { iso: null, error: 'Choose a valid date.' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed.getTime() <= today.getTime()) {
    return { iso: null, error: 'Deadline must be in the future.' };
  }

  // Noon preserves the selected local calendar date when serialized to ISO.
  parsed.setHours(12, 0, 0, 0);
  return { iso: parsed.toISOString(), error: null };
}

function formatDeadlineReadout(deadline: string): string {
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(new Date(deadline));
}

function TrackerValue({ tracker }: { tracker: Tracker }) {
  const colors = useThemeColors();
  if (tracker.type === 'checklist') {
    const complete = getChecklistComplete(tracker);
    return (
      <Text
        style={{
          color: complete ? colors.text.accent : colors.text.muted,
          ...TYPE.caption,
          fontFamily: FONT.ui.semibold,
        }}
      >
        {complete ? 'Done' : 'Not done'}
      </Text>
    );
  }

  const unit = tracker.targetUnit ? ` ${tracker.targetUnit}` : '';
  return (
    <Text style={{ color: colors.text.primary, ...TYPE.caption, fontFamily: FONT.ui.semibold }}>
      {tracker.currentValue}/{tracker.targetValue ?? '—'}{unit}
    </Text>
  );
}

function SummaryStep({
  goal,
  onClose,
  onContinue,
}: {
  goal: GoalWithDetails;
  onClose: () => void;
  onContinue: () => void;
}) {
  const colors = useThemeColors();
  return (
    <>
      <Typography variant="heading" style={{ marginBottom: SPACE.sm }}>
        This goal has ended.
      </Typography>
      <Typography variant="body-small" style={{ marginBottom: SPACE['2xl'] }}>
        Here&apos;s where you finished this phase.
      </Typography>

      <View
        style={{
          backgroundColor: colors.background.subtle,
          borderColor: colors.border.divider,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          marginBottom: SPACE['2xl'],
          paddingHorizontal: SPACE.xl,
        }}
      >
        {goal.trackers.length === 0 ? (
          <Text
            style={{
              color: colors.text.secondary,
              ...TYPE.bodySmall,
              paddingVertical: SPACE.xl,
            }}
          >
            No trackers were added during this phase.
          </Text>
        ) : (
          goal.trackers.map((tracker, index) => (
            <View
              key={tracker.id}
              style={{
                alignItems: 'center',
                borderBottomColor: colors.border.divider,
                borderBottomWidth: index === goal.trackers.length - 1 ? 0 : 1,
                flexDirection: 'row',
                gap: SPACE.xl,
                justifyContent: 'space-between',
                paddingVertical: SPACE.lg,
              }}
            >
              <Text
                numberOfLines={2}
                style={{
                  color: colors.text.primary,
                  flex: 1,
                  ...TYPE.bodySmall,
                  fontFamily: FONT.ui.medium,
                }}
              >
                {tracker.title}
              </Text>
              <TrackerValue tracker={tracker} />
            </View>
          ))
        )}
      </View>

      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
        <Button onPress={onClose} size="compact" variant="outline">
          Not now
        </Button>
        <Button onPress={onContinue} size="compact" style={{ flexGrow: 1 }}>
          Extend into a new phase
        </Button>
      </View>
    </>
  );
}

function DeadlineStep({
  customDate,
  deadline,
  onBack,
  onCustomDateChange,
  onNext,
  onSelectDeadline,
  onTitleChange,
  selectedOption,
  title,
}: {
  customDate: string;
  deadline: string | null;
  onBack: () => void;
  onCustomDateChange: (value: string) => void;
  onNext: () => void;
  onSelectDeadline: (option: DeadlineOption) => void;
  onTitleChange: (value: string) => void;
  selectedOption: DeadlineOption | null;
  title: string;
}) {
  const colors = useThemeColors();
  const customValidation = getCustomDeadline(customDate);
  const titleValid = title.trim().length > 0;
  const deadlineValid = selectedOption === 'custom'
    ? customValidation.iso !== null
    : deadline !== null;
  const nextEnabled = titleValid && deadlineValid;

  return (
    <>
      <Typography variant="heading" style={{ marginBottom: SPACE.sm }}>
        Begin the next phase.
      </Typography>
      <Typography variant="body-small" style={{ marginBottom: SPACE['2xl'] }}>
        Give this next stretch a name and a new deadline.
      </Typography>

      <Typography variant="eyebrow" style={{ marginBottom: SPACE.md }}>
        GOAL TITLE
      </Typography>
      <TextInput
        accessibilityLabel="Goal title"
        onChangeText={onTitleChange}
        placeholder="Name this next phase"
        placeholderTextColor={colors.text.muted}
        style={{
          backgroundColor: colors.background.input,
          borderColor: titleValid ? colors.border.input : colors.feedback.danger.text,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          color: colors.text.primary,
          ...TYPE.control,
          marginBottom: titleValid ? SPACE['2xl'] : SPACE.xs,
          paddingHorizontal: SPACE.lg,
          paddingVertical: SPACE.lg,
        }}
        value={title}
      />
      {!titleValid && (
        <Typography variant="caption" style={{ color: colors.feedback.danger.text, marginBottom: SPACE['2xl'] }}>
          A title is required.
        </Typography>
      )}

      <Typography variant="eyebrow" style={{ marginBottom: SPACE.md }}>
        DEADLINE
      </Typography>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginBottom: selectedOption === 'custom' ? SPACE.lg : SPACE.xl }}>
        {DEADLINE_PRESETS.map((days) => (
          <DeadlineOptionButton
            key={days}
            label={`${days} days`}
            onPress={() => onSelectDeadline(days)}
            selected={selectedOption === days}
          />
        ))}
        <DeadlineOptionButton
          label="Custom"
          onPress={() => onSelectDeadline('custom')}
          selected={selectedOption === 'custom'}
        />
      </View>

      {selectedOption === 'custom' && (
        <View style={{ marginBottom: SPACE.xl }}>
          <Typography variant="body-small" style={{ marginBottom: SPACE.sm }}>
            Choose a future date
          </Typography>
          <DatePicker
            accessibilityLabel="Custom deadline"
            error={customValidation.iso === null ? customValidation.error : null}
            minimumDate={getMinimumCustomDate()}
            onChange={onCustomDateChange}
            placeholder="Choose a custom deadline"
            style={{ width: '100%' }}
            value={customDate}
          />
          {customValidation.error && (
            <Typography variant="caption" style={{ color: colors.feedback.danger.text, marginTop: SPACE.sm }}>
              {customValidation.error}
            </Typography>
          )}
        </View>
      )}

      {deadline && deadlineValid && (
        <View style={{ backgroundColor: colors.background.subtle, borderRadius: RADIUS.md, marginBottom: SPACE['2xl'], paddingHorizontal: SPACE.lg, paddingVertical: SPACE.lg }}>
          <Typography variant="caption" style={{ marginBottom: SPACE.xs }}>New deadline</Typography>
          <Text style={{ color: colors.text.accent, ...TYPE.control, fontFamily: FONT.ui.semibold }}>
            {formatDeadlineReadout(deadline)}
          </Text>
        </View>
      )}

      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
        <Button onPress={onBack} size="compact" variant="outline">Back</Button>
        <Button disabled={!nextEnabled} onPress={onNext} size="compact" style={{ flex: 1 }}>Next</Button>
      </View>
    </>
  );
}

function DeadlineOptionButton({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        backgroundColor: selected ? colors.background.selectedRow : colors.background.card,
        borderColor: selected ? colors.border.accent : colors.border.input,
        borderRadius: RADIUS.round,
        borderWidth: 1,
        paddingHorizontal: SPACE.lg,
        paddingVertical: SPACE.md,
      }}
    >
      <Text style={{ color: selected ? colors.text.accent : colors.text.secondary, ...TYPE.control }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ReflectionStep({
  error,
  isSubmitting,
  onBack,
  onReflectionChange,
  onSubmit,
  reflection,
}: {
  error: string | null;
  isSubmitting: boolean;
  onBack: () => void;
  onReflectionChange: (value: string) => void;
  onSubmit: () => void;
  reflection: string;
}) {
  const colors = useThemeColors();
  return (
    <>
      <Typography variant="heading" style={{ marginBottom: SPACE['2xl'] }}>
        Anything to remember from this phase?
      </Typography>
      <TextInput
        accessibilityLabel="Reflection"
        editable={!isSubmitting}
        multiline
        onChangeText={onReflectionChange}
        placeholder="I didn't hit the number, but…"
        placeholderTextColor={colors.text.muted}
        style={{
          backgroundColor: colors.background.input,
          borderColor: colors.border.input,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          color: colors.text.primary,
          ...TYPE.body,
          marginBottom: error ? SPACE.sm : SPACE['2xl'],
          minHeight: 148,
          paddingHorizontal: SPACE.lg,
          paddingVertical: SPACE.lg,
          textAlignVertical: 'top',
        }}
        value={reflection}
      />
      {error && (
        <Typography variant="caption" style={{ color: colors.feedback.danger.text, marginBottom: SPACE['2xl'] }}>
          {error}
        </Typography>
      )}
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
        <Button disabled={isSubmitting} onPress={onBack} size="compact" variant="outline">Back</Button>
        <Button disabled={isSubmitting} onPress={onSubmit} size="compact" variant="ghost">Skip</Button>
        <Button loading={isSubmitting} onPress={onSubmit} size="compact" style={{ flex: 1 }}>
          Start next phase
        </Button>
      </View>
    </>
  );
}

export function ExtendGoalModal({ visible, goal, onClose }: ExtendGoalModalProps) {
  const colors = useThemeColors();
  const upsertGoal = useGoalStore((store) => store.upsertGoal);
  const [state, setState] = useState<ExtendGoalState>(() => createInitialState(goal.title));
  const [selectedDeadlineOption, setSelectedDeadlineOption] = useState<DeadlineOption | null>(null);
  const [customDate, setCustomDate] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInFlightRef = useRef(false);
  const previousVisibleRef = useRef(visible);

  useEffect(() => {
    const wasVisible = previousVisibleRef.current;
    previousVisibleRef.current = visible;

    // Do not reset on every render while the modal is closed. The canonical
    // Goals workspace keeps this modal mounted, and repeated closed-state
    // resets can create a nested update loop in the web renderer.
    if (visible !== wasVisible) {
      setState(createInitialState(goal.title));
      setSelectedDeadlineOption(null);
      setCustomDate('');
      setSubmitError(null);
      setIsSubmitting(false);
      submissionInFlightRef.current = false;
    }
  }, [goal.title, visible]);

  function handleClose() {
    if (submissionInFlightRef.current) return;
    setState(createInitialState(goal.title));
    setSelectedDeadlineOption(null);
    setCustomDate('');
    setSubmitError(null);
    onClose();
  }

  function goToStepTwo() {
    setState((current) => ({ ...current, currentStep: 2 }));
  }

  function selectDeadline(option: DeadlineOption) {
    setSelectedDeadlineOption(option);
    if (option === 'custom') {
      const customDeadline = getCustomDeadline(customDate);
      setState((current) => ({ ...current, deadline: customDeadline.iso }));
      return;
    }
    setState((current) => ({ ...current, deadline: getDateAfterDays(option).toISOString() }));
  }

  function updateCustomDate(value: string) {
    setCustomDate(value);
    const customDeadline = getCustomDeadline(value);
    setState((current) => ({ ...current, deadline: customDeadline.iso }));
  }

  async function submitExtension() {
    if (submissionInFlightRef.current || !state.deadline || !state.title.trim()) return;

    const normalizedReflection = state.reflection.trim();
    submissionInFlightRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await authedFetch(`/api/goals/${goal.id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deadline: state.deadline,
          title: state.title,
          reflection: normalizedReflection || undefined,
        }),
      });
      const body = (await response.json()) as ApiResponse<CreateGoalWithMilestonesAndTrackersResult>;

      if (!body.ok) {
        if (response.status === 409) {
          setSubmitError('This goal was already extended.');
        } else if (response.status === 400) {
          setSubmitError(body.error.message || 'Could not extend this goal.');
        } else {
          setSubmitError('Could not extend this goal. Please try again.');
        }
        return;
      }

      if (!body.data.goalId) {
        setSubmitError('Could not extend this goal. Please try again.');
        return;
      }

      const newGoalId = body.data.goalId;
      upsertGoal({
        ...goal,
        has_successor: true,
        successor: {
          id: newGoalId,
          reflection: normalizedReflection || null,
          reflectedAt: normalizedReflection ? new Date() : null,
        },
      });
      setState(createInitialState(goal.title));
      setSelectedDeadlineOption(null);
      setCustomDate('');
      setSubmitError(null);
      onClose();
      router.replace(goalWorkspaceHref(newGoalId) as never);
    } catch {
      setSubmitError('Could not extend this goal. Please try again.');
    } finally {
      submissionInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      showCloseButton={false}
      closeOnBackdropPress={!isSubmitting}
      motion={EXTEND_MODAL_MOTION}
      contentStyle={{
        backgroundColor: colors.background.card,
        borderRadius: RADIUS.xl,
        maxHeight: '90%',
        maxWidth: 468,
        padding: SPACE['3xl'],
      }}
    >
      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE['3xl'] }}>
        {([1, 2, 3] as const).map((step) => (
          <View
            key={step}
            style={{
              backgroundColor: step <= state.currentStep ? colors.accent.primary : colors.border.divider,
              borderRadius: RADIUS.round,
              flex: 1,
              height: 4,
            }}
          />
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {state.currentStep === 1 ? (
          <SummaryStep goal={goal} onClose={handleClose} onContinue={goToStepTwo} />
        ) : state.currentStep === 2 ? (
          <DeadlineStep
            customDate={customDate}
            deadline={state.deadline}
            onBack={() => setState((current) => ({ ...current, currentStep: 1 }))}
            onCustomDateChange={updateCustomDate}
            onNext={() => setState((current) => ({ ...current, currentStep: 3 }))}
            onSelectDeadline={selectDeadline}
            onTitleChange={(title) => setState((current) => ({ ...current, title }))}
            selectedOption={selectedDeadlineOption}
            title={state.title}
          />
        ) : (
          <ReflectionStep
            error={submitError}
            isSubmitting={isSubmitting}
            onBack={() => setState((current) => ({ ...current, currentStep: 2 }))}
            onReflectionChange={(reflection) => {
              setState((current) => ({ ...current, reflection }));
              if (submitError) setSubmitError(null);
            }}
            onSubmit={submitExtension}
            reflection={state.reflection}
          />
        )}
      </ScrollView>
    </Modal>
  );
}
