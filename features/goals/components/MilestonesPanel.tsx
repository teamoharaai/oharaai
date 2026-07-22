import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useThemeColors } from '@/store/uiStore';
import type {
  GoalMilestone,
  GoalMilestoneInput,
  GoalMilestoneUpdates,
} from '../types';

type EditableMilestoneUpdates = Omit<GoalMilestoneUpdates, 'completedAt'>;

export interface MilestonesPanelProps {
  milestones: readonly GoalMilestone[];
  hasSuccessor: boolean;
  ended: boolean;
  archived?: boolean;
  subtitle?: string;
  completingIds?: ReadonlySet<string>;
  onAdd?: (input: GoalMilestoneInput) => Promise<void>;
  onSave?: (milestoneId: string, updates: EditableMilestoneUpdates) => Promise<void>;
  onDelete?: (milestoneId: string) => Promise<void>;
  onComplete?: (milestoneId: string) => Promise<void>;
  error?: string | null;
  onDismissError?: () => void;
}

interface MilestoneEditorProps {
  initial?: GoalMilestone;
  submitLabel: string;
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
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  const [year, month, day] = trimmed.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined;
  }
  return parsed;
}

function MilestoneEditor({ initial, submitLabel, onCancel, onSubmit }: MilestoneEditorProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 480;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dueDate, setDueDate] = useState(toDateInput(initial?.dueDate));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('A milestone name is required.');
      return;
    }
    const parsedDueDate = parseDateInput(dueDate);
    if (parsedDueDate === undefined) {
      setValidationError('Use YYYY-MM-DD for the target date.');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: trimmedTitle,
        description: description.trim() || null,
        dueDate: parsedDueDate,
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
    fontFamily: 'Inter-Regular' as const,
    fontSize: 13,
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
        accessibilityLabel="Milestone name"
        autoFocus
        onChangeText={setTitle}
        placeholder="Milestone name"
        placeholderTextColor={colors.text.muted}
        returnKeyType="next"
        style={inputStyle}
        value={title}
      />
      <TextInput
        accessibilityLabel="Milestone description"
        multiline
        onChangeText={setDescription}
        placeholder="Why is this event critical? (optional)"
        placeholderTextColor={colors.text.muted}
        style={[inputStyle, { minHeight: 64, textAlignVertical: 'top' }]}
        value={description}
      />
      <TextInput
        accessibilityHint="Enter a date in year-month-day format"
        accessibilityLabel="Milestone target date"
        inputMode="numeric"
        onChangeText={setDueDate}
        onSubmitEditing={() => void handleSubmit()}
        placeholder="Target date · YYYY-MM-DD"
        placeholderTextColor={colors.text.muted}
        returnKeyType="done"
        style={inputStyle}
        value={dueDate}
      />
      {validationError ? (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.feedback.danger.text, fontFamily: 'Inter-Regular', fontSize: 12 }}
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

export function MilestonesPanel({
  milestones,
  hasSuccessor,
  ended,
  archived = false,
  subtitle = 'The critical moments along the way',
  completingIds = new Set<string>(),
  onAdd,
  onSave,
  onDelete,
  onComplete,
  error,
  onDismissError,
}: MilestonesPanelProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const sortedMilestones = [...milestones].sort((left, right) => left.sortOrder - right.sortOrder);
  const completedCount = sortedMilestones.filter((item) => item.completedAt !== null).length;
  const upNextId = sortedMilestones.find((item) => item.completedAt === null)?.id ?? null;
  const readOnly = hasSuccessor || ended || archived;

  async function handleDelete(milestoneId: string) {
    setDeletingId(null);
    await onDelete?.(milestoneId);
  }

  return (
    <View
      accessibilityLabel={`Milestones. ${completedCount} of ${sortedMilestones.length} reached.`}
      style={{
        backgroundColor: colors.background.card,
        borderColor: colors.border.warm,
        borderRadius: 20,
        borderWidth: 1,
        elevation: 1,
        paddingHorizontal: compact ? 18 : 26,
        paddingVertical: 24,
        shadowColor: colors.background.sidebar,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 22,
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
              fontFamily: 'Inter-SemiBold',
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            Milestones
          </Text>
          <Text
            style={{
              color: colors.text.primary,
              fontFamily: 'Inter-Regular',
              fontSize: 19,
              marginTop: 3,
            }}
          >
            {subtitle}
          </Text>
        </View>
        <Text
          style={{
            color: colors.text.accent,
            fontFamily: 'Inter-Medium',
            fontSize: 12.5,
          }}
        >
          {completedCount} of {sortedMilestones.length} reached
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
          <Text
            style={{
              color: colors.feedback.danger.text,
              flex: 1,
              fontFamily: 'Inter-Regular',
              fontSize: 12,
            }}
          >
            {error}
          </Text>
          {onDismissError ? (
            <Pressable
              accessibilityLabel="Dismiss milestone error"
              accessibilityRole="button"
              onPress={onDismissError}
              style={{ paddingHorizontal: 4, paddingVertical: 3 }}
            >
              <Text
                style={{
                  color: colors.feedback.danger.text,
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 12,
                }}
              >
                Dismiss
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {sortedMilestones.length > 0 ? (
        <View style={{ gap: 10 }}>
          {sortedMilestones.map((milestone) => {
            const completed = milestone.completedAt !== null;
            const upNext = milestone.id === upNextId;
            const completing = completingIds.has(milestone.id);
            const editing = editingId === milestone.id;
            const deleting = deletingId === milestone.id;
            const dateText = completed
              ? `Completed · ${formatDate(milestone.completedAt!)}`
              : milestone.dueDate
                ? `${upNext ? 'Target' : 'Due'} · ${formatDate(milestone.dueDate)}`
                : 'No target date';

            if (editing) {
              return (
                <View key={milestone.id} style={{ marginBottom: 12 }}>
                  <MilestoneEditor
                    initial={milestone}
                    onCancel={() => setEditingId(null)}
                    onSubmit={async (input) => {
                      await onSave?.(milestone.id, {
                        title: input.title,
                        description: input.description,
                        dueDate: input.dueDate,
                      });
                    }}
                    submitLabel="Save milestone"
                  />
                </View>
              );
            }

            return (
              <View
                key={milestone.id}
                style={{
                  alignItems: 'center',
                  backgroundColor: colors.background.card,
                  borderColor: colors.border.divider,
                  borderRadius: 14,
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: 14,
                  paddingHorizontal: compact ? 16 : 20,
                  paddingVertical: 16,
                }}
              >
                <Pressable
                  accessibilityHint={completed ? undefined : 'Marks this milestone reached permanently'}
                  accessibilityLabel={completed ? `${milestone.title}, reached` : `Mark ${milestone.title} reached`}
                  accessibilityRole={completed ? 'text' : 'button'}
                  accessibilityState={{ disabled: completed || readOnly || !onComplete || completing }}
                  disabled={completed || readOnly || !onComplete || completing}
                  onPress={() => void onComplete?.(milestone.id)}
                  style={{
                    alignItems: 'center',
                    backgroundColor: completed ? colors.accent.primary : colors.background.card,
                    borderColor: completed ? colors.accent.primary : colors.text.muted,
                    borderRadius: 11,
                    borderWidth: completed ? 0 : 2,
                    height: 22,
                    justifyContent: 'center',
                    width: 22,
                  }}
                >
                  {completing ? (
                    <ActivityIndicator color={colors.accent.primary} size="small" />
                  ) : completed ? (
                    <Text
                      style={{
                        color: colors.text.inverse,
                        fontFamily: 'Inter-Bold',
                        fontSize: 12,
                      }}
                    >
                      ✓
                    </Text>
                  ) : null}
                </Pressable>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <Text
                      style={{
                        color: colors.text.primary,
                        flexShrink: 1,
                        fontFamily: 'Inter-SemiBold',
                        fontSize: 14.5,
                        lineHeight: 20,
                      }}
                    >
                      {milestone.title}
                    </Text>
                    {upNext ? (
                      <View
                        style={{
                          backgroundColor: colors.accent.primary,
                          borderRadius: 6,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.text.inverse,
                            fontFamily: 'Inter-SemiBold',
                            fontSize: 9.5,
                            letterSpacing: 0.5,
                            textTransform: 'uppercase',
                          }}
                        >
                          Up next
                        </Text>
                      </View>
                    ) : null}
                    {milestone.isAiSuggested ? (
                      <View
                        style={{
                          backgroundColor: colors.accent.tealSubtle,
                          borderRadius: 6,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.text.accent,
                            fontFamily: 'Inter-SemiBold',
                            fontSize: 9.5,
                          }}
                        >
                          ✦ AI
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={{
                      color: colors.text.secondary,
                      fontFamily: 'Inter-Regular',
                      fontSize: 12,
                      lineHeight: 18,
                      marginTop: 2,
                    }}
                  >
                    {dateText}
                    {milestone.description ? ` — ${milestone.description}` : ''}
                  </Text>

                  {deleting ? (
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
                      <Text
                        style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 12 }}
                      >
                        Delete this milestone?
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          accessibilityLabel="Cancel deleting milestone"
                          accessibilityRole="button"
                          onPress={() => setDeletingId(null)}
                          style={{ paddingHorizontal: 10, paddingVertical: 6 }}
                        >
                          <Text
                            style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 12 }}
                          >
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
                          <Text
                            style={{
                              color: colors.feedback.danger.text,
                              fontFamily: 'Inter-SemiBold',
                              fontSize: 12,
                            }}
                          >
                            Delete
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>

                {!readOnly && !deleting ? (
                  <View style={{ flexDirection: compact ? 'column' : 'row', gap: 2 }}>
                    {onSave && !completed ? (
                      <Pressable
                        accessibilityLabel={`Edit ${milestone.title}`}
                        accessibilityRole="button"
                        onPress={() => {
                          setDeletingId(null);
                          setEditingId(milestone.id);
                        }}
                        style={{ alignItems: 'center', height: 30, justifyContent: 'center', width: 30 }}
                      >
                        <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 14 }}>✎</Text>
                      </Pressable>
                    ) : null}
                    {onDelete ? (
                      <Pressable
                        accessibilityLabel={`Delete ${milestone.title}`}
                        accessibilityRole="button"
                        onPress={() => {
                          setEditingId(null);
                          setDeletingId(milestone.id);
                        }}
                        style={{ alignItems: 'center', height: 30, justifyContent: 'center', width: 30 }}
                      >
                        <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 14 }}>⌫</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : !showAddForm ? (
        <View style={{ paddingHorizontal: 2, paddingVertical: 10 }}>
          <Text
            style={{
              color: colors.text.secondary,
              fontFamily: 'Inter-Medium',
              fontSize: 14,
              marginBottom: 3,
            }}
          >
            No critical events mapped yet.
          </Text>
          <Text
            style={{
              color: colors.text.muted,
              fontFamily: 'Inter-Regular',
              fontSize: 12.5,
              lineHeight: 19,
            }}
          >
            Add the one-time moments that provide meaningful evidence of goal progress.
          </Text>
        </View>
      ) : null}

      {showAddForm && !readOnly ? (
        <View style={{ marginTop: sortedMilestones.length > 0 ? 12 : 4 }}>
          <MilestoneEditor
            onCancel={() => setShowAddForm(false)}
            onSubmit={async (input) => {
              await onAdd?.(input);
            }}
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
            marginTop: 10,
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
