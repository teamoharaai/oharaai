import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VaultIcon } from '@/components/ui/VaultIcon';
import { CountdownTimer } from './CountdownTimer';
import type { DatePickerDensity } from '@/components/ui/DatePicker';
import { Typography } from '@/components/ui/Typography';
import { ExtendGoalModal } from './ExtendGoalModal';
import { ExtendDeadlineModal } from './ExtendDeadlineModal';
import { GoalTitleRow } from './GoalTitleRow';
import { useThemeColors } from '@/store/uiStore';
import { FONT, RADIUS, SPACE, TYPE } from '@/constants/design';
import type { GoalWithDetails } from '../types';
import { goalWorkspaceHref } from '../navigation';
import { ManageGoalControl } from './ManageGoalControl';

interface GoalDetailHeaderProps {
  deadlineDensity?: DatePickerDensity;
  deadlineProgress: number | null;
  embedded?: boolean;
  ended: boolean;
  goal: GoalWithDetails;
  isMomentum: boolean;
  isSuperseded: boolean;
  onArchive: () => Promise<boolean>;
  onComplete: () => Promise<boolean>;
  onOpenProjectPicker: () => void;
  onUpdateDeadline: (deadline: Date | null) => Promise<boolean>;
  onUpdateDescription: (description: string | null) => Promise<boolean>;
  onWorkspaceChange: (mode: 'overview' | 'vault') => void;
  successorGoalId: string | null;
  vaultMode: boolean;
}

function getStatusBadgeVariant(
  status: GoalWithDetails['status'],
): 'active' | 'complete' | 'paused' | 'archived' | 'expired' | 'draft' {
  switch (status) {
    case 'active':
      return 'active';
    case 'complete':
      return 'complete';
    case 'draft':
      return 'draft';
    case 'stagnant':
      return 'paused';
    case 'archived':
      return 'archived';
    case 'expired':
      return 'expired';
    case 'discovered':
    default:
      return 'archived';
  }
}

