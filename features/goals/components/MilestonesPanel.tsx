import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  DatePicker,
  formatCalendarDate,
  parseCalendarDate,
  type DatePickerDensity,
} from '@/components/ui/DatePicker';
import { OverflowMenu, type OverflowAction } from '@/components/ui/OverflowMenu';
import { useThemeColors } from '@/store/uiStore';
import { FONT, TYPE } from '@/constants/design';
import type {
  GoalMilestone,
  GoalMilestoneInput,
  GoalMilestoneUpdates,
  MilestoneKind,
} from '../types';

type EditableMilestoneUpdates = Omit<GoalMilestoneUpdates, 'completedAt'>;

export interface MilestonesPanelProps {
  milestones: readonly GoalMilestone[];
  hasSuccessor: boolean;
  ended: boolean;
  embedded?: boolean;
  archived?: boolean;
  subtitle?: string;
  completingIds?: ReadonlySet<string>;
  /** Cross-goal deadline density, shown as an amber ramp on the target-date picker. */
  deadlineDensity?: DatePickerDensity;
  onAdd?: (input: GoalMilestoneInput) => Promise<void>;
  onSave?: (milestoneId: string, updates: EditableMilestoneUpdates) => Promise<void>;
  onDelete?: (milestoneId: string) => Promise<void>;
  onComplete?: (milestoneId: string) => Promise<void>;
  onAttachPhoto?: (milestoneId: string) => Promise<void>;
  resolvePhotoUrl?: (storagePath: string) => Promise<string>;
  error?: string | null;
  onDismissError?: () => void;
}

interface MilestoneEditorProps {
  initial?: GoalMilestone;
  submitLabel: string;
  /** Show the optional target-count field (top-level achievements only). */
  showTargetCount?: boolean;
  /** Evidence-child mode: label the text as a caption, drop the date field. */
  captionMode?: boolean;
  /** Set on child editors so the new row links to its parent. */
  parentId?: string | null;
  /** Cross-goal deadline density for the target-date picker's amber ramp. */
  density?: DatePickerDensity;
  onCancel: () => void;
  onSubmit: (input: GoalMilestoneInput) => Promise<void>;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

function toDateInput(value: Date | null | undefined): string {
  return value ? formatCalendarDate(value) : '';
}

function parseDateInput(value: string): Date | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseCalendarDate(trimmed);
  if (!parsed) return undefined;
  parsed.setHours(12, 0, 0, 0);
  return parsed;
}

/** Resolves a stored photo path to a signed URL and renders it. */
function MilestonePhoto({
  storagePath,
  resolve,
  height,
}: {
  storagePath: string;
  resolve?: (path: string) => Promise<string>;
  height: number;
}) {
  const colors = useThemeColors();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!resolve) return;
    let active = true;
    setUrl(null);
    setFailed(false);
    resolve(storagePath)
      .then((resolved) => {
        if (active) setUrl(resolved);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [storagePath, resolve]);

  const frameStyle = {
    alignItems: 'center' as const,
    backgroundColor: colors.background.input,
    borderRadius: 12,
    height,
    justifyContent: 'center' as const,
    marginBottom: 12,
    overflow: 'hidden' as const,
    width: '100%' as const,
  };

  if (failed) {
    return (
      <View style={frameStyle}>
        <Text style={{ color: colors.text.muted, ...TYPE.caption }}>Photo unavailable</Text>
      </View>
    );
  }
  if (!url) {
    return (
      <View style={frameStyle}>
        <ActivityIndicator color={colors.accent.primary} size="small" />
      </View>
    );
  }
  return (
    <Image
      accessibilityLabel="Milestone photo"
      resizeMode="cover"
      source={{ uri: url }}
      style={{ borderRadius: 12, height, marginBottom: 12, width: '100%' }}
    />
  );
}

/**
 * Compact stepper for an achievement's optional target count. Empty (`—`) means
 * no counter (a single achievement); stepping up from empty starts at 1, and
 * stepping below 1 clears back to none. Sits inline with the date icon.
 */
