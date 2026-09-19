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
import { OverflowMenu, type OverflowAction } from '@/components/ui/OverflowMenu';
import { useThemeColors } from '@/store/uiStore';
import { FONT, TYPE } from '@/constants/design';
import type { GoalNote, GoalNoteInput, GoalNoteUpdates } from '../types';

export interface StickyNotesPanelProps {
  notes: readonly GoalNote[];
  /** True when the goal has a successor / is ended / archived — hides authoring. */
  readOnly?: boolean;
  /** Rendered inside a tab shell; drops the card chrome. */
  embedded?: boolean;
  onAdd?: (input: GoalNoteInput) => Promise<void>;
  onSave?: (noteId: string, updates: GoalNoteUpdates) => Promise<void>;
  onDelete?: (noteId: string) => Promise<void>;
  onAttachPhoto?: (noteId: string) => Promise<void>;
  resolvePhotoUrl?: (storagePath: string) => Promise<string>;
  error?: string | null;
  onDismissError?: () => void;
}

interface NoteEditorProps {
  initial?: GoalNote;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (input: GoalNoteInput) => Promise<void>;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

/** Resolves a stored photo path to a signed URL and renders it. */
function NotePhoto({
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
      accessibilityLabel="Sticky note photo"
      resizeMode="cover"
      source={{ uri: url }}
      style={{ borderRadius: 12, height, marginBottom: 12, width: '100%' }}
    />
  );
}

function NoteEditor({ initial, submitLabel, onCancel, onSubmit }: NoteEditorProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 480;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('A title is required.');
      return;
    }
    setValidationError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ title: trimmedTitle, body: body.trim() || null });
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
        accessibilityLabel="Note title"
        autoFocus
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={colors.text.muted}
        returnKeyType="next"
        style={inputStyle}
        value={title}
      />
      <TextInput
        accessibilityLabel="Note body"
        multiline
        onChangeText={setBody}
        placeholder="Write a note (optional)"
        placeholderTextColor={colors.text.muted}
        style={[inputStyle, { minHeight: 84, textAlignVertical: 'top' }]}
        value={body}
      />
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
          accessibilityLabel="Cancel note changes"
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

