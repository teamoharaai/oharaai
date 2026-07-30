import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import type { ConstellationMutationState } from '../hooks/useConstellation';
import type {
  ConstellationGoalLink,
  ConstellationGoalNodeDTO,
  CreateConstellationGoalLinkInput,
  UpdateConstellationGoalLinkInput,
  UserGoalLinkGraphEdge,
} from '../types';
import { ConstellationInspectorSurface } from './ConstellationInspectorSurface';

const NOTE_MAX_LENGTH = 280;

interface ConstellationGoalLinkPanelProps {
  goals: readonly ConstellationGoalNodeDTO[];
  initialGoalId?: string | null;
  initialLinkId?: string | null;
  links: readonly UserGoalLinkGraphEdge[];
  mutation: ConstellationMutationState;
  onClose: () => void;
  onCreate: (
    input: CreateConstellationGoalLinkInput,
  ) => Promise<ConstellationGoalLink | null>;
  onEdit: (
    goalLinkId: string,
    input: UpdateConstellationGoalLinkInput,
  ) => Promise<ConstellationGoalLink | null>;
  onRemove: (goalLinkId: string) => Promise<ConstellationGoalLink | null>;
}

function goalName(
  goals: readonly ConstellationGoalNodeDTO[],
  goalId: string,
): string {
  return goals.find((goal) => goal.id === goalId)?.label ?? 'Unavailable goal';
}

function pairExists(
  links: readonly UserGoalLinkGraphEdge[],
  sourceGoalId: string,
  targetGoalId: string,
): boolean {
  return links.some((link) => (
    (
      link.from.id === sourceGoalId
      && link.to.id === targetGoalId
    )
    || (
      link.from.id === targetGoalId
      && link.to.id === sourceGoalId
    )
  ));
}

