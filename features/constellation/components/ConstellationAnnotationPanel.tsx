import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import type { ConstellationMutationState } from '../hooks/useConstellation';
import type {
  ConstellationAnnotationDTO,
  ConstellationAnnotationKind,
  ConstellationEarnedNodeDTO,
  CreateConstellationAnnotationInput,
} from '../types';

const LABEL_MAX_LENGTH = 120;
const BODY_MAX_LENGTH = 5_000;

interface ConstellationAnnotationPanelProps {
  annotation?: ConstellationAnnotationDTO;
  initialKind?: ConstellationAnnotationKind;
  mutation: ConstellationMutationState;
  onArchive: () => Promise<boolean>;
  onCancel: () => void;
  onSave: (
    input: CreateConstellationAnnotationInput,
  ) => Promise<boolean>;
  visibleEarnedNodes: readonly ConstellationEarnedNodeDTO[];
}

function kindLabel(kind: ConstellationAnnotationKind): string {
  return kind === 'note' ? 'Note' : 'Projection';
}

function normalizedBody(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function ConstellationAnnotationPanel({
  annotation,
  initialKind = 'note',
  mutation,
  onArchive,
  onCancel,
  onSave,
  visibleEarnedNodes,
}: ConstellationAnnotationPanelProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const narrow = width < 760;
  const [kind, setKind] = useState<ConstellationAnnotationKind>(
    annotation?.kind ?? initialKind,
  );
  const [label, setLabel] = useState(annotation?.label ?? '');
  const [body, setBody] = useState(annotation?.body ?? '');
  const [anchorId, setAnchorId] = useState<string | null>(
    annotation?.anchorEarnedNodeId ?? null,
  );
  const [labelError, setLabelError] = useState<string | null>(null);
  const [archiveConfirmation, setArchiveConfirmation] = useState(false);
  const [lastAction, setLastAction] = useState<'save' | 'archive'>('save');

  const visibleAnchorIds = useMemo(
    () => new Set(visibleEarnedNodes.map((node) => node.id)),
    [visibleEarnedNodes],
  );

  useEffect(() => {
    setKind(annotation?.kind ?? initialKind);
    setLabel(annotation?.label ?? '');
    setBody(annotation?.body ?? '');
    setAnchorId(
      annotation?.anchorEarnedNodeId
      && visibleAnchorIds.has(annotation.anchorEarnedNodeId)
        ? annotation.anchorEarnedNodeId
        : null,
    );
    setLabelError(null);
    setArchiveConfirmation(false);
    setLastAction('save');
  }, [annotation?.id, initialKind]);

  useEffect(() => {
    setAnchorId((current) => (
      current && !visibleAnchorIds.has(current) ? null : current
    ));
  }, [visibleAnchorIds]);

  async function save() {
    const trimmedLabel = label.trim();
    if (trimmedLabel.length === 0) {
      setLabelError('Add a short label.');
      return;
    }
    if (trimmedLabel.length > LABEL_MAX_LENGTH) {
      setLabelError(`Keep the label to ${LABEL_MAX_LENGTH} characters.`);
      return;
    }
    if (body.trim().length > BODY_MAX_LENGTH) return;

    setLabelError(null);
    setLastAction('save');
    await onSave({
      kind,
      label: trimmedLabel,
      body: normalizedBody(body),
      anchorEarnedNodeId: anchorId,
    });
  }

  async function archive() {
    if (!archiveConfirmation) {
      setArchiveConfirmation(true);
      return;
    }
    setLastAction('archive');
    await onArchive();
  }

  const title = annotation
    ? `Edit ${kindLabel(kind)}`
    : `Create ${kindLabel(initialKind)}`;
  const saveLabel = mutation.error && mutation.retryable && lastAction === 'save'
    ? 'Retry save'
    : annotation
      ? 'Save changes'
      : `Create ${kindLabel(kind)}`;

  return (
    <View
      accessibilityLabel={`${title} annotation panel`}
      style={{
        backgroundColor: colors.background.card,
        borderColor: colors.border.warm,
        borderLeftWidth: narrow ? 0 : 1,
        flex: narrow ? 1 : undefined,
        minHeight: 0,
        width: narrow ? '100%' : 390,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          gap: 22,
          padding: narrow ? 20 : 26,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 7 }}>
          <Typography
            variant="section-eyebrow"
            style={{ color: colors.text.accent }}
          >
            USER-AUTHORED · DRAFT
          </Typography>
          <Typography accessibilityRole="header" variant="heading">
            {title}
          </Typography>
          <Typography variant="description">
            Draft annotations stay separate from earned patterns, confidence,
            evidence, and connections.
          </Typography>
        </View>

        <View style={{ gap: 9 }}>
          <Typography variant="field-label">Kind</Typography>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['note', 'projection'] as const).map((option) => {
              const selected = kind === option;
              return (
                <Pressable
                  accessibilityLabel={`Annotation kind ${kindLabel(option)}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={mutation.isSaving}
                  key={option}
                  onPress={() => setKind(option)}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    backgroundColor: selected
                      ? colors.background.selectedRow
                      : colors.background.input,
                    borderColor: selected
                      ? colors.border.accent
                      : colors.border.input,
                    borderRadius: 10,
                    borderWidth: selected ? 2 : 1,
                    flex: 1,
                    minHeight: 44,
                    justifyContent: 'center',
                    opacity: pressed ? 0.72 : 1,
                  })}
                >
                  <Typography
                    variant="label"
                    style={{
                      color: selected
                        ? colors.text.accent
                        : colors.text.primary,
                    }}
                  >
                    {kindLabel(option)}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Input
          autoCapitalize="sentences"
          disabled={mutation.isSaving}
          error={labelError}
          label="Label"
          maxLength={LABEL_MAX_LENGTH}
          onChangeText={(value) => {
            setLabel(value);
            if (labelError) setLabelError(null);
          }}
          placeholder={kind === 'note' ? 'A thought to hold onto' : 'A direction I can imagine'}
          value={label}
        />

        <View style={{ gap: 6 }}>
          <Input
            autoCapitalize="sentences"
            disabled={mutation.isSaving}
            label="Body (optional)"
            maxLength={BODY_MAX_LENGTH}
            multiline
            onChangeText={setBody}
            placeholder="Add private context for this draft."
            value={body}
          />
          <Typography variant="caption" style={{ textAlign: 'right' }}>
            {`${body.length} / ${BODY_MAX_LENGTH}`}
          </Typography>
        </View>

        <View style={{ gap: 9 }}>
          <Typography variant="field-label">
            Anchor to a visible earned node (optional)
          </Typography>
          <Typography variant="caption">
            Anchoring positions this draft near one earned node. It does not
            create or change a system edge.
          </Typography>
          <View style={{ gap: 7 }}>
            <Pressable
              accessibilityLabel="No annotation anchor"
              accessibilityRole="button"
              accessibilityState={{ selected: anchorId === null }}
              disabled={mutation.isSaving}
              onPress={() => setAnchorId(null)}
              style={({ pressed }) => ({
                backgroundColor: anchorId === null
                  ? colors.background.selectedRow
                  : colors.background.input,
                borderColor: anchorId === null
                  ? colors.border.accent
                  : colors.border.input,
                borderRadius: 10,
                borderWidth: 1,
                minHeight: 44,
                opacity: pressed ? 0.72 : 1,
                paddingHorizontal: 13,
                paddingVertical: 11,
              })}
            >
              <Typography variant="label">No anchor</Typography>
            </Pressable>
            {visibleEarnedNodes.map((node) => {
              const selected = anchorId === node.id;
              return (
                <Pressable
                  accessibilityLabel={`Anchor to earned ${node.kind}: ${node.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={mutation.isSaving}
                  key={node.id}
                  onPress={() => setAnchorId(node.id)}
                  style={({ pressed }) => ({
                    backgroundColor: selected
                      ? colors.background.selectedRow
                      : colors.background.input,
                    borderColor: selected
                      ? colors.border.accent
                      : colors.border.input,
                    borderRadius: 10,
                    borderWidth: 1,
                    gap: 3,
                    minHeight: 44,
                    opacity: pressed ? 0.72 : 1,
                    paddingHorizontal: 13,
                    paddingVertical: 10,
                  })}
                >
                  <Typography variant="label">{node.label}</Typography>
                  <Typography
                    variant="caption"
                    style={{ textTransform: 'capitalize' }}
                  >
                    {`Earned ${node.kind}`}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        </View>

        {mutation.error ? (
          <View
            accessibilityRole="alert"
            style={{
              backgroundColor: colors.feedback.danger.bg,
              borderColor: colors.feedback.danger.border,
              borderRadius: 10,
              borderWidth: 1,
              gap: 4,
              padding: 12,
            }}
          >
            <Typography
              variant="label"
              style={{ color: colors.feedback.danger.text }}
            >
              {lastAction === 'archive'
                ? 'Archive failed'
                : 'Save failed'}
            </Typography>
            <Typography
              variant="caption"
              style={{ color: colors.feedback.danger.text }}
            >
              {mutation.error}
            </Typography>
          </View>
        ) : null}

        <View style={{ gap: 9, marginTop: 'auto' }}>
          <View
            style={{
              flexDirection: narrow ? 'column-reverse' : 'row',
              gap: 8,
            }}
          >
            <Button
              accessibilityLabel="Cancel annotation changes"
              disabled={mutation.isSaving}
              onPress={onCancel}
              style={{ flex: narrow ? undefined : 1 }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              accessibilityLabel={saveLabel}
              loading={mutation.isSaving && lastAction === 'save'}
              onPress={() => void save()}
              style={{ flex: narrow ? undefined : 1 }}
            >
              {saveLabel}
            </Button>
          </View>

          {annotation ? (
            <Button
              accessibilityLabel={
                archiveConfirmation
                  ? 'Confirm archive annotation'
                  : 'Archive annotation'
              }
              disabled={mutation.isSaving && lastAction !== 'archive'}
              loading={mutation.isSaving && lastAction === 'archive'}
              onPress={() => void archive()}
              variant="danger"
            >
              {mutation.error
                && mutation.retryable
                && lastAction === 'archive'
                ? 'Retry archive'
                : archiveConfirmation
                  ? 'Confirm archive'
                  : 'Archive annotation'}
            </Button>
          ) : null}

          {archiveConfirmation && !mutation.isSaving ? (
            <Typography variant="caption" style={{ textAlign: 'center' }}>
              This removes the draft from the active graph. It remains archived
              on your account.
            </Typography>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
