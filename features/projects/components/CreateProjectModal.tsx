import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, type TextStyle } from 'react-native';
import { router } from 'expo-router';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { useProjectStore } from '../store';
import { fetchOwnedGoalsForProjects } from '../services/project-service';
import type { GoalWithDetails } from '@/features/goals/types';
import supabase from '@/lib/db/client';

interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
}

const INPUT_LAYOUT_STYLE: TextStyle = {
  borderWidth: 1,
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontFamily: 'Inter-Regular',
  fontSize: 15,
};

export function CreateProjectModal({ visible, onClose }: CreateProjectModalProps) {
  const colors = useThemeColors();
  const createProject = useProjectStore((state) => state.createProject);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<GoalWithDetails[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [reassignmentConfirmed, setReassignmentConfirmed] = useState(false);

  useEffect(() => {
    if (visible) {
      setGoalsLoading(true);
      void (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) setGoals(await fetchOwnedGoalsForProjects(user.id));
        } catch {
          setError('Goals could not be loaded. You can still create an empty Project.');
        } finally {
          setGoalsLoading(false);
        }
      })();
      return;
    }

    setTitle('');
    setDescription('');
    setIsSubmitting(false);
    setError(null);
    setGoals([]);
    setSelectedGoalIds([]);
    setReassignmentConfirmed(false);
  }, [visible]);

  const canSubmit = title.trim().length > 0 && !isSubmitting;

  function handleClose() {
    if (isSubmitting) return;
    onClose();
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    const selected = goals.filter((goal) => selectedGoalIds.includes(goal.id));
    const hasReassignment = selected.some((goal) => goal.projectId);
    if (hasReassignment && !reassignmentConfirmed) {
      setError('One or more selected Goals already belong to another Project. Confirm to move them without changing their history.');
      setReassignmentConfirmed(true);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const project = await createProject({
        title: title.trim(),
        description: description.trim() || undefined,
        goalIds: selectedGoalIds,
        allowReassignment: reassignmentConfirmed,
      });
      onClose();
      router.push(`/(app)/projects/${project.id}` as never);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not create the project. Please try again.',
      );
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      showCloseButton={false}
      closeDisabled={isSubmitting}
      closeOnBackdropPress
      cancelText="Cancel"
      onCancel={handleClose}
      cancelDisabled={isSubmitting}
      confirmText={isSubmitting ? 'Creating…' : 'Create project'}
      onConfirm={() => void handleSubmit()}
      confirmDisabled={!canSubmit}
      contentStyle={{ maxWidth: 480 }}
    >
      <Typography variant="heading" style={{ marginBottom: 8 }}>
        What are you working toward?
      </Typography>
      <Typography
        variant="body"
        style={{ fontSize: 15, lineHeight: 22, marginBottom: 24 }}
      >
        A project is a long-term ambition. Your goals will help you get there.
      </Typography>

      <View style={{ marginBottom: 18 }}>
        <Typography variant="eyebrow" style={{ marginBottom: 8 }}>
          Project name
        </Typography>
        <TextInput
          accessibilityLabel="Project name"
          autoFocus
          style={[
            INPUT_LAYOUT_STYLE,
            {
              backgroundColor: colors.background.input,
              borderColor: colors.border.input,
              color: colors.text.primary,
            },
          ]}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Build financial independence"
          placeholderTextColor={colors.text.muted}
        />
      </View>

      <View>
        <Typography variant="eyebrow" style={{ marginBottom: 8 }}>
          Long-term intent (optional)
        </Typography>
        <TextInput
          accessibilityLabel="Long-term project intent"
          multiline
          style={[
            INPUT_LAYOUT_STYLE,
            {
              backgroundColor: colors.background.input,
              borderColor: colors.border.input,
              color: colors.text.primary,
            },
            { minHeight: 88, maxHeight: 140, textAlignVertical: 'top' },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what achieving this means to you..."
          placeholderTextColor={colors.text.muted}
        />
      </View>

      <View style={{ marginTop: 20 }}>
        <Typography variant="eyebrow" style={{ marginBottom: 8 }}>Existing Goals (optional)</Typography>
        {goalsLoading ? <ActivityIndicator color={colors.accent.primary} /> : (
          <ScrollView style={{ maxHeight: 190 }} contentContainerStyle={{ gap: 8 }}>
            {goals.length === 0 ? <Typography variant="caption">No available Goals yet. Empty Projects are supported.</Typography> : goals.map((goal) => {
              const selected = selectedGoalIds.includes(goal.id);
              return <Pressable key={goal.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}
                onPress={() => { setSelectedGoalIds((current) => selected ? current.filter((id) => id !== goal.id) : [...current, goal.id]); setReassignmentConfirmed(false); setError(null); }}
                style={{ alignItems: 'center', backgroundColor: selected ? colors.background.selectedRow : colors.background.subtle, borderColor: selected ? colors.border.accent : colors.border.divider, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 10 }}>
                <View style={{ borderColor: selected ? colors.accent.primary : colors.border.input, borderRadius: 5, borderWidth: 1.5, height: 18, width: 18, alignItems: 'center', justifyContent: 'center' }}>
                  {selected ? <View style={{ backgroundColor: colors.accent.primary, borderRadius: 3, height: 10, width: 10 }} /> : null}
                </View>
                <View style={{ flex: 1 }}><Typography variant="emphasis-sm">{goal.title}</Typography><Typography variant="caption">{goal.category}{goal.projectId ? ' · Already in a Project' : ''}</Typography></View>
              </Pressable>;
            })}
          </ScrollView>
        )}
      </View>

      {reassignmentConfirmed ? <Typography variant="caption" style={{ color: colors.feedback.pending.text, marginTop: 12 }}>Submitting again confirms the selected Goal reassignment.</Typography> : null}
      {error ? (
        <Typography
          variant="caption"
          accessibilityRole="alert"
          style={{ color: colors.feedback.danger.text, marginTop: 12 }}
        >
          {error}
        </Typography>
      ) : null}
    </Modal>
  );
}
