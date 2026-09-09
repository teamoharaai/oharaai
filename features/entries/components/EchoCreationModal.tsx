import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useProjectStore } from '@/features/projects/store';
import { useThemeColors } from '@/store/uiStore';
import { useEntriesStore } from '../store';
import { createEmptyDocument } from '../utils';
import type { EntryType } from '../types';

type CreationStep = 'choose' | 'note' | 'reflection';

function ChoiceCard({
  title,
  description,
  icon,
  selected = false,
  disabled = false,
  badge,
  onPress,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  badge?: string;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ hovered, pressed }) => ({
        backgroundColor: selected
          ? colors.background.selectedRow
          : hovered && !disabled
            ? colors.background.hoverAccent
            : colors.background.input,
        borderColor: selected ? colors.border.accent : colors.border.input,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        flex: 1,
        gap: SPACE.md,
        minHeight: 150,
        minWidth: 240,
        opacity: disabled ? 0.82 : pressed ? 0.72 : 1,
        padding: SPACE['2xl'],
      })}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
        {icon}
        <Typography variant="title" style={{ flex: 1 }}>{title}</Typography>
        {badge ? (
          <View
            style={{
              backgroundColor: colors.background.card,
              borderRadius: RADIUS.round,
              paddingHorizontal: SPACE.md,
              paddingVertical: SPACE.xs,
            }}
          >
            <Typography variant="caption" style={{ color: colors.text.accent }}>{badge}</Typography>
          </View>
        ) : null}
      </View>
      <Typography variant="body-small">{description}</Typography>
    </Pressable>
  );
}

