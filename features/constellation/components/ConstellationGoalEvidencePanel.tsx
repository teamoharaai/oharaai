import {
  Pressable,
  View,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { BrtPicker } from '@/components/ui/BrtPicker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import {
  groupGoalEvidenceItems,
} from '../evidence-state';
import type { useGoalEvidence } from '../hooks/useGoalEvidence';
import { brtDisplayLabel } from '../tokens';
import type {
  ConstellationBrtCategory,
  ConstellationEchoSearchOption,
  ConstellationGoalEvidenceItem,
} from '../types';
import { ConstellationInspectorSurface } from './ConstellationInspectorSurface';
import { ConstellationLoadingMark } from './ConstellationLoadingMark';

const NOTE_MAX_LENGTH = 280;
const SEARCH_MAX_LENGTH = 120;
const CATEGORIES = [
  'bud',
  'rose',
  'thorn',
] as const satisfies readonly ConstellationBrtCategory[];

type GoalEvidenceController = ReturnType<typeof useGoalEvidence>;

interface ConstellationGoalEvidencePanelProps {
  clusterCategory?: ConstellationBrtCategory;
  connectedCount: number;
  evidence: GoalEvidenceController;
  goalDescription: string | null;
  goalTitle: string;
  onClose: () => void;
  onOpenVault?: () => void;
  selectionKey: string;
}

function echoTitle(
  echo: Pick<ConstellationGoalEvidenceItem['echo'], 'title'>,
): string {
  return echo.title?.trim() || 'Untitled Entry';
}

function formattedDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
}

function normalizedNote(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function InlineError({
  message,
  title = 'Could not save the reference',
}: {
  message: string;
  title?: string;
}) {
  const colors = useThemeColors();
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.feedback.danger.bg,
        borderColor: colors.feedback.danger.border,
        borderRadius: 10,
        borderWidth: 1,
        gap: 3,
        padding: 11,
      }}
    >
      <Typography
        variant="label"
        style={{ color: colors.feedback.danger.text }}
      >
        {title}
      </Typography>
      <Typography
        variant="caption"
        style={{ color: colors.feedback.danger.text }}
      >
        {message}
      </Typography>
    </View>
  );
}

