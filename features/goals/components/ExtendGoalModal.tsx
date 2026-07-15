import { useEffect, useState } from 'react';
import { Easing, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import type { GoalWithMeasurables, Measurable } from '../types';

type ExtendGoalStep = 1 | 2 | 3;

export interface ExtendGoalState {
  currentStep: ExtendGoalStep;
  title: string;
  deadline: string | null;
  reflection: string;
}

interface ExtendGoalModalProps {
  visible: boolean;
  goal: GoalWithMeasurables;
  onClose: () => void;
}

const EXTEND_MODAL_MOTION = {
  backdropDuration: 200,
  backdropEasing: Easing.bezier(0.25, 0.1, 0.25, 1),
  contentDuration: 280,
  initialTranslateY: 14,
  contentEasing: Easing.bezier(0.2, 0.7, 0.2, 1),
};

function createInitialState(title: string): ExtendGoalState {
  return {
    currentStep: 1,
    title,
    deadline: null,
    reflection: '',
  };
}

function getChecklistComplete(measurable: Measurable): boolean {
  return measurable.currentValue === 1;
}

function MeasurableValue({ measurable }: { measurable: Measurable }) {
  if (measurable.type === 'checklist') {
    const complete = getChecklistComplete(measurable);
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

  const unit = measurable.targetUnit ? ` ${measurable.targetUnit}` : '';
  return (
    <Text style={{ color: '#4A4339', fontFamily: 'Inter-SemiBold', fontSize: 13 }}>
      {measurable.currentValue}/{measurable.targetValue ?? '—'}{unit}
    </Text>
  );
}

function SummaryStep({
  goal,
  onClose,
  onContinue,
}: {
  goal: GoalWithMeasurables;
  onClose: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <Text
        style={{
          color: '#211F1A',
          fontFamily: 'Lora-Italic',
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
        {goal.measurables.length === 0 ? (
          <Text
            style={{
              color: '#8A8172',
              fontFamily: 'Inter-Regular',
              fontSize: 13,
              lineHeight: 19,
              paddingVertical: 16,
            }}
          >
            No milestones were added during this phase.
          </Text>
        ) : (
          goal.measurables.map((measurable, index) => (
            <View
              key={measurable.id}
              style={{
                alignItems: 'center',
                borderBottomColor: '#E7DEC9',
                borderBottomWidth: index === goal.measurables.length - 1 ? 0 : 1,
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
                {measurable.title}
              </Text>
              <MeasurableValue measurable={measurable} />
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

export function ExtendGoalModal({ visible, goal, onClose }: ExtendGoalModalProps) {
  const [state, setState] = useState<ExtendGoalState>(() => createInitialState(goal.title));

  useEffect(() => {
    if (!visible) {
      setState(createInitialState(goal.title));
    }
  }, [goal.title, visible]);

  function handleClose() {
    setState(createInitialState(goal.title));
    onClose();
  }

  function goToStepTwo() {
    setState((current) => ({ ...current, currentStep: 2 }));
  }

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      showCloseButton={false}
      closeOnBackdropPress
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
          <View testID="extend-goal-step-2-placeholder">
            {/* TODO: Task 5 */}
          </View>
        ) : (
          <View testID="extend-goal-step-3-placeholder">
            {/* TODO: Task 6 */}
          </View>
        )}
      </ScrollView>
    </Modal>
  );
}
