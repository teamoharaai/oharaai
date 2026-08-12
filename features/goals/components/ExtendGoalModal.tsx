import { useEffect, useRef, useState } from 'react';
import { Easing, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import {
  DatePicker,
  formatCalendarDate,
  parseCalendarDate,
} from '@/components/ui/DatePicker';
import { Modal } from '@/components/ui/Modal';
import { authedFetch } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/contracts';
import type { CreateGoalWithMilestonesAndTrackersResult } from '@/lib/db/goals';
import { useGoalStore } from '../store';
import type { GoalWithDetails, Tracker } from '../types';
import { goalWorkspaceHref } from '../navigation';

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
  if (tracker.type === 'checklist') {
    const complete = getChecklistComplete(tracker);
    return (
      <Text
        style={{
          color: complete ? '#4A7C5F' : '#8A8172',
          fontFamily: 'Inter-SemiBold',
          fontSize: 13,
        }}
      >
        {complete ? 'Done' : 'Not done'}
      </Text>
    );
  }

  const unit = tracker.targetUnit ? ` ${tracker.targetUnit}` : '';
  return (
    <Text style={{ color: '#4A4339', fontFamily: 'Inter-SemiBold', fontSize: 13 }}>
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
  return (
    <>
      <Text
        style={{
          color: '#211F1A',
          fontFamily: 'Inter-Regular',
          fontSize: 28,
          lineHeight: 36,
          marginBottom: 7,
        }}
      >
        This goal has ended.
      </Text>
      <Text
        style={{
          color: '#6B6257',
          fontFamily: 'Inter-Regular',
          fontSize: 14,
          lineHeight: 21,
          marginBottom: 20,
        }}
      >
        Here&apos;s where you finished this phase.
      </Text>

      <View
        style={{
          backgroundColor: '#F6F0E4',
          borderColor: '#E7DEC9',
          borderRadius: 14,
          borderWidth: 1,
          marginBottom: 22,
          paddingHorizontal: 16,
        }}
      >
        {goal.trackers.length === 0 ? (
          <Text
            style={{
              color: '#8A8172',
              fontFamily: 'Inter-Regular',
              fontSize: 13,
              lineHeight: 19,
              paddingVertical: 16,
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
                borderBottomColor: '#E7DEC9',
                borderBottomWidth: index === goal.trackers.length - 1 ? 0 : 1,
                flexDirection: 'row',
                gap: 16,
                justifyContent: 'space-between',
                paddingVertical: 14,
              }}
            >
              <Text
                numberOfLines={2}
                style={{
                  color: '#211F1A',
                  flex: 1,
                  fontFamily: 'Inter-Medium',
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {tracker.title}
              </Text>
              <TrackerValue tracker={tracker} />
            </View>
          ))
        )}
      </View>

      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onClose}
          style={{ borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11 }}
        >
          <Text style={{ color: '#4A4339', fontFamily: 'Inter-SemiBold', fontSize: 13 }}>
            Not now
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onContinue}
          style={{
            backgroundColor: '#1E3226',
            borderRadius: 999,
            flexGrow: 1,
            paddingHorizontal: 18,
            paddingVertical: 11,
          }}
        >
          <Text
            style={{
              color: '#EDE7DA',
              fontFamily: 'Inter-SemiBold',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            Extend into a new phase
          </Text>
        </TouchableOpacity>
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
  const customValidation = getCustomDeadline(customDate);
  const titleValid = title.trim().length > 0;
  const deadlineValid = selectedOption === 'custom'
    ? customValidation.iso !== null
    : deadline !== null;
  const nextEnabled = titleValid && deadlineValid;

  return (
    <>
      <Text
        style={{
          color: '#211F1A',
          fontFamily: 'Inter-Regular',
          fontSize: 28,
          lineHeight: 36,
          marginBottom: 7,
        }}
      >
        Begin the next phase.
      </Text>
      <Text
        style={{
          color: '#6B6257',
          fontFamily: 'Inter-Regular',
          fontSize: 14,
          lineHeight: 21,
          marginBottom: 22,
        }}
      >
        Give this next stretch a name and a new deadline.
      </Text>

      <Text style={{ color: '#6B6257', fontFamily: 'Inter-SemiBold', fontSize: 11, letterSpacing: 1.2, marginBottom: 8 }}>
        GOAL TITLE
      </Text>
      <TextInput
        accessibilityLabel="Goal title"
        onChangeText={onTitleChange}
        placeholder="Name this next phase"
        placeholderTextColor="#A79E8E"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: titleValid ? '#D8D0C2' : '#C0483A',
          borderRadius: 10,
          borderWidth: 1,
          color: '#211F1A',
          fontFamily: 'Inter-Medium',
          fontSize: 15,
          marginBottom: titleValid ? 22 : 5,
          paddingHorizontal: 13,
          paddingVertical: 11,
        }}
        value={title}
      />
      {!titleValid && (
        <Text style={{ color: '#C0483A', fontFamily: 'Inter-Regular', fontSize: 12, marginBottom: 22 }}>
          A title is required.
        </Text>
      )}

      <Text style={{ color: '#6B6257', fontFamily: 'Inter-SemiBold', fontSize: 11, letterSpacing: 1.2, marginBottom: 8 }}>
        DEADLINE
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: selectedOption === 'custom' ? 12 : 18 }}>
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
        <View style={{ marginBottom: 18 }}>
          <Text style={{ color: '#6B6257', fontFamily: 'Inter-Regular', fontSize: 13, marginBottom: 7 }}>
            Choose a future date
          </Text>
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
            <Text style={{ color: '#C0483A', fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 6 }}>
              {customValidation.error}
            </Text>
          )}
        </View>
      )}

      {deadline && deadlineValid && (
        <View style={{ backgroundColor: '#F6F0E4', borderRadius: 10, marginBottom: 22, paddingHorizontal: 13, paddingVertical: 11 }}>
          <Text style={{ color: '#6B6257', fontFamily: 'Inter-Regular', fontSize: 12, marginBottom: 2 }}>New deadline</Text>
          <Text style={{ color: '#1E3226', fontFamily: 'Inter-SemiBold', fontSize: 15 }}>
            {formatDeadlineReadout(deadline)}
          </Text>
        </View>
      )}

      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onBack}
          style={{ borderColor: '#D8D0C2', borderRadius: 999, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 11 }}
        >
          <Text style={{ color: '#4A4339', fontFamily: 'Inter-SemiBold', fontSize: 13 }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: !nextEnabled }}
          disabled={!nextEnabled}
          onPress={onNext}
          style={{
            backgroundColor: '#1E3226',
            borderRadius: 999,
            flex: 1,
            opacity: nextEnabled ? 1 : 0.45,
            paddingHorizontal: 18,
            paddingVertical: 11,
          }}
        >
          <Text style={{ color: '#EDE7DA', fontFamily: 'Inter-SemiBold', fontSize: 13, textAlign: 'center' }}>Next</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function DeadlineOptionButton({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        backgroundColor: selected ? '#EEF4F0' : '#FFFFFF',
        borderColor: selected ? '#1E3226' : '#D8D0C2',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 9,
      }}
    >
      <Text style={{ color: selected ? '#1E3226' : '#4A4339', fontFamily: 'Inter-SemiBold', fontSize: 13 }}>
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
  return (
    <>
      <Text
        style={{
          color: '#211F1A',
          fontFamily: 'Inter-Regular',
          fontSize: 28,
          lineHeight: 36,
          marginBottom: 22,
        }}
      >
        Anything to remember from this phase?
      </Text>
      <TextInput
        accessibilityLabel="Reflection"
        editable={!isSubmitting}
        multiline
        onChangeText={onReflectionChange}
        placeholder="I didn't hit the number, but…"
        placeholderTextColor="#A79E8E"
        style={{
          backgroundColor: '#FCFAF4',
          borderColor: '#D8D2C8',
          borderRadius: 10,
          borderWidth: 1,
          color: '#211F1A',
          fontFamily: 'Inter-Regular',
          fontSize: 16,
          lineHeight: 24,
          marginBottom: error ? 6 : 22,
          minHeight: 148,
          paddingHorizontal: 13,
          paddingVertical: 12,
          textAlignVertical: 'top',
        }}
        value={reflection}
      />
      {error && (
        <Text style={{ color: '#C0483A', fontFamily: 'Inter-Regular', fontSize: 12, marginBottom: 22 }}>
          {error}
        </Text>
      )}
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting }}
          disabled={isSubmitting}
          onPress={onBack}
          style={{
            borderColor: '#D8D0C2',
            borderRadius: 999,
            borderWidth: 1,
            opacity: isSubmitting ? 0.45 : 1,
            paddingHorizontal: 18,
            paddingVertical: 11,
          }}
        >
          <Text style={{ color: '#4A4339', fontFamily: 'Inter-SemiBold', fontSize: 13 }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting }}
          disabled={isSubmitting}
          onPress={onSubmit}
          style={{
            borderColor: '#1E3226',
            borderRadius: 999,
            borderWidth: 1,
            opacity: isSubmitting ? 0.45 : 1,
            paddingHorizontal: 18,
            paddingVertical: 11,
          }}
        >
          <Text style={{ color: '#1E3226', fontFamily: 'Inter-SemiBold', fontSize: 13 }}>
            Skip
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting }}
          disabled={isSubmitting}
          onPress={onSubmit}
          style={{
            backgroundColor: '#1E3226',
            borderRadius: 999,
            flex: 1,
            opacity: isSubmitting ? 0.45 : 1,
            paddingHorizontal: 18,
            paddingVertical: 11,
          }}
        >
          <Text style={{ color: '#EDE7DA', fontFamily: 'Inter-SemiBold', fontSize: 13, textAlign: 'center' }}>
            {isSubmitting ? 'Starting…' : 'Start next phase'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

export function ExtendGoalModal({ visible, goal, onClose }: ExtendGoalModalProps) {
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
      backdropColor="rgba(30,25,15,0.45)"
      motion={EXTEND_MODAL_MOTION}
      contentStyle={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        elevation: 12,
        maxHeight: '90%',
        maxWidth: 468,
        padding: 24,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.25,
        shadowRadius: 30,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 7, marginBottom: 24 }}>
        {([1, 2, 3] as const).map((step) => (
          <View
            key={step}
            style={{
              backgroundColor: step <= state.currentStep ? '#1E3226' : '#E7DEC9',
              borderRadius: 999,
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
