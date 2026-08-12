import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Typography } from '@/components/ui/Typography';
import { ExtendGoalModal } from './ExtendGoalModal';
import { GoalTitleRow } from './GoalTitleRow';
import { useThemeColors } from '@/store/uiStore';
import type { GoalWithDetails } from '../types';
import { goalWorkspaceHref } from '../navigation';

interface GoalDetailHeaderProps {
  deadlineProgress: number | null;
  ended: boolean;
  goal: GoalWithDetails;
  isMomentum: boolean;
  isSuperseded: boolean;
  onArchive: () => Promise<boolean>;
  onComplete: () => Promise<boolean>;
  onOpenProjectPicker: () => void;
  onUpdateDescription: (description: string | null) => Promise<boolean>;
  successorGoalId: string | null;
}

function getStatusBadgeVariant(
  status: GoalWithDetails['status'],
): 'active' | 'complete' | 'paused' | 'archived' | 'draft' {
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
          fontFamily: 'Inter-SemiBold',
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.text.primary,
          fontFamily: 'Inter-SemiBold',
          fontSize: 13.5,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function GoalDetailHeader({
  deadlineProgress,
  ended,
  goal,
  isMomentum,
  isSuperseded,
  onArchive,
  onComplete,
  onOpenProjectPicker,
  onUpdateDescription,
  successorGoalId,
}: GoalDetailHeaderProps) {
  const colors = useThemeColors();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(goal.description ?? '');
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [savingDescription, setSavingDescription] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [showEndedCard, setShowEndedCard] = useState(true);
  const [showExtendModal, setShowExtendModal] = useState(false);

  useEffect(() => {
    if (!editingDescription) setDescriptionDraft(goal.description ?? '');
  }, [editingDescription, goal.description]);

  const completed = goal.status === 'complete';
  const archived = goal.status === 'archived';
  const isReadOnly = isSuperseded || archived;
  const ringProgress = completed || isSuperseded ? 100 : deadlineProgress ?? 0;

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

  async function completeGoal() {
    if (completed || isReadOnly || savingStatus) return;
    setSavingStatus(true);
    await onComplete();
    setSavingStatus(false);
  }

  async function archiveGoal() {
    if (archived || isSuperseded || savingStatus) return;
    setMenuOpen(false);
    setSavingStatus(true);
    await onArchive();
    setSavingStatus(false);
  }

  function startDescriptionEdit() {
    if (isReadOnly) return;
    setMenuOpen(false);
    setDescriptionDraft(goal.description ?? '');
    setDescriptionError(null);
    setEditingDescription(true);
  }

  return (
    <View
      style={{
        backgroundColor: isSuperseded
          ? colors.background.selectedRow
          : colors.background.card,
        borderColor: colors.border.warm,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
        paddingHorizontal: 28,
        paddingVertical: 26,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 22,
        elevation: 2,
        zIndex: 5,
      }}
    >
      {menuOpen ? (
        <Pressable
          accessibilityLabel="Close goal actions"
          onPress={() => setMenuOpen(false)}
          style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 10 }}
        />
      ) : null}

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
          <Pressable
            accessibilityLabel={completed ? 'Goal completed' : 'Mark goal complete'}
            accessibilityRole="button"
            disabled={completed || isReadOnly || savingStatus}
            onPress={completeGoal}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: completed ? colors.accent.primary : colors.background.card,
              borderColor: completed ? colors.accent.primary : colors.border.accent,
              borderRadius: 9,
              borderWidth: 1,
              flexDirection: 'row',
              gap: 6,
              height: 30,
              opacity: isReadOnly ? 0.5 : pressed ? 0.72 : 1,
              paddingHorizontal: 13,
            })}
          >
            {savingStatus && !completed ? (
              <ActivityIndicator color={colors.accent.primary} size="small" />
            ) : (
              <Typography
                variant="emphasis-sm"
                style={{
                  color: completed ? colors.accent.tealSubtle : colors.text.accent,
                  fontSize: 12.5,
                }}
              >
                ✓ {completed ? 'Completed' : 'Mark complete'}
              </Typography>
            )}
          </Pressable>

          <View style={{ position: 'relative', zIndex: 40 }}>
            <Pressable
              accessibilityLabel="Goal actions"
              accessibilityRole="button"
              onPress={() => setMenuOpen((value) => !value)}
              style={({ pressed }) => ({
                alignItems: 'center',
                borderRadius: 9,
                height: 30,
                justifyContent: 'center',
                opacity: pressed ? 0.65 : 1,
                width: 30,
              })}
            >
              <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 17, letterSpacing: 1 }}>⋯</Text>
            </Pressable>

            {menuOpen ? (
              <View
                accessibilityRole="menu"
                style={{
                  backgroundColor: colors.background.card,
                  borderColor: colors.border.warm,
                  borderRadius: 14,
                  borderWidth: 1,
                  padding: 6,
                  position: 'absolute',
                  right: 0,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 16 },
                  shadowOpacity: 0.2,
                  shadowRadius: 44,
                  top: 36,
                  width: 240,
                  zIndex: 50,
                }}
              >
                <Pressable
                  accessibilityRole="menuitem"
                  disabled={isReadOnly}
                  onPress={() => {
                    setMenuOpen(false);
                    onOpenProjectPicker();
                  }}
                  style={({ pressed }) => ({
                    borderRadius: 10,
                    opacity: isReadOnly ? 0.45 : pressed ? 0.7 : 1,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  })}
                >
                  <Typography variant="meta" style={{ color: colors.text.primary }}>↦  Move to project…</Typography>
                </Pressable>
                <Pressable
                  accessibilityRole="menuitem"
                  disabled={isReadOnly}
                  onPress={startDescriptionEdit}
                  style={({ pressed }) => ({
                    borderRadius: 10,
                    opacity: isReadOnly ? 0.45 : pressed ? 0.7 : 1,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  })}
                >
                  <Typography variant="meta" style={{ color: colors.text.primary }}>✎  Edit description</Typography>
                </Pressable>
                <View style={{ backgroundColor: colors.border.warmSubtle, height: 1, margin: 5 }} />
                <Pressable
                  accessibilityRole="menuitem"
                  disabled={isSuperseded || archived || savingStatus}
                  onPress={archiveGoal}
                  style={({ pressed }) => ({
                    borderRadius: 10,
                    opacity: isSuperseded || archived ? 0.45 : pressed ? 0.7 : 1,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  })}
                >
                  <Typography variant="meta" style={{ color: colors.feedback.danger.text }}>⌫  Archive goal</Typography>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={{ alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
        <View style={{ flex: 1, minWidth: 240 }}>
          <GoalTitleRow
            iconSize={26}
            iconStyle={{ marginTop: 4 }}
            style={{ alignItems: 'flex-start', marginBottom: goal.description || editingDescription ? 10 : 0 }}
            textStyle={{
              color: isSuperseded ? colors.text.secondary : colors.text.primary,
              fontFamily: 'Inter-SemiBold',
              fontSize: 32,
              letterSpacing: -0.4,
              lineHeight: 36,
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
                  fontFamily: 'Inter-Regular',
                  fontSize: 14.5,
                  lineHeight: 22,
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
            <Typography variant="description" style={{ fontSize: 14.5, lineHeight: 22.5 }}>
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

        <View style={{ alignItems: 'center', flexShrink: 0, gap: 6 }}>
          <ProgressRing
            color={colors.accent.primary}
            progress={ringProgress}
            size={92}
            strokeWidth={7}
            variant="warm"
          />
          <Typography variant="caption" style={{ color: colors.accent.tealMid, fontFamily: 'Inter-SemiBold' }}>
            {completed ? 'Completed' : archived ? 'Archived' : 'On track'}
          </Typography>
        </View>
      </View>

      <View style={{ backgroundColor: colors.border.warmSubtle, height: 1, marginBottom: 16, marginTop: 20 }} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 34 }}>
        <MetaItem label="Category" value={formatCategory(goal.category)} />
        <MetaItem label="Started" value={formatDate(goal.createdAt)} />
        <MetaItem label="End date" value={formatDate(goal.deadline)} />
      </View>

      {ended && !isSuperseded && !completed && !archived && showEndedCard ? (
        <View
          style={{
            backgroundColor: colors.background.goalCard,
            borderColor: colors.border.warm,
            borderRadius: 12,
            borderWidth: 1,
            marginTop: 20,
            padding: 16,
          }}
        >
          <Text style={{ color: colors.text.primary, fontFamily: 'Inter-Regular', fontSize: 20, lineHeight: 26, marginBottom: 6 }}>
            This goal has ended.
          </Text>
          <Typography variant="description" style={{ marginBottom: 14 }}>
            Continue this work in a new phase when you&apos;re ready.
          </Typography>
          <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable
              onPress={() => setShowExtendModal(true)}
              style={{ backgroundColor: colors.background.sidebar, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 }}
            >
              <Typography variant="emphasis-sm" style={{ color: colors.text.inverse, fontSize: 12 }}>
                Extend into a new phase
              </Typography>
            </Pressable>
            <Pressable
              onPress={() => setShowEndedCard(false)}
              style={{ borderColor: colors.border.input, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 }}
            >
              <Typography variant="emphasis-sm" style={{ color: colors.text.primary, fontSize: 12 }}>Not now</Typography>
            </Pressable>
          </View>
        </View>
      ) : null}

      <ExtendGoalModal
        goal={goal}
        onClose={() => setShowExtendModal(false)}
        visible={showExtendModal}
      />
    </View>
  );
}