function TargetStepper({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const colors = useThemeColors();
  const current = value ? Number.parseInt(value, 10) : 0;
  const set = (next: number) => onChange(next <= 0 ? '' : String(Math.min(next, 99)));

  const stepStyle = (disabled: boolean) => ({
    alignItems: 'center' as const,
    height: 38,
    justifyContent: 'center' as const,
    opacity: disabled ? 0.35 : 1,
    width: 40,
  });

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
      <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 13 }}>
        Target
      </Text>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.background.input,
          borderColor: colors.border.input,
          borderRadius: 10,
          borderWidth: 1,
          flexDirection: 'row',
          overflow: 'hidden',
        }}
      >
        <Pressable
          accessibilityLabel="Decrease target"
          accessibilityRole="button"
          accessibilityState={{ disabled: current <= 0 }}
          disabled={current <= 0}
          onPress={() => set(current - 1)}
          style={stepStyle(current <= 0)}
        >
          <Text style={{ color: colors.text.primary, fontFamily: 'Inter-Medium', fontSize: 18 }}>−</Text>
        </Pressable>
        <View style={{ alignItems: 'center', minWidth: 34 }}>
          <Text
            accessibilityLabel={current > 0 ? `Target ${current}` : 'No target'}
            style={{ color: current > 0 ? colors.text.primary : colors.text.muted, fontFamily: 'Inter-SemiBold', fontSize: 15 }}
          >
            {current > 0 ? current : '—'}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Increase target"
          accessibilityRole="button"
          onPress={() => set(current + 1)}
          style={stepStyle(false)}
        >
          <Text style={{ color: colors.text.primary, fontFamily: 'Inter-Medium', fontSize: 18 }}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MilestoneEditor({
  initial,
  submitLabel,
  showTargetCount = false,
  captionMode = false,
  parentId = null,
  density,
  onCancel,
  onSubmit,
}: MilestoneEditorProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 480;
  // Milestones are always achievements now (prep was retired). Kept explicit so
  // the input contract still carries a kind for the service layer.
  const kind: MilestoneKind = initial?.kind ?? 'achievement';
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dueDate, setDueDate] = useState(toDateInput(initial?.dueDate));
  const [targetCount, setTargetCount] = useState(
    initial?.targetCount != null ? String(initial.targetCount) : '',
  );
  // On the achievement builder the target count + target date live behind a
  // "More options" reveal (mirrors the Tasks editor). Auto-expand when either is
  // already set so an edit surfaces the existing values.
  const [showMore, setShowMore] = useState(
    Boolean(initial?.targetCount != null || initial?.dueDate),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError(captionMode ? 'A caption is required.' : 'A milestone name is required.');
      return;
    }
    const parsedDueDate = captionMode ? null : parseDateInput(dueDate);
    if (parsedDueDate === undefined) {
      setValidationError('Choose a valid target date.');
      return;
    }
    let parsedTarget: number | null = null;
    if (showTargetCount && targetCount.trim()) {
      const value = Number.parseInt(targetCount.trim(), 10);
      if (!Number.isFinite(value) || value <= 0) {
        setValidationError('Target count must be a whole number above zero.');
        return;
      }
      parsedTarget = value;
    }

    setValidationError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: trimmedTitle,
        description: description.trim() || null,
        dueDate: parsedDueDate,
        kind,
        parentId,
        targetCount: parsedTarget,
      });
      onCancel();
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputStyle = {
    backgroundColor: colors.background.input,
    borderColor: colors.border.input,
    borderRadius: 9,
    borderWidth: 1,
    color: colors.text.primary,
    ...TYPE.bodySmall,
    paddingHorizontal: 12,
    paddingVertical: 9,
  };

  return (
    <View
      style={{
        backgroundColor: colors.background.page,
        borderColor: colors.border.warm,
        borderRadius: 14,
        borderWidth: 1,
        gap: 10,
        padding: 14,
      }}
    >
      <TextInput
        accessibilityLabel={captionMode ? 'Evidence caption' : 'Milestone name'}
        autoFocus
        onChangeText={setTitle}
        placeholder={
          captionMode
            ? 'Caption — what shifted, the moment'
            : parentId
              ? 'Step name'
              : 'Milestone name'
        }
        placeholderTextColor={colors.text.muted}
        returnKeyType="next"
        style={inputStyle}
        value={title}
      />
      <TextInput
        accessibilityLabel={captionMode ? 'Evidence note' : 'Milestone description'}
        multiline
        onChangeText={setDescription}
        placeholder={
          captionMode
            ? 'Add a note (optional)'
            : 'What makes this meaningful? (optional)'
        }
        placeholderTextColor={colors.text.muted}
        style={[inputStyle, { minHeight: 64, textAlignVertical: 'top' }]}
        value={description}
      />
      {showTargetCount ? (
        <>
          <Pressable
            accessibilityLabel="More options"
            accessibilityRole="button"
            accessibilityState={{ expanded: showMore }}
            onPress={() => setShowMore((value) => !value)}
            style={{ alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 34 }}
          >
            <Ionicons
              color={colors.text.accent}
              name={showMore ? 'chevron-down' : 'chevron-forward'}
              size={14}
            />
            <Text style={{ color: colors.text.accent, fontFamily: 'Inter-Medium', fontSize: 13 }}>
              More options
            </Text>
          </Pressable>
          {showMore ? (
            <View style={{ gap: 6 }}>
              <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <TargetStepper onChange={setTargetCount} value={targetCount} />
                <DatePicker
                  accessibilityLabel="Target Date"
                  allowClear
                  compact
                  density={density}
                  onChange={setDueDate}
                  placeholder="Target Date"
                  value={dueDate}
                />
              </View>
              <Text style={{ color: colors.text.muted, ...TYPE.caption }}>
                Set a target to count sub-steps toward it (e.g. 3 recipes).
              </Text>
            </View>
          ) : null}
        </>
      ) : captionMode ? null : (
        <DatePicker
          accessibilityLabel="Milestone target date"
          allowClear
          density={density}
          onChange={setDueDate}
          placeholder="Choose a target date"
          style={{ width: '100%' }}
          value={dueDate}
        />
      )}
      {validationError ? (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.feedback.danger.text, ...TYPE.caption }}
        >
          {validationError}
        </Text>
      ) : null}
      <View style={{ flexDirection: compact ? 'column-reverse' : 'row', gap: 8 }}>
        <Pressable
          accessibilityLabel="Cancel milestone changes"
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={onCancel}
          style={({ pressed }) => ({
            alignItems: 'center',
            borderColor: colors.border.divider,
            borderRadius: 9,
            borderWidth: 1,
            flex: compact ? undefined : 1,
            opacity: pressed ? 0.72 : 1,
            paddingVertical: 9,
          })}
        >
          <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 13 }}>
            Cancel
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={submitLabel}
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={() => void handleSubmit()}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: colors.accent.primary,
            borderRadius: 9,
            flex: compact ? undefined : 1,
            justifyContent: 'center',
            minHeight: 38,
            opacity: isSubmitting ? 0.6 : pressed ? 0.82 : 1,
            paddingHorizontal: 14,
            paddingVertical: 9,
          })}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.text.inverse} size="small" />
          ) : (
            <Text style={{ color: colors.text.inverse, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>
              {submitLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Small circular completion control for achievement completion and counting
 * sub-steps. A filled green check is the ONLY "done" signal in this panel —
 * there is no strike-through on any type of milestone.
 */
function CompletionDot({
  completed,
  busy,
  disabled,
  size,
  label,
  onPress,
}: {
  completed: boolean;
  busy: boolean;
  disabled: boolean;
  size: number;
  label: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={completed ? 'text' : 'button'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: completed ? colors.accent.primary : colors.background.card,
        borderColor: completed ? colors.accent.primary : colors.text.muted,
        borderRadius: size / 2,
        borderWidth: completed ? 0 : 2,
        height: size,
        justifyContent: 'center',
        width: size,
      }}
    >
      {busy ? (
        <ActivityIndicator color={colors.accent.primary} size="small" />
      ) : completed ? (
        <Text style={{ color: colors.text.inverse, fontFamily: 'Inter-Bold', fontSize: size * 0.6 }}>
          ✓
        </Text>
      ) : null}
    </Pressable>
  );
}

export function MilestonesPanel({
  milestones,
  hasSuccessor,
  ended,
  embedded = false,
  archived = false,
  subtitle = 'The critical moments along the way',
  completingIds = new Set<string>(),
  deadlineDensity,
  onAdd,
  onSave,
  onDelete,
  onComplete,
  onAttachPhoto,
  resolvePhotoUrl,
  error,
  onDismissError,
}: MilestonesPanelProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null);
  const [photoBusyId, setPhotoBusyId] = useState<string | null>(null);

  const readOnly = hasSuccessor || ended || archived;

  const sorted = [...milestones].sort((left, right) => left.sortOrder - right.sortOrder);
  // Milestones are one-time achievements only — the legacy `prep` checklist was
  // retired (Goal Detail Redesign); enabling/recurring work lives in Tasks now.
  const achievements = sorted.filter((item) => item.parentId === null);
  const childrenByParent = new Map<string, GoalMilestone[]>();
  for (const item of sorted) {
    if (item.parentId === null) continue;
    const bucket = childrenByParent.get(item.parentId) ?? [];
    bucket.push(item);
    childrenByParent.set(item.parentId, bucket);
  }

  const completedCount = achievements.filter((item) => item.completedAt !== null).length;
  const upNextId = achievements.find((item) => item.completedAt === null)?.id ?? null;

  async function handleDelete(milestoneId: string) {
    setDeletingId(null);
    await onDelete?.(milestoneId);
  }

  async function handleAttachPhoto(milestoneId: string) {
    if (!onAttachPhoto) return;
    setPhotoBusyId(milestoneId);
    try {
      await onAttachPhoto(milestoneId);
    } finally {
      setPhotoBusyId(null);
    }
  }

  function renderRowActions(milestone: GoalMilestone, completed: boolean) {
    const actions: OverflowAction[] = [];
    if (onSave && !completed) {
      actions.push({
        key: 'edit',
        label: 'Edit',
        onPress: () => {
          setDeletingId(null);
          setEditingId(milestone.id);
        },
      });
    }
    if (onDelete) {
      actions.push({
        key: 'delete',
        label: 'Delete',
        destructive: true,
        onPress: () => {
          setEditingId(null);
          setDeletingId(milestone.id);
        },
      });
    }
    return <OverflowMenu accessibilityLabel={`Actions for ${milestone.title}`} actions={actions} />;
  }

  function renderDeleteConfirm(milestone: GoalMilestone) {
    return (
      <View
        style={{
          alignItems: compact ? 'stretch' : 'center',
          borderTopColor: colors.border.divider,
          borderTopWidth: 1,
          flexDirection: compact ? 'column' : 'row',
          gap: 8,
          justifyContent: 'space-between',
          marginTop: 10,
          paddingTop: 10,
        }}
      >
        <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 14 }}>
          Delete this milestone{childrenByParent.has(milestone.id) ? ' and everything under it' : ''}?
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            accessibilityLabel="Cancel deleting milestone"
            accessibilityRole="button"
            onPress={() => setDeletingId(null)}
            style={{ paddingHorizontal: 10, paddingVertical: 6 }}
          >
            <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 14 }}>
              Cancel
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Delete ${milestone.title}`}
            accessibilityRole="button"
            onPress={() => void handleDelete(milestone.id)}
            style={{
              backgroundColor: colors.feedback.danger.bg,
              borderColor: colors.feedback.danger.border,
              borderRadius: 8,
              borderWidth: 1,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: colors.feedback.danger.text, fontFamily: 'Inter-SemiBold', fontSize: 14 }}>
              Delete
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /** Photo + delete + edit actions shared by both child modes, in a `⋯` menu. */
  function renderChildActions(child: GoalMilestone) {
    if (readOnly || deletingId === child.id) return null;
    const actions: OverflowAction[] = [];
    if (onSave) {
      actions.push({
        key: 'edit',
        label: 'Edit',
        onPress: () => {
          setDeletingId(null);
          setEditingId(child.id);
        },
      });
    }
    if (onAttachPhoto) {
      actions.push({
        key: 'photo',
        label: child.photoUrl ? 'Replace photo' : 'Add photo',
        busy: photoBusyId === child.id,
        onPress: () => void handleAttachPhoto(child.id),
      });
    }
    if (onDelete) {
      actions.push({
        key: 'delete',
        label: 'Delete',
        destructive: true,
        onPress: () => {
          setEditingId(null);
          setDeletingId(child.id);
        },
      });
    }
    return <OverflowMenu accessibilityLabel={`Actions for ${child.title}`} actions={actions} size={28} />;
  }

  function renderChildEditor(child: GoalMilestone, captionMode: boolean) {
    return (
      <View key={child.id} style={{ marginVertical: 6 }}>
        <MilestoneEditor
          captionMode={captionMode}
          initial={child}
          onCancel={() => setEditingId(null)}
          onSubmit={async (input) => {
            await onSave?.(child.id, {
              title: input.title,
              description: input.description,
              dueDate: input.dueDate,
              kind: input.kind,
            });
          }}
          submitLabel={captionMode ? 'Save evidence' : 'Save step'}
        />
      </View>
    );
  }

  /** Counting sub-step under a counter achievement: checkbox advances the tally. */
  function renderCountingSub(child: GoalMilestone) {
    if (editingId === child.id) return renderChildEditor(child, false);
    const completed = child.completedAt !== null;
    const completing = completingIds.has(child.id);
    const deleting = deletingId === child.id;
    return (
      <View
        key={child.id}
        style={{
          alignItems: 'center',
          borderTopColor: colors.border.divider,
          borderTopWidth: 1,
          flexDirection: 'row',
          gap: 12,
          paddingVertical: 10,
        }}
      >
        <CompletionDot
          busy={completing}
          completed={completed}
          disabled={completed || readOnly || !onComplete || completing}
          label={completed ? `${child.title}, done` : `Mark ${child.title} done`}
          onPress={() => void onComplete?.(child.id)}
          size={20}
        />
        {child.photoUrl ? (
          <View style={{ borderRadius: 8, height: 34, overflow: 'hidden', width: 34 }}>
            <MilestonePhoto height={34} resolve={resolvePhotoUrl} storagePath={child.photoUrl} />
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* No strike-through — a completed step is evidence, not a crossed-off todo. */}
          <Text
            numberOfLines={2}
            style={{
              color: completed ? colors.text.secondary : colors.text.primary,
              fontFamily: 'Inter-Medium',
              fontSize: 13.5,
              lineHeight: 18,
            }}
          >
            {child.title}
          </Text>
          {child.description ? (
            <Text
              numberOfLines={2}
              style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 1 }}
            >
              {child.description}
            </Text>
          ) : null}
          {deleting ? renderDeleteConfirm(child) : null}
        </View>
        {renderChildActions(child)}
      </View>
    );
  }

  /**
   * Evidence child under a single (non-counter) achievement: a checkmark-free
   * "how I did it" record — photo + caption only, no completion state.
   */
  function renderEvidenceChild(child: GoalMilestone) {
    if (editingId === child.id) return renderChildEditor(child, true);
    const deleting = deletingId === child.id;
    return (
      <View
        key={child.id}
        style={{
          borderTopColor: colors.border.divider,
          borderTopWidth: 1,
          paddingVertical: 10,
        }}
      >
        {child.photoUrl ? (
          <MilestonePhoto height={compact ? 120 : 150} resolve={resolvePhotoUrl} storagePath={child.photoUrl} />
        ) : null}
        <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{ color: colors.text.primary, fontFamily: 'Inter-Medium', fontSize: 13.5, lineHeight: 19 }}
            >
              {child.title}
            </Text>
            {child.description ? (
              <Text
                style={{ color: colors.text.secondary, fontFamily: 'Inter-Regular', fontSize: 12.5, lineHeight: 18, marginTop: 2 }}
              >
                {child.description}
              </Text>
            ) : null}
            {deleting ? renderDeleteConfirm(child) : null}
          </View>
          {renderChildActions(child)}
        </View>
      </View>
    );
  }

  /** Prominent (at/past target) or subtle (early) "Mark accomplished" seal. */
  function renderSealButton(milestone: GoalMilestone, reachedTarget: boolean) {
    const sealing = completingIds.has(milestone.id);
    const label = reachedTarget ? 'Mark accomplished' : 'Mark accomplished early';
    return (
      <Pressable
        accessibilityLabel={`Mark ${milestone.title} accomplished`}
        accessibilityRole="button"
        disabled={sealing || !onComplete}
        onPress={() => void onComplete?.(milestone.id)}
        style={({ pressed }) => ({
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: reachedTarget ? colors.accent.primary : 'transparent',
          borderColor: reachedTarget ? colors.accent.primary : colors.border.divider,
          borderRadius: 9,
          borderStyle: reachedTarget ? 'solid' : 'dashed',
          borderWidth: 1,
          flexDirection: 'row',
          gap: 6,
          marginTop: 12,
          opacity: sealing ? 0.6 : pressed ? 0.82 : 1,
          paddingHorizontal: 14,
          paddingVertical: 8,
        })}
      >
        {sealing ? (
          <ActivityIndicator color={reachedTarget ? colors.text.inverse : colors.accent.primary} size="small" />
        ) : (
          <Text
            style={{
              color: reachedTarget ? colors.text.inverse : colors.text.secondary,
              fontFamily: reachedTarget ? 'Inter-SemiBold' : 'Inter-Medium',
              fontSize: 13,
            }}
          >
            ✓ {label}
          </Text>
        )}
      </Pressable>
    );
  }

  function renderAchievementCard(milestone: GoalMilestone) {
    const completed = milestone.completedAt !== null;
    const upNext = milestone.id === upNextId;
    const completing = completingIds.has(milestone.id);
    const deleting = deletingId === milestone.id;
    const kids = childrenByParent.get(milestone.id) ?? [];
    const isCounter = milestone.targetCount != null;
    const target = milestone.targetCount ?? 0;
    const doneKids = kids.filter((child) => child.completedAt !== null).length;
    // Denominator is the TARGET, not the child count — one sub of a target-3
    // achievement reads "1 of 3", and completing more than the target is allowed.
    const progressText = isCounter ? `${doneKids} of ${target}` : null;
    const reachedTarget = isCounter && doneKids >= target;
    // Counter achievements never auto-check: the top dot only appears once the
    // user has explicitly sealed it, so a filled counter can't masquerade as done.
    const showTopDot = !isCounter || completed;
    const dateText = completed
      ? `Reached · ${formatDate(milestone.completedAt!)}`
      : milestone.dueDate
        ? `${upNext ? 'Target' : 'Due'} · ${formatDate(milestone.dueDate)}`
        : 'No target date';

    return (
      <View
        key={milestone.id}
        style={{
          backgroundColor: colors.background.card,
          borderColor: upNext ? colors.accent.primary : colors.border.divider,
          borderRadius: 16,
          borderWidth: upNext ? 1.5 : 1,
          padding: compact ? 16 : 20,
        }}
      >
        {milestone.photoUrl ? (
          <MilestonePhoto height={compact ? 160 : 200} resolve={resolvePhotoUrl} storagePath={milestone.photoUrl} />
        ) : null}

        <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 14 }}>
          {showTopDot ? (
            <CompletionDot
              busy={completing}
              completed={completed}
              disabled={completed || readOnly || !onComplete || completing}
              label={completed ? `${milestone.title}, reached` : `Mark ${milestone.title} reached`}
              onPress={() => void onComplete?.(milestone.id)}
              size={24}
            />
          ) : null}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Text
                style={{
                  color: colors.text.primary,
                  flexShrink: 1,
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 15.5,
                  lineHeight: 21,
                }}
              >
                {milestone.title}
              </Text>
              {upNext ? renderBadge('Up next', colors.accent.primary, colors.text.inverse) : null}
              {progressText ? renderBadge(progressText, colors.accent.tealSubtle, colors.text.accent) : null}
              {milestone.isAiSuggested ? renderBadge('✦ AI', colors.accent.tealSubtle, colors.text.accent) : null}
            </View>
            <Text
              style={{
                color: colors.text.secondary,
                fontFamily: 'Inter-Regular',
                fontSize: 13,
                lineHeight: 19,
                marginTop: 3,
              }}
            >
              {dateText}
            </Text>
            {milestone.description ? (
              <Text
                style={{
                  color: colors.text.secondary,
                  fontFamily: 'Inter-Regular',
                  fontSize: 13.5,
                  lineHeight: 20,
                  marginTop: 6,
                }}
              >
                {milestone.description}
              </Text>
            ) : null}
          </View>
          {!readOnly && !deleting ? renderRowActions(milestone, completed) : null}
        </View>

        {deleting ? renderDeleteConfirm(milestone) : null}

        {/* Prompt to seal: surfaced whenever the achievement is countable and not
            yet sealed — prominent at/past target, subtle for an early seal. */}
        {isCounter && !completed && !readOnly ? renderSealButton(milestone, reachedTarget) : null}

        {kids.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            {kids.map((child) => (isCounter ? renderCountingSub(child) : renderEvidenceChild(child)))}
          </View>
        ) : null}

        {!readOnly ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {onAdd && addingChildFor !== milestone.id ? (
              <Pressable
                accessibilityLabel={
                  isCounter ? `Add a step to ${milestone.title}` : `Add evidence to ${milestone.title}`
                }
                accessibilityRole="button"
                onPress={() => {
                  setEditingId(null);
                  setDeletingId(null);
                  setAddingChildFor(milestone.id);
                }}
                style={{
                  borderColor: colors.border.divider,
                  borderRadius: 9,
                  borderStyle: 'dashed',
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 12.5 }}>
                  {isCounter ? '＋ Add step' : '＋ Add evidence'}
                </Text>
              </Pressable>
            ) : null}
            {onAttachPhoto ? (
              <Pressable
                accessibilityLabel={`${milestone.photoUrl ? 'Replace' : 'Add'} photo for ${milestone.title}`}
                accessibilityRole="button"
                disabled={photoBusyId === milestone.id}
                onPress={() => void handleAttachPhoto(milestone.id)}
                style={{
                  alignItems: 'center',
                  borderColor: colors.border.divider,
                  borderRadius: 9,
                  borderStyle: 'dashed',
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                {photoBusyId === milestone.id ? (
                  <ActivityIndicator color={colors.accent.primary} size="small" />
                ) : (
                  <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 12.5 }}>
                    📷 {milestone.photoUrl ? 'Replace photo' : 'Add photo'}
                  </Text>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {addingChildFor === milestone.id ? (
          <View style={{ marginTop: 10 }}>
            <MilestoneEditor
              captionMode={!isCounter}
              onCancel={() => setAddingChildFor(null)}
              onSubmit={async (input) => {
                await onAdd?.(input);
              }}
              parentId={milestone.id}
              submitLabel={isCounter ? 'Add step' : 'Add evidence'}
            />
          </View>
        ) : null}
      </View>
    );
  }

  function renderBadge(label: string, bg: string, textColor: string) {
    return (
      <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
        <Text
          style={{
            color: textColor,
            fontFamily: 'Inter-SemiBold',
            fontSize: 12,
            letterSpacing: 0.3,
            lineHeight: 16,
          }}
        >
          {label}
        </Text>
      </View>
    );
  }

  function renderTopLevelAchievement(milestone: GoalMilestone) {
    if (editingId === milestone.id) {
      return (
        <View key={milestone.id}>
          <MilestoneEditor
            density={deadlineDensity}
            initial={milestone}
            onCancel={() => setEditingId(null)}
            onSubmit={async (input) => {
              await onSave?.(milestone.id, {
                title: input.title,
                description: input.description,
                dueDate: input.dueDate,
                kind: input.kind,
                targetCount: input.targetCount,
              });
            }}
            showTargetCount
            submitLabel="Save milestone"
          />
        </View>
      );
    }
    return <View key={milestone.id}>{renderAchievementCard(milestone)}</View>;
  }

  return (
    <View
      accessibilityLabel={`Milestones. ${completedCount} of ${achievements.length} reached.`}
      style={{
        backgroundColor: embedded ? 'transparent' : colors.background.card,
        borderColor: colors.border.warm,
        borderRadius: embedded ? 0 : 20,
        borderWidth: embedded ? 0 : 1,
        elevation: embedded ? 0 : 1,
        paddingHorizontal: embedded ? 0 : compact ? 18 : 26,
        paddingVertical: embedded ? 0 : 24,
        shadowColor: colors.background.sidebar,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: embedded ? 0 : 0.05,
        shadowRadius: embedded ? 0 : 22,
      }}
    >
      <View
        style={{
          alignItems: compact ? 'flex-start' : 'center',
          flexDirection: compact ? 'column' : 'row',
          gap: 8,
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <View style={{ flexShrink: 1 }}>
          <Text
            style={{
              color: colors.text.secondary,
              ...TYPE.overline,
              fontFamily: FONT.ui.semibold,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            Milestones
          </Text>
          <Text style={{ color: colors.text.primary, ...TYPE.sectionTitle, marginTop: 3 }}>
            {subtitle}
          </Text>
        </View>
        <Text style={{ color: colors.text.accent, ...TYPE.caption, fontFamily: FONT.ui.medium }}>
          {completedCount} of {achievements.length} reached
        </Text>
      </View>

      {error ? (
        <View
          accessibilityRole="alert"
          style={{
            alignItems: 'center',
            backgroundColor: colors.feedback.danger.bg,
            borderColor: colors.feedback.danger.border,
            borderRadius: 10,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 10,
            justifyContent: 'space-between',
            marginBottom: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: colors.feedback.danger.text, flex: 1, ...TYPE.caption }}>{error}</Text>
          {onDismissError ? (
            <Pressable
              accessibilityLabel="Dismiss milestone error"
              accessibilityRole="button"
              onPress={onDismissError}
              style={{ paddingHorizontal: 4, paddingVertical: 3 }}
            >
              <Text
                style={{ color: colors.feedback.danger.text, ...TYPE.bodySmall, fontFamily: FONT.ui.medium }}
              >
                Dismiss
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Milestones are one-time achievement story cards — the Prep checklist
          zone was retired (Goal Detail Redesign); enabling work lives in Tasks. */}
      {achievements.length > 0 ? (
        <View style={{ gap: 12 }}>
          {achievements.map((milestone) => renderTopLevelAchievement(milestone))}
        </View>
      ) : !showAddForm ? (
        <View style={{ paddingHorizontal: 2, paddingVertical: 6 }}>
          <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21 }}>
            Milestones capture proof of progress — a photo and a story for each real accomplishment
            along the way.
          </Text>
        </View>
      ) : null}

      {showAddForm && !readOnly ? (
        <View style={{ marginTop: achievements.length > 0 ? 12 : 4 }}>
          <MilestoneEditor
            density={deadlineDensity}
            onCancel={() => setShowAddForm(false)}
            onSubmit={async (input) => {
              await onAdd?.(input);
            }}
            showTargetCount
            submitLabel="Add milestone"
          />
        </View>
      ) : !readOnly && onAdd ? (
        <Pressable
          accessibilityLabel="Add a milestone"
          accessibilityRole="button"
          onPress={() => {
            setDeletingId(null);
            setEditingId(null);
            setAddingChildFor(null);
            setShowAddForm(true);
          }}
          style={({ pressed }) => ({
            alignItems: 'center',
            alignSelf: 'flex-start',
            borderColor: colors.border.divider,
            borderRadius: 10,
            borderStyle: 'dashed',
            borderWidth: 1,
            flexDirection: 'row',
            marginTop: 12,
            opacity: pressed ? 0.72 : 1,
            paddingHorizontal: 14,
            paddingVertical: 9,
          })}
        >
          <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 13 }}>
            ＋ Add milestone
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