function EchoOptionRow({
  disabled,
  onSelect,
  option,
  selected,
}: {
  disabled: boolean;
  onSelect: () => void;
  option: ConstellationEchoSearchOption;
  selected: boolean;
}) {
  const colors = useThemeColors();
  const existing = option.existingReference;

  return (
    <Pressable
      accessibilityLabel={
        existing
          ? `${echoTitle(option)} is already referenced as ${brtDisplayLabel(existing.brtCategory)}`
          : `Select entry ${echoTitle(option)}`
      }
      accessibilityRole="button"
      accessibilityState={{
        disabled: disabled || existing !== null,
        selected,
      }}
      disabled={disabled || existing !== null}
      onPress={onSelect}
      style={({ pressed }) => ({
        backgroundColor: selected
          ? colors.background.selectedRow
          : colors.background.input,
        borderColor: selected
          ? colors.border.accent
          : colors.border.input,
        borderRadius: 10,
        borderWidth: selected ? 2 : 1,
        gap: 5,
        minHeight: 44,
        opacity: disabled ? 0.5 : pressed ? 0.74 : 1,
        padding: 12,
      })}
    >
      <View
        style={{
          alignItems: 'baseline',
          flexDirection: 'row',
          gap: 8,
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="label" style={{ flex: 1 }}>
          {echoTitle(option)}
        </Typography>
        <Typography variant="caption">
          {existing
            ? `Referenced · ${brtDisplayLabel(existing.brtCategory)}`
            : formattedDate(option.createdAt)}
        </Typography>
      </View>
      <Typography numberOfLines={3} variant="caption">
        {option.excerpt || 'This entry has no preview text.'}
      </Typography>
    </Pressable>
  );
}

function AddEvidenceForm({
  evidence,
  initialCategory = 'bud',
  onDone,
}: {
  evidence: GoalEvidenceController;
  initialCategory?: ConstellationBrtCategory;
  onDone: () => void;
}) {
  const colors = useThemeColors();
  const [query, setQuery] = useState('');
  const [selectedEchoId, setSelectedEchoId] = useState<string | null>(null);
  const [category, setCategory] =
    useState<ConstellationBrtCategory>(initialCategory);
  const [note, setNote] = useState('');
  const selectedOption = evidence.search.options.find(
    (option) => option.id === selectedEchoId,
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void evidence.searchEchoes(query);
    }, query.length === 0 ? 0 : 250);
    return () => clearTimeout(timer);
  }, [query, evidence.searchEchoes]);

  useEffect(() => {
    if (
      selectedOption?.existingReference
      || (
        selectedEchoId
        && evidence.search.status === 'ready'
        && !selectedOption
      )
    ) {
      setSelectedEchoId(null);
    }
  }, [
    evidence.search.status,
    selectedEchoId,
    selectedOption,
  ]);

  async function add() {
    if (!selectedOption || note.trim().length > NOTE_MAX_LENGTH) return;
    const saved = await evidence.addReference(selectedOption, category, {
      note: normalizedNote(note),
    });
    if (saved) onDone();
  }

  const saving = (
    evidence.mutation.isSaving
    && evidence.mutation.kind === 'create'
  );

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 5 }}>
        <Typography variant="section-eyebrow">
          Add entry reference
        </Typography>
        <Typography variant="description">
          Choose one of your entries. This adds goal-specific evidence without
          moving or reclassifying the entry itself.
        </Typography>
      </View>

      <Input
        autoCapitalize="none"
        autoCorrect={false}
        disabled={saving}
        label="Search your entries"
        maxLength={SEARCH_MAX_LENGTH}
        onChangeText={(value) => {
          setQuery(value);
          setSelectedEchoId(null);
          evidence.clearMutationError();
        }}
        placeholder="Search entry titles or content"
        value={query}
      />

      <View style={{ gap: 8 }}>
        {evidence.search.status === 'loading' ? (
          <View
            accessibilityLabel="Searching entries"
            accessibilityRole="progressbar"
            style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}
          >
            <ConstellationLoadingMark color={colors.accent.primary} />
            <Typography variant="caption">Searching your entries…</Typography>
          </View>
        ) : evidence.search.status === 'error' ? (
          <View style={{ gap: 9 }}>
            <InlineError
              message={evidence.search.error ?? 'Entry search failed.'}
              title="Could not search entries"
            />
            {evidence.search.retryable ? (
              <Button
                onPress={() => void evidence.retrySearch()}
                size="compact"
                variant="secondary"
              >
                Retry search
              </Button>
            ) : null}
          </View>
        ) : evidence.search.status === 'ready'
          && evidence.search.options.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.background.subtle,
                borderRadius: 10,
                padding: 14,
              }}
            >
              <Typography variant="description">
                {query.trim()
                  ? 'No entries match this search.'
                  : 'You do not have any entries to reference yet.'}
              </Typography>
            </View>
          ) : (
            evidence.search.options.map((option) => (
              <EchoOptionRow
                disabled={saving}
                key={option.id}
                onSelect={() => {
                  evidence.clearMutationError();
                  setSelectedEchoId(option.id);
                }}
                option={option}
                selected={option.id === selectedEchoId}
              />
            ))
          )}
      </View>

      {selectedOption ? (
        <>
          <View style={{ gap: 8 }}>
            <Typography variant="field-label">Goal evidence category</Typography>
            <BrtPicker
              disabled={saving}
              onChange={setCategory}
              value={category}
            />
          </View>
          <View style={{ gap: 5 }}>
            <Input
              autoCapitalize="sentences"
              disabled={saving}
              label="Short note (optional)"
              maxLength={NOTE_MAX_LENGTH}
              multiline
              onChangeText={setNote}
              placeholder="Why this entry matters for this goal"
              value={note}
            />
            <Typography variant="caption" style={{ textAlign: 'right' }}>
              {`${note.length} / ${NOTE_MAX_LENGTH}`}
            </Typography>
          </View>
        </>
      ) : null}

      {evidence.mutation.error
        && evidence.mutation.kind === 'create' ? (
          <InlineError message={evidence.mutation.error} />
        ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          disabled={saving}
          onPress={onDone}
          style={{ flex: 1 }}
          variant="secondary"
        >
          Cancel
        </Button>
        <Button
          disabled={!selectedOption}
          loading={saving}
          onPress={() => void add()}
          style={{ flex: 1 }}
        >
          {evidence.mutation.error
            && evidence.mutation.kind === 'create'
            && evidence.mutation.retryable
              ? 'Retry add'
              : 'Add reference'}
        </Button>
      </View>
    </View>
  );
}