export function EchoCreationModal({
  visible,
  initialType,
  initialGoalId,
  initialProjectId,
  onClose,
  onCreated,
}: {
  visible: boolean;
  initialType?: EntryType | null;
  initialGoalId?: string;
  initialProjectId?: string;
  onClose: () => void;
  onCreated: (entryId: string) => void;
}) {
  const colors = useThemeColors();
  const { goals, loadContext, createEntry } = useEntriesStore();
  const { projects, loadProjects } = useProjectStore();
  const [step, setStep] = useState<CreationStep>('choose');
  const [reflectionReady, setReflectionReady] = useState(false);
  const [goalId, setGoalId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStep(initialType ?? 'choose');
    setReflectionReady(false);
    setGoalId(initialGoalId ?? '');
    setProjectId(initialProjectId ?? '');
    setCreating(false);
    setError(null);
    void loadContext();
    void loadProjects();
  }, [initialGoalId, initialProjectId, initialType, loadContext, loadProjects, visible]);

  async function create(type: EntryType) {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const now = new Date();
      const entry = await createEntry({
        entryType: type,
        title: type === 'reflection'
          ? `Reflection · ${now.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
          : '',
        content: createEmptyDocument(),
        plainText: '',
        reflectionType: type === 'reflection' ? 'open' : null,
        conversationTurns: [],
        completedAt: null,
        relationships: {
          goalIds: goalId ? [goalId] : [],
          projectId: projectId || null,
          categoryIds: [],
          milestoneIds: [],
        },
      });
      onCreated(entry.id);
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : 'Could not create entry');
      setCreating(false);
    }
  }

  const activeGoals = goals.filter((goal) => goal.status !== 'archived');
  const activeProjects = projects.filter((project) => project.status !== 'archived');
  const creationType: EntryType | null = step === 'note'
    ? 'note'
    : step === 'reflection' && reflectionReady
      ? 'reflection'
      : null;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      closeDisabled={creating}
      closeOnBackdropPress
      showCloseButton={false}
      contentStyle={{ maxHeight: '88%', maxWidth: 640, padding: 0 }}
    >
      <View
        style={{
          alignItems: 'center',
          borderBottomColor: colors.border.divider,
          borderBottomWidth: 1,
          flexDirection: 'row',
          gap: SPACE.md,
          minHeight: 66,
          paddingHorizontal: SPACE['2xl'],
        }}
      >
        {step !== 'choose' ? (
          <Pressable
            accessibilityLabel="Back to entry choices"
            accessibilityRole="button"
            disabled={creating}
            hitSlop={8}
            onPress={() => { setStep('choose'); setReflectionReady(false); }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: SPACE.sm })}
          >
            <Ionicons name="arrow-back" color={colors.text.primary} size={21} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Typography variant="title">
            {step === 'choose' ? 'New' : step === 'note' ? 'New Note' : 'New Reflection'}
          </Typography>
          <Typography variant="caption" style={{ marginTop: 2 }}>
            {step === 'choose'
              ? 'What would you like to capture?'
              : 'Goal and Project organization are always optional.'}
          </Typography>
        </View>
        <Pressable
          accessibilityLabel="Close New entry"
          accessibilityRole="button"
          disabled={creating}
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: SPACE.sm })}
        >
          <Ionicons name="close" color={colors.text.secondary} size={22} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ gap: SPACE['2xl'], padding: SPACE['3xl'] }}
        keyboardShouldPersistTaps="handled"
        style={{ flexGrow: 0 }}
      >
        {step === 'choose' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.lg }}>
            <ChoiceCard
              description="Capture an idea, observation, plan, or anything you want to remember."
              icon={<BrandIcon name="echo-add-entry" color={colors.text.accent} size={24} />}
              onPress={() => setStep('note')}
              title="New Note"
            />
            <ChoiceCard
              description="Write freely about what you are thinking, feeling, or learning."
              icon={<BrandIcon name="echo" color={colors.text.accent} size={24} />}
              onPress={() => setStep('reflection')}
              title="New Reflection"
            />
          </View>
        ) : null}

        {step === 'reflection' ? (
          <View style={{ gap: SPACE.lg }}>
            <ChoiceCard
              description="A spacious, private writing experience with no prompts and no AI conversation."
              icon={<Ionicons name="create-outline" color={colors.text.accent} size={25} />}
              onPress={() => setReflectionReady(true)}
              selected={reflectionReady}
              title="Quick Reflection"
            />
            <ChoiceCard
              badge="Coming soon"
              description="A future OHARA Intelligence conversation that will help you explore your thoughts more deeply."
              disabled
              icon={<BrandIcon name="ohara" color={colors.text.accent} size={27} />}
              title="Guided Reflection"
            />
          </View>
        ) : null}

        {creationType ? (
          <View style={{ gap: SPACE['2xl'] }}>
            <View>
              <Typography variant="eyebrow" style={{ marginBottom: SPACE.md }}>LINK TO GOAL</Typography>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: SPACE.md }}>
                  <Button
                    onPress={() => setGoalId('')}
                    size="compact"
                    variant={!goalId ? 'secondary' : 'outline'}
                  >
                    None
                  </Button>
                  {activeGoals.map((goal) => (
                    <Button
                      key={goal.id}
                      onPress={() => setGoalId(goal.id)}
                      size="compact"
                      variant={goalId === goal.id ? 'secondary' : 'outline'}
                    >
                      {goal.title}
                    </Button>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View>
              <Typography variant="eyebrow" style={{ marginBottom: SPACE.md }}>ADD TO PROJECT</Typography>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: SPACE.md }}>
                  <Button
                    onPress={() => setProjectId('')}
                    size="compact"
                    variant={!projectId ? 'secondary' : 'outline'}
                  >
                    None
                  </Button>
                  {activeProjects.map((project) => (
                    <Button
                      key={project.id}
                      onPress={() => setProjectId(project.id)}
                      size="compact"
                      variant={projectId === project.id ? 'secondary' : 'outline'}
                    >
                      {project.title}
                    </Button>
                  ))}
                </View>
              </ScrollView>
            </View>

            <Typography variant="body-small">
              You can change these relationships later. Neither is required to begin writing.
            </Typography>
          </View>
        ) : null}

        {error ? (
          <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.danger.text }}>
            {error}
          </Typography>
        ) : null}
      </ScrollView>

      {creationType ? (
        <View
          style={{
            alignItems: 'center',
            borderTopColor: colors.border.divider,
            borderTopWidth: 1,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            padding: SPACE['2xl'],
          }}
        >
          <Button disabled={creating} loading={creating} onPress={() => void create(creationType)}>
            {creationType === 'note' ? 'Start writing' : 'Begin Quick Reflection'}
          </Button>
        </View>
      ) : null}
    </Modal>
  );
}