function formatDate(date: Date | null): string {
  if (!date) return 'Not set';
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatCategory(category: GoalWithDetails['category']): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function MetaItem({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={{ gap: 3 }}>
      <Text
        style={{
          color: colors.text.muted,
          ...TYPE.meta,
          fontFamily: FONT.ui.semibold,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.text.primary,
          ...TYPE.bodySmall,
          fontFamily: FONT.ui.semibold,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function GoalDetailHeader({
  deadlineDensity,
  deadlineProgress,
  embedded = false,
  ended,
  goal,
  isMomentum,
  isSuperseded,
  onArchive,
  onComplete,
  onOpenProjectPicker,
  onUpdateDeadline,
  onUpdateDescription,
  onWorkspaceChange,
  successorGoalId,
  vaultMode,
}: GoalDetailHeaderProps) {
  const colors = useThemeColors();
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(goal.description ?? '');
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [savingDescription, setSavingDescription] = useState(false);
  const [showEndedCard, setShowEndedCard] = useState(true);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);

  useEffect(() => {
    if (!editingDescription) setDescriptionDraft(goal.description ?? '');
  }, [editingDescription, goal.description]);

  const completed = goal.status === 'complete';
  const archived = goal.status === 'archived';
  const expired = goal.status === 'expired';
  const isReadOnly = isSuperseded || archived;

  async function saveDescription() {
    const normalized = descriptionDraft.trim() || null;
    if (normalized === (goal.description?.trim() || null)) {
      setEditingDescription(false);
      return;
    }
    setSavingDescription(true);
    setDescriptionError(null);
    const saved = await onUpdateDescription(normalized);
    setSavingDescription(false);
    if (!saved) {
      setDescriptionError('Could not save the description. Try again.');
      return;
    }
    setEditingDescription(false);
  }

  function startDescriptionEdit() {
    if (isReadOnly) return;
    setDescriptionDraft(goal.description ?? '');
    setDescriptionError(null);
    setEditingDescription(true);
  }

  return (
    <View
      style={{
        backgroundColor: 'transparent',
        borderWidth: 0,
        marginBottom: embedded ? 0 : 16,
        paddingHorizontal: embedded ? 0 : SPACE['3xl'],
        paddingVertical: embedded ? 0 : SPACE['3xl'],
        zIndex: 5,
      }}
    >
      {isSuperseded && successorGoalId ? (
        <Pressable
          onPress={() => router.push(goalWorkspaceHref(successorGoalId) as never)}
          style={{ alignSelf: 'flex-start', marginBottom: 12 }}
        >
          <Typography variant="caption">‹ Back to current phase</Typography>
        </Pressable>
      ) : null}

      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'space-between',
          marginBottom: 16,
          zIndex: 30,
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Badge label={formatCategory(goal.category)} variant="category" />
          {isSuperseded ? (
            <>
              <Badge label="Archived phase" variant="archived" />
              <Badge label="Read-only" variant="archived" />
            </>
          ) : (
            <>
              {isMomentum ? <Badge label="↻ Momentum" variant="momentum" /> : null}
              <Badge label={goal.status} variant={getStatusBadgeVariant(goal.status)} />
              {goal.aiGenerated ? <Badge label="AI-guided" variant="ai" /> : null}
            </>
          )}
        </View>

        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
          <Button
            accessibilityLabel={vaultMode ? 'Back to Overview' : 'Open Vault'}
            leftIcon={vaultMode
              ? <Ionicons color={colors.text.onAccent} name="arrow-back" size={17} />
              : <VaultIcon color={colors.text.onAccent} size={17} />}
            onPress={() => onWorkspaceChange(vaultMode ? 'overview' : 'vault')}
            size="compact"
          >
            {vaultMode ? 'Overview' : 'Vault'}
          </Button>
          <ManageGoalControl
            goal={goal}
            onArchive={onArchive}
            onComplete={onComplete}
            onEditDeadline={() => setShowDeadlineModal(true)}
            onOpenProjectPicker={onOpenProjectPicker}
            onUpdateDescription={onUpdateDescription}
            superseded={isSuperseded}
          />
        </View>
      </View>

      <View style={{ alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <GoalTitleRow
            iconSize={26}
            iconStyle={{ marginTop: 4 }}
            style={{ alignItems: 'flex-start', marginBottom: goal.description || editingDescription ? 10 : 0 }}
            textStyle={{
              color: isSuperseded ? colors.text.secondary : colors.text.primary,
              ...TYPE.pageTitle,
              letterSpacing: -0.4,
            }}
            title={goal.title}
            variant="heading"
          />

          {isMomentum ? (
            <Typography variant="description" style={{ marginBottom: 8 }}>
              You pushed toward this once already. This phase carries that momentum forward.
            </Typography>
          ) : null}

          {editingDescription ? (
            <View style={{ gap: 9 }}>
              <TextInput
                accessibilityLabel="Goal description"
                autoFocus
                editable={!savingDescription}
                multiline
                onChangeText={(value) => {
                  setDescriptionDraft(value);
                  if (descriptionError) setDescriptionError(null);
                }}
                placeholder="Describe what this goal means and what success looks like."
                placeholderTextColor={colors.text.muted}
                style={{
                  backgroundColor: colors.background.input,
                  borderColor: descriptionError ? colors.feedback.danger.text : colors.border.input,
                  borderRadius: 10,
                  borderWidth: 1,
                  color: colors.text.primary,
                  ...TYPE.bodySmall,
                  minHeight: 92,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  textAlignVertical: 'top',
                }}
                value={descriptionDraft}
              />
              {descriptionError ? (
                <Typography variant="hint" style={{ color: colors.feedback.danger.text }}>
                  {descriptionError}
                </Typography>
              ) : null}
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}>
                <Pressable
                  disabled={savingDescription}
                  onPress={() => {
                    setEditingDescription(false);
                    setDescriptionError(null);
                  }}
                >
                  <Typography variant="caption">Cancel</Typography>
                </Pressable>
                <Pressable disabled={savingDescription} onPress={saveDescription}>
                  {savingDescription ? (
                    <ActivityIndicator color={colors.accent.primary} size="small" />
                  ) : (
                    <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
                      Save description
                    </Typography>
                  )}
                </Pressable>
              </View>
            </View>
          ) : goal.description ? (
            <Typography variant="description">
              {goal.description}
            </Typography>
          ) : (
            <Pressable disabled={isReadOnly} onPress={startDescriptionEdit}>
              <Typography variant="description" style={{ color: colors.text.muted }}>
                {isReadOnly ? 'No description' : '＋ Add a description'}
              </Typography>
            </Pressable>
          )}
        </View>

      </View>

      <View style={{
        backgroundColor: isSuperseded ? colors.background.selectedRow : colors.background.card,
        borderColor: colors.border.warm,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        marginTop: SPACE['2xl'],
        paddingHorizontal: SPACE['3xl'],
        paddingVertical: SPACE['2xl'],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 22,
      }}>
        <CountdownTimer createdAt={goal.createdAt} deadline={goal.deadline} deadlineDensity={deadlineDensity}
          disabled={isSuperseded || archived || completed} embedded onUpdateDeadline={onUpdateDeadline} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 48, marginTop: SPACE.xl }}>
          <MetaItem label="Started" value={formatDate(goal.createdAt)} />
          <MetaItem label="End date" value={formatDate(goal.deadline)} />
        </View>
      </View>

      {ended && !isSuperseded && !completed && !archived && showEndedCard ? (
        <View
          style={{
            backgroundColor: colors.background.subtle,
            borderColor: colors.border.warm,
            borderRadius: 12,
            borderWidth: 1,
            marginTop: 20,
            padding: 16,
          }}
        >
          <Typography variant="section-header" style={{ marginBottom: SPACE.sm }}>
            This goal has ended.
          </Typography>
          <Typography variant="description" style={{ marginBottom: 14 }}>
            Extend this Goal with the same identity, or preserve this phase and begin a successor.
          </Typography>
          <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button onPress={() => setShowDeadlineModal(true)} size="compact">
              Extend Goal
            </Button>
            <Button onPress={() => setShowExtendModal(true)} size="compact" variant="outline">
              Begin new phase
            </Button>
            <Button onPress={() => setShowEndedCard(false)} size="compact" variant="outline">
              Not now
            </Button>
          </View>
        </View>
      ) : null}

      <ExtendGoalModal
        goal={goal}
        onClose={() => setShowExtendModal(false)}
        visible={showExtendModal}
      />
      <ExtendDeadlineModal
        currentDeadline={goal.deadline}
        onClose={() => setShowDeadlineModal(false)}
        onSave={onUpdateDeadline}
        visible={showDeadlineModal}
      />
    </View>
  );
}