function EvidenceItemCard({
  evidence,
  item,
  onRequestUnlink,
}: {
  evidence: GoalEvidenceController;
  item: ConstellationGoalEvidenceItem;
  onRequestUnlink: (item: ConstellationGoalEvidenceItem) => void;
}) {
  const colors = useThemeColors();
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState(item.brtCategory);
  const [note, setNote] = useState(item.note ?? '');
  const saving = (
    evidence.mutation.isSaving
    && evidence.mutation.kind === 'edit'
    && evidence.mutation.targetId === item.id
  );

  useEffect(() => {
    if (!editing) {
      setCategory(item.brtCategory);
      setNote(item.note ?? '');
    }
  }, [editing, item.brtCategory, item.note]);

  async function save() {
    const saved = await evidence.editReference(item.id, category, {
      note: normalizedNote(note),
    });
    if (saved) setEditing(false);
  }

  return (
    <View
      accessibilityLabel={`Entry evidence ${echoTitle(item.echo)}`}
      style={{
        backgroundColor: colors.background.input,
        borderColor: colors.border.input,
        borderRadius: 10,
        borderWidth: 1,
        gap: 9,
        padding: 12,
      }}
    >
      <View style={{ gap: 3 }}>
        <Typography numberOfLines={2} variant="label">{echoTitle(item.echo)}</Typography>
        <Typography variant="caption">
          {formattedDate(item.echo.createdAt)}
        </Typography>
      </View>
      <Typography numberOfLines={editing ? undefined : 3} variant="caption">
        {item.echo.excerpt || 'This entry has no preview text.'}
      </Typography>
      {!editing && item.note ? (
        <View
          style={{
            borderLeftColor: colors.brt[item.brtCategory],
            borderLeftWidth: 3,
            paddingLeft: 9,
          }}
        >
          <Typography variant="caption">{item.note}</Typography>
        </View>
      ) : null}

      {editing ? (
        <View style={{ gap: 12 }}>
          <BrtPicker
            disabled={saving}
            onChange={setCategory}
            value={category}
          />
          <Input
            autoCapitalize="sentences"
            disabled={saving}
            label="Short note (optional)"
            maxLength={NOTE_MAX_LENGTH}
            multiline
            onChangeText={setNote}
            placeholder="Why this entry matters for this goal"
            value={note}
          />
          {evidence.mutation.error
            && evidence.mutation.kind === 'edit'
            && evidence.mutation.targetId === item.id ? (
              <InlineError message={evidence.mutation.error} />
            ) : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              disabled={saving}
              onPress={() => {
                evidence.clearMutationError();
                setEditing(false);
              }}
              size="compact"
              style={{ flex: 1 }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              loading={saving}
              onPress={() => void save()}
              size="compact"
              style={{ flex: 1 }}
            >
              {evidence.mutation.error
                && evidence.mutation.retryable
                && evidence.mutation.kind === 'edit'
                  ? 'Retry save'
                  : 'Save'}
            </Button>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            disabled={evidence.mutation.isSaving}
            onPress={() => {
              evidence.clearMutationError();
              setEditing(true);
            }}
            size="compact"
            style={{ flex: 1 }}
            variant="secondary"
          >
            Edit
          </Button>
          <Button
            disabled={evidence.mutation.isSaving}
            onPress={() => onRequestUnlink(item)}
            size="compact"
            style={{ flex: 1 }}
            variant="danger"
          >
            Unlink
          </Button>
        </View>
      )}
    </View>
  );
}

export function ConstellationGoalEvidencePanel({
  clusterCategory,
  connectedCount,
  evidence,
  goalDescription,
  goalTitle,
  onClose,
  onOpenVault,
  selectionKey,
}: ConstellationGoalEvidencePanelProps) {
  const colors = useThemeColors();
  const [adding, setAdding] = useState(false);
  const [unlinkItem, setUnlinkItem] =
    useState<ConstellationGoalEvidenceItem | null>(null);
  const grouped = useMemo(
    () => groupGoalEvidenceItems(evidence.dto?.items ?? []),
    [evidence.dto?.items],
  );
  const displayCategories = clusterCategory
    ? [clusterCategory]
    : CATEGORIES;

  useEffect(() => {
    setAdding(false);
    setUnlinkItem(null);
  }, [clusterCategory, evidence.dto?.goal.id]);

  async function unlink() {
    if (!unlinkItem) return;
    const removed = await evidence.unlinkReference(unlinkItem.id);
    if (removed) setUnlinkItem(null);
  }

  const unlinkSaving = (
    evidence.mutation.isSaving
    && evidence.mutation.kind === 'unlink'
    && evidence.mutation.targetId === unlinkItem?.id
  );

  return (
    <ConstellationInspectorSurface
      accessibilityLabel={
        clusterCategory
          ? `${brtDisplayLabel(clusterCategory)} evidence cluster for ${goalTitle}`
          : `Goal inspector for ${goalTitle}`
      }
      closeDisabled={evidence.mutation.isSaving}
      onClose={onClose}
      selectionKey={selectionKey}
    >
        <View style={{ gap: 6 }}>
          <Typography
            variant="section-eyebrow"
            style={{ color: colors.text.accent }}
          >
            {clusterCategory
              ? `VIRTUAL ${brtDisplayLabel(clusterCategory).toUpperCase()} CLUSTER`
              : `GOAL${evidence.dto?.goal.project
                ? ` · ${evidence.dto.goal.project.title.toUpperCase()}`
                : ''}`}
          </Typography>
          <Typography accessibilityRole="header" numberOfLines={3} variant="heading">
            {clusterCategory
              ? `${brtDisplayLabel(clusterCategory)} references`
              : goalTitle}
          </Typography>
          <Typography numberOfLines={5} variant="description">
            {clusterCategory
              ? `A live, virtual group of entry references for ${goalTitle}.`
              : evidence.dto?.goal.description
                ?? goalDescription
                ?? 'An active goal in your current Constellation.'}
          </Typography>
        </View>

        {!clusterCategory ? (
          <View style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
              }}
            >
              {[
                ['Status', evidence.dto?.goal.status ?? 'active'],
                ['Connected', String(connectedCount)],
                ['Evidence', String(evidence.dto?.items.length ?? 0)],
              ].map(([label, value]) => (
                <View
                  key={label}
                  style={{
                    backgroundColor: colors.background.subtle,
                    borderRadius: 10,
                    flex: 1,
                    gap: 3,
                    padding: 10,
                  }}
                >
                  <Typography variant="caption">{label}</Typography>
                  <Typography
                    variant="label"
                    style={{ textTransform: label === 'Status' ? 'capitalize' : undefined }}
                  >
                    {value}
                  </Typography>
                </View>
              ))}
            </View>
            {evidence.dto?.goal.deadline ? (
              <Typography variant="caption">
                {`Target date · ${formattedDate(evidence.dto.goal.deadline)}`}
              </Typography>
            ) : null}
          </View>
        ) : null}

        {adding ? (
          <AddEvidenceForm
            evidence={evidence}
            initialCategory={clusterCategory}
            onDone={() => {
              evidence.clearMutationError();
              setAdding(false);
            }}
          />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                disabled={
                  evidence.mutation.isSaving
                  || evidence.status !== 'ready'
                }
                onPress={() => {
                  evidence.clearMutationError();
                  setAdding(true);
                }}
                style={{ flex: 1 }}
              >
                Add entry reference
              </Button>
              {!clusterCategory
                && evidence.dto?.goal.vaultId
                && onOpenVault ? (
                  <Button
                    disabled={evidence.mutation.isSaving}
                    onPress={onOpenVault}
                    variant="secondary"
                  >
                    Open in vault
                  </Button>
                ) : null}
            </View>

            <View style={{ gap: 5 }}>
              <Typography variant="section-eyebrow">
                {clusterCategory
                  ? `${brtDisplayLabel(clusterCategory)} entries`
                  : 'Manual evidence'}
              </Typography>
              <Typography variant="description">
                Entry references are goal-specific. They never move, delete, or
                reclassify the original entry.
              </Typography>
            </View>

            {evidence.status === 'loading' ? (
              <View
                accessibilityLabel="Loading goal evidence"
                accessibilityRole="progressbar"
                style={{ alignItems: 'center', gap: 9, paddingVertical: 28 }}
              >
                <ConstellationLoadingMark color={colors.accent.primary} />
                <Typography variant="caption">
                  Loading goal evidence…
                </Typography>
              </View>
            ) : evidence.status === 'error' ? (
              <View style={{ gap: 10 }}>
                <InlineError
                  message={evidence.error ?? 'Goal evidence could not be loaded.'}
                  title="Could not load goal evidence"
                />
                {evidence.retryable ? (
                  <Button onPress={() => void evidence.retry()}>
                    Retry
                  </Button>
                ) : null}
              </View>
            ) : evidence.dto?.items.length === 0 ? (
              <View
                style={{
                  backgroundColor: colors.background.subtle,
                  borderRadius: 10,
                  gap: 5,
                  padding: 15,
                }}
              >
                <Typography variant="label">No entry references yet</Typography>
                <Typography variant="description">
                  Add one of your entries and choose how it functions for this goal.
                </Typography>
              </View>
            ) : (
              displayCategories.map((category) => {
                const items = grouped[category];
                const color = colors.brt[category];
                return (
                  <View key={category} style={{ gap: 9 }}>
                    <View
                      style={{
                        alignItems: 'center',
                        flexDirection: 'row',
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: color,
                          borderRadius: 999,
                          height: 9,
                          width: 9,
                        }}
                      />
                      <Typography variant="title">
                        {brtDisplayLabel(category)}
                      </Typography>
                      <Typography variant="caption">
                        {items.length}
                      </Typography>
                    </View>
                    {items.length === 0 ? (
                      <Typography variant="caption">
                        No {brtDisplayLabel(category).toLowerCase()} evidence.
                      </Typography>
                    ) : items.map((item) => (
                      <EvidenceItemCard
                        evidence={evidence}
                        item={item}
                        key={item.id}
                        onRequestUnlink={(selected) => {
                          evidence.clearMutationError();
                          setUnlinkItem(selected);
                        }}
                      />
                    ))}
                  </View>
                );
              })
            )}
          </>
        )}

      <Modal
        cancelDisabled={unlinkSaving}
        cancelText="Cancel"
        closeDisabled={unlinkSaving}
        confirmDisabled={unlinkSaving}
        confirmText={unlinkSaving ? 'Unlinking…' : 'Unlink reference'}
        confirmVariant="destructive"
        onCancel={() => {
          evidence.clearMutationError();
          setUnlinkItem(null);
        }}
        onClose={() => {
          evidence.clearMutationError();
          setUnlinkItem(null);
        }}
        onConfirm={() => void unlink()}
        showCloseButton={false}
        visible={unlinkItem !== null}
      >
        <View style={{ gap: 10 }}>
          <Typography accessibilityRole="header" variant="heading">
            Unlink this entry?
          </Typography>
          <Typography variant="description">
            This removes only the evidence reference from this goal. The entry
            itself and its current folder or goal container stay unchanged.
          </Typography>
          {evidence.mutation.error
            && evidence.mutation.kind === 'unlink'
            && evidence.mutation.targetId === unlinkItem?.id ? (
              <InlineError message={evidence.mutation.error} />
            ) : null}
        </View>
      </Modal>
    </ConstellationInspectorSurface>
  );
}