function GoalChoiceList({
  disabled,
  goals,
  label,
  onSelect,
  selectedId,
}: {
  disabled: boolean;
  goals: readonly ConstellationGoalNodeDTO[];
  label: string;
  onSelect: (goalId: string) => void;
  selectedId: string | null;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ gap: 8 }}>
      <Typography variant="field-label">{label}</Typography>
      <View style={{ gap: 7 }}>
        {goals.map((goal) => {
          const selected = goal.id === selectedId;
          return (
            <Pressable
              accessibilityLabel={`${label}: ${goal.label}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              key={goal.id}
              onPress={() => onSelect(goal.id)}
              style={({ pressed }) => ({
                backgroundColor: selected
                  ? colors.background.selectedRow
                  : colors.background.input,
                borderColor: selected
                  ? colors.border.accent
                  : colors.border.input,
                borderRadius: 10,
                borderWidth: selected ? 2 : 1,
                opacity: disabled ? 0.5 : pressed ? 0.74 : 1,
                paddingHorizontal: 12,
                paddingVertical: 10,
              })}
            >
              <Typography variant="label">{goal.label}</Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ConstellationGoalLinkPanel({
  goals,
  initialGoalId = null,
  initialLinkId = null,
  links,
  mutation,
  onClose,
  onCreate,
  onEdit,
  onRemove,
}: ConstellationGoalLinkPanelProps) {
  const colors = useThemeColors();
  const [activeLinkId, setActiveLinkId] =
    useState<string | null>(initialLinkId);
  const [sourceGoalId, setSourceGoalId] =
    useState<string | null>(initialGoalId);
  const [targetGoalId, setTargetGoalId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const activeLink = links.find((link) => link.linkId === activeLinkId);
  const linkCountByGoal = useMemo(() => {
    const counts = new Map<string, number>();
    for (const link of links) {
      counts.set(link.from.id, (counts.get(link.from.id) ?? 0) + 1);
      counts.set(link.to.id, (counts.get(link.to.id) ?? 0) + 1);
    }
    return counts;
  }, [links]);
  const duplicate = (
    sourceGoalId
    && targetGoalId
    && pairExists(links, sourceGoalId, targetGoalId)
  );
  const sourceAtLimit = sourceGoalId
    ? (linkCountByGoal.get(sourceGoalId) ?? 0) >= 6
    : false;
  const targetAtLimit = targetGoalId
    ? (linkCountByGoal.get(targetGoalId) ?? 0) >= 6
    : false;
  const noteError = note.trim().length === 0
    ? 'Add a note describing why these goals are connected.'
    : note.trim().length > NOTE_MAX_LENGTH
      ? `Keep the note under ${NOTE_MAX_LENGTH} characters.`
      : duplicate
        ? 'These goals are already linked.'
        : sourceAtLimit || targetAtLimit
          ? 'One of these goals already has six user links.'
          : null;

  useEffect(() => {
    setActiveLinkId(initialLinkId);
    setEditing(false);
  }, [initialLinkId]);

  useEffect(() => {
    if (activeLinkId && !activeLink) {
      setActiveLinkId(null);
      setEditing(false);
    }
  }, [activeLink, activeLinkId]);

  useEffect(() => {
    if (editing && activeLink) setNote(activeLink.note);
  }, [activeLink, editing]);

  async function create() {
    if (!sourceGoalId || !targetGoalId || noteError) return;
    const saved = await onCreate({
      sourceGoalId,
      targetGoalId,
      note: note.trim(),
    });
    if (!saved) return;
    setActiveLinkId(saved.id);
    setSourceGoalId(initialGoalId);
    setTargetGoalId(null);
    setNote('');
  }

  async function saveNote() {
    if (!activeLink || note.trim().length === 0) return;
    const saved = await onEdit(activeLink.linkId, { note: note.trim() });
    if (saved) setEditing(false);
  }

  async function remove() {
    if (!activeLink) return;
    const removed = await onRemove(activeLink.linkId);
    if (removed) {
      setActiveLinkId(null);
      setEditing(false);
    }
  }

  return (
    <ConstellationInspectorSurface
      accessibilityLabel="Manage Constellation goal links"
      closeDisabled={mutation.isSaving}
      onClose={onClose}
    >
      <View style={{ gap: 6 }}>
        <Typography
          variant="section-eyebrow"
          style={{ color: colors.text.accent }}
        >
          USER GOAL LINKS
        </Typography>
        <Typography accessibilityRole="header" variant="heading">
          {activeLink ? 'Goal connection' : 'Link goals'}
        </Typography>
        <Typography variant="description">
          {activeLink
            ? 'This note explains the relationship you chose to preserve.'
            : 'Connect two visible goals and record why they belong together.'}
        </Typography>
      </View>

      {activeLink ? (
        <View style={{ gap: 14 }}>
          <View
            style={{
              backgroundColor: colors.background.subtle,
              borderRadius: 12,
              gap: 7,
              padding: 14,
            }}
          >
            <Typography variant="section-eyebrow">
              Connected goals
            </Typography>
            <Typography variant="title">
              {goalName(goals, activeLink.from.id)}
            </Typography>
            <Typography variant="caption">↔</Typography>
            <Typography variant="title">
              {goalName(goals, activeLink.to.id)}
            </Typography>
          </View>
          {editing ? (
            <Input
              disabled={mutation.isSaving}
              error={
                note.trim().length === 0
                  ? 'A link note is required.'
                  : null
              }
              label="Link note"
              maxLength={NOTE_MAX_LENGTH}
              multiline
              onChangeText={setNote}
              placeholder="Why are these goals connected?"
              value={note}
            />
          ) : (
            <View
              accessibilityLabel={`Link note: ${activeLink.note}`}
              style={{
                borderColor: colors.border.warm,
                borderRadius: 12,
                borderWidth: 1,
                gap: 6,
                padding: 14,
              }}
            >
              <Typography variant="section-eyebrow">Note</Typography>
              <Typography variant="description">
                {activeLink.note}
              </Typography>
            </View>
          )}
          {mutation.error ? (
            <Typography
              accessibilityRole="alert"
              variant="caption"
              style={{ color: colors.feedback.danger.text }}
            >
              {mutation.error}
            </Typography>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {editing ? (
              <>
                <Button
                  disabled={note.trim().length === 0}
                  loading={mutation.isSaving}
                  onPress={() => void saveNote()}
                  style={{ flex: 1 }}
                >
                  Save note
                </Button>
                <Button
                  disabled={mutation.isSaving}
                  onPress={() => setEditing(false)}
                  variant="secondary"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  disabled={mutation.isSaving}
                  onPress={() => setEditing(true)}
                  style={{ flex: 1 }}
                >
                  Edit note
                </Button>
                <Button
                  disabled={mutation.isSaving}
                  onPress={() => void remove()}
                  variant="danger"
                >
                  Remove link
                </Button>
              </>
            )}
          </View>
          {!editing ? (
            <Button
              disabled={mutation.isSaving}
              onPress={() => setActiveLinkId(null)}
              variant="secondary"
            >
              Back to all links
            </Button>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: 18 }}>
          <GoalChoiceList
            disabled={mutation.isSaving}
            goals={goals}
            label="First goal"
            onSelect={(goalId) => {
              setSourceGoalId(goalId);
              if (targetGoalId === goalId) setTargetGoalId(null);
            }}
            selectedId={sourceGoalId}
          />
          <GoalChoiceList
            disabled={mutation.isSaving}
            goals={goals.filter((goal) => goal.id !== sourceGoalId)}
            label="Second goal"
            onSelect={setTargetGoalId}
            selectedId={targetGoalId}
          />
          <Input
            disabled={mutation.isSaving}
            error={note.length > 0 ? noteError : null}
            label="Link note"
            maxLength={NOTE_MAX_LENGTH}
            multiline
            onChangeText={setNote}
            placeholder="Why are these goals connected?"
            value={note}
          />
          {mutation.error ? (
            <Typography
              accessibilityRole="alert"
              variant="caption"
              style={{ color: colors.feedback.danger.text }}
            >
              {mutation.error}
            </Typography>
          ) : null}
          <Button
            disabled={
              !sourceGoalId
              || !targetGoalId
              || noteError !== null
            }
            loading={mutation.isSaving}
            onPress={() => void create()}
          >
            Link goals
          </Button>

          <View style={{ gap: 9 }}>
            <Typography variant="section-eyebrow">
              {`Existing links · ${links.length}`}
            </Typography>
            {links.length === 0 ? (
              <Typography variant="description">
                No user-authored goal links yet.
              </Typography>
            ) : links.map((link) => (
              <Pressable
                accessibilityLabel={`View link between ${goalName(goals, link.from.id)} and ${goalName(goals, link.to.id)}`}
                accessibilityRole="button"
                key={link.linkId}
                onPress={() => setActiveLinkId(link.linkId)}
                style={({ pressed }) => ({
                  backgroundColor: pressed
                    ? colors.background.selectedRow
                    : colors.background.input,
                  borderColor: colors.border.input,
                  borderRadius: 10,
                  borderWidth: 1,
                  gap: 5,
                  padding: 12,
                })}
              >
                <Typography variant="label">
                  {`${goalName(goals, link.from.id)} ↔ ${goalName(goals, link.to.id)}`}
                </Typography>
                <Typography numberOfLines={2} variant="caption">
                  {link.note}
                </Typography>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ConstellationInspectorSurface>
  );
}