export function StickyNotesPanel({
  notes,
  readOnly = false,
  embedded = false,
  onAdd,
  onSave,
  onDelete,
  onAttachPhoto,
  resolvePhotoUrl,
  error,
  onDismissError,
}: StickyNotesPanelProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [photoBusyId, setPhotoBusyId] = useState<string | null>(null);

  // Newest-first; the store keeps notes sorted, but sort defensively so a prop
  // that arrives unsorted still renders in a stable order.
  const sorted = [...notes].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  async function handleDelete(noteId: string) {
    setDeletingId(null);
    await onDelete?.(noteId);
  }

  async function handleAttachPhoto(noteId: string) {
    if (!onAttachPhoto) return;
    setPhotoBusyId(noteId);
    try {
      await onAttachPhoto(noteId);
    } finally {
      setPhotoBusyId(null);
    }
  }

  function renderRowActions(note: GoalNote) {
    const actions: OverflowAction[] = [];
    if (onSave) {
      actions.push({
        key: 'edit',
        label: 'Edit',
        onPress: () => {
          setDeletingId(null);
          setEditingId(note.id);
        },
      });
    }
    if (onAttachPhoto) {
      actions.push({
        key: 'photo',
        label: note.photoUrl ? 'Replace photo' : 'Add photo',
        busy: photoBusyId === note.id,
        onPress: () => void handleAttachPhoto(note.id),
      });
    }
    if (onDelete) {
      actions.push({
        key: 'delete',
        label: 'Delete',
        destructive: true,
        onPress: () => {
          setEditingId(null);
          setDeletingId(note.id);
        },
      });
    }
    return <OverflowMenu accessibilityLabel={`Actions for ${note.title}`} actions={actions} />;
  }

  function renderDeleteConfirm(note: GoalNote) {
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
          Delete this note?
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            accessibilityLabel="Cancel deleting note"
            accessibilityRole="button"
            onPress={() => setDeletingId(null)}
            style={{ paddingHorizontal: 10, paddingVertical: 6 }}
          >
            <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 14 }}>
              Cancel
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Delete ${note.title}`}
            accessibilityRole="button"
            onPress={() => void handleDelete(note.id)}
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

  function renderNoteCard(note: GoalNote) {
    if (editingId === note.id) {
      return (
        <View key={note.id}>
          <NoteEditor
            initial={note}
            onCancel={() => setEditingId(null)}
            onSubmit={async (input) => {
              await onSave?.(note.id, { title: input.title, body: input.body });
            }}
            submitLabel="Save note"
          />
        </View>
      );
    }

    const deleting = deletingId === note.id;
    return (
      <View
        key={note.id}
        style={{
          backgroundColor: colors.background.card,
          borderColor: colors.border.divider,
          borderRadius: 16,
          borderWidth: 1,
          padding: compact ? 16 : 20,
        }}
      >
        {note.photoUrl ? (
          <NotePhoto height={compact ? 160 : 200} resolve={resolvePhotoUrl} storagePath={note.photoUrl} />
        ) : null}

        <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 14 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                color: colors.text.primary,
                fontFamily: 'Inter-SemiBold',
                fontSize: 15.5,
                lineHeight: 21,
              }}
            >
              {note.title}
            </Text>
            <Text
              style={{
                color: colors.text.secondary,
                fontFamily: 'Inter-Regular',
                fontSize: 13,
                lineHeight: 19,
                marginTop: 3,
              }}
            >
              {formatDate(note.createdAt)}
            </Text>
            {note.body ? (
              <Text
                style={{
                  color: colors.text.secondary,
                  fontFamily: 'Inter-Regular',
                  fontSize: 13.5,
                  lineHeight: 20,
                  marginTop: 6,
                }}
              >
                {note.body}
              </Text>
            ) : null}
          </View>
          {!readOnly && !deleting ? renderRowActions(note) : null}
        </View>

        {deleting ? renderDeleteConfirm(note) : null}
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={`Sticky notes. ${sorted.length} ${sorted.length === 1 ? 'note' : 'notes'}.`}
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
      {!embedded ? (
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              color: colors.text.secondary,
              ...TYPE.overline,
              fontFamily: FONT.ui.semibold,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            Notes
          </Text>
          <Text style={{ color: colors.text.primary, ...TYPE.sectionTitle, marginTop: 3 }}>
            Quick notes for this goal
          </Text>
        </View>
      ) : null}

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
              accessibilityLabel="Dismiss note error"
              accessibilityRole="button"
              onPress={onDismissError}
              style={{ paddingHorizontal: 4, paddingVertical: 3 }}
            >
              <Text style={{ color: colors.feedback.danger.text, ...TYPE.bodySmall, fontFamily: FONT.ui.medium }}>
                Dismiss
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {sorted.length > 0 ? (
        <View style={{ gap: 12 }}>{sorted.map((note) => renderNoteCard(note))}</View>
      ) : !showAddForm ? (
        <View style={{ paddingHorizontal: 2, paddingVertical: 6 }}>
          <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21 }}>
            Sticky notes are quick, freeform reminders for this goal — a title, a note, and an optional photo.
          </Text>
        </View>
      ) : null}

      {showAddForm && !readOnly ? (
        <View style={{ marginTop: sorted.length > 0 ? 12 : 4 }}>
          <NoteEditor
            onCancel={() => setShowAddForm(false)}
            onSubmit={async (input) => {
              await onAdd?.(input);
            }}
            submitLabel="Create"
          />
        </View>
      ) : !readOnly && onAdd ? (
        <Pressable
          accessibilityLabel="Add a sticky note"
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
            marginTop: 12,
            opacity: pressed ? 0.72 : 1,
            paddingHorizontal: 14,
            paddingVertical: 9,
          })}
        >
          <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 13 }}>
            ＋ Add Sticky Note
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
