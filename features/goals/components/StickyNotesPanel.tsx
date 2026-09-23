import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { OverflowMenu, type OverflowAction } from '@/components/ui/OverflowMenu';
import { Modal } from '@/components/ui/Modal';
import { useThemeColors } from '@/store/uiStore';
import { FONT, TYPE } from '@/constants/design';
import type { GoalNote, GoalNoteFolder, GoalNoteInput, GoalNoteUpdates } from '../types';
import {
  countNotesForSelection,
  filterNotesBySelection,
  reorderFolderIds,
  searchNotes,
  type FolderSelection,
} from '../sticky-notes-folders';

export interface StickyNotesPanelProps {
  notes: readonly GoalNote[];
  /** Per-goal folders (excludes the virtual General bucket). */
  folders?: readonly GoalNoteFolder[];
  /** True when the goal has a successor / is ended / archived — hides authoring. */
  readOnly?: boolean;
  /** Rendered inside a tab shell; drops the card chrome. */
  embedded?: boolean;
  /** Opens the canonical composer when requested by the parent Vault menu. */
  creationRequestKey?: number;
  onAdd?: (input: GoalNoteInput) => Promise<void>;
  onSave?: (noteId: string, updates: GoalNoteUpdates) => Promise<void>;
  onDelete?: (noteId: string) => Promise<void>;
  onAttachPhoto?: (noteId: string) => Promise<void>;
  resolvePhotoUrl?: (storagePath: string) => Promise<string>;
  onAddFolder?: (name: string) => Promise<GoalNoteFolder | null>;
  onRenameFolder?: (folderId: string, name: string) => Promise<void>;
  onDeleteFolder?: (folderId: string) => Promise<void>;
  onReorderFolders?: (folderIds: readonly string[]) => Promise<void>;
  onMoveNotes?: (noteIds: readonly string[], folderId: string | null) => Promise<void>;
  error?: string | null;
  onDismissError?: () => void;
  folderError?: string | null;
  onDismissFolderError?: () => void;
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
  folders = [],
  readOnly = false,
  embedded = false,
  creationRequestKey = 0,
  onAdd,
  onSave,
  onDelete,
  onAttachPhoto,
  resolvePhotoUrl,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onReorderFolders,
  onMoveNotes,
  error,
  onDismissError,
  folderError,
  onDismissFolderError,
}: StickyNotesPanelProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [photoBusyId, setPhotoBusyId] = useState<string | null>(null);

  // Folder bar state.
  const [selection, setSelection] = useState<FolderSelection>('all');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  // Selection (bulk-move) mode.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Folder picker target: note ids to move, or null when the picker is closed.
  const [movePickerNoteIds, setMovePickerNoteIds] = useState<readonly string[] | null>(null);
  // Free-text search over the visible notes (title + body).
  const [noteQuery, setNoteQuery] = useState('');

  const canManageFolders = !readOnly && Boolean(onAddFolder);
  const canMove = !readOnly && Boolean(onMoveNotes) && folders.length > 0;
  const canReorder = !readOnly && Boolean(onReorderFolders);

  useEffect(() => {
    if (creationRequestKey > 0 && !readOnly) setShowAddForm(true);
  }, [creationRequestKey, readOnly]);

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [folders],
  );

  // If the selected folder disappears (deleted elsewhere), fall back to All.
  useEffect(() => {
    if (selection === 'all' || selection === 'general') return;
    if (!sortedFolders.some((folder) => folder.id === selection)) setSelection('all');
  }, [selection, sortedFolders]);

  // Newest-first; the store keeps notes sorted, but sort defensively so a prop
  // that arrives unsorted still renders in a stable order.
  const sorted = [...notes].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  // The active folder view, then the search narrowing on top of it.
  const filtered = filterNotesBySelection(sorted, selection);
  const visibleNotes = searchNotes(filtered, noteQuery);
  const searching = noteQuery.trim().length > 0;
  // Notes created while a real folder is active land in that folder; All/General → General.
  const activeFolderId = selection === 'all' || selection === 'general' ? null : selection;
  const activeFolderName = sortedFolders.find((folder) => folder.id === selection)?.name ?? null;

  function noteCountFor(target: FolderSelection): number {
    return countNotesForSelection(notes, target);
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name || !onAddFolder) return;
    setCreatingFolder(true);
    try {
      const created = await onAddFolder(name);
      if (created) {
        setNewFolderName('');
        setShowNewFolder(false);
        setSelection(created.id);
      }
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleRenameFolder(folderId: string) {
    const name = renameName.trim();
    setRenamingFolderId(null);
    if (name && onRenameFolder) await onRenameFolder(folderId, name);
  }

  async function handleDeleteFolder(folderId: string) {
    setDeletingFolderId(null);
    if (selection === folderId) setSelection('all');
    await onDeleteFolder?.(folderId);
  }

  function toggleSelected(noteId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  async function handleMove(noteIds: readonly string[], folderId: string | null) {
    setMovePickerNoteIds(null);
    if (!onMoveNotes || noteIds.length === 0) return;
    await onMoveNotes(noteIds, folderId);
    if (selectionMode) exitSelectionMode();
  }

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
    if (canMove) {
      actions.push({
        key: 'move',
        label: 'Move to…',
        onPress: () => setMovePickerNoteIds([note.id]),
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
    const selected = selectedIds.has(note.id);
    const CardWrapper = selectionMode ? Pressable : View;
    return (
      <CardWrapper
        key={note.id}
        {...(selectionMode
          ? {
              accessibilityRole: 'checkbox' as const,
              accessibilityState: { checked: selected },
              accessibilityLabel: `${selected ? 'Deselect' : 'Select'} ${note.title}`,
              onPress: () => toggleSelected(note.id),
            }
          : {})}
        style={{
          backgroundColor: embedded ? colors.background.selectedRow : colors.background.card,
          borderColor: selectionMode && selected ? colors.accent.primary : embedded ? colors.border.accent : colors.border.divider,
          borderRadius: 16,
          borderWidth: selectionMode && selected ? 2 : 1,
          padding: compact ? 16 : 20,
          ...(embedded && !compact ? { flexBasis: 280, flexGrow: 1, minWidth: 250 } : {}),
        }}
      >
        {note.photoUrl ? (
          <NotePhoto height={compact ? 160 : 200} resolve={resolvePhotoUrl} storagePath={note.photoUrl} />
        ) : null}

        <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 14 }}>
          {selectionMode ? (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: selected ? colors.accent.primary : colors.border.input,
                backgroundColor: selected ? colors.accent.primary : 'transparent',
                borderRadius: 6,
                borderWidth: 2,
                height: 22,
                marginTop: 1,
                width: 22,
              }}
            >
              {selected ? (
                <Text style={{ color: colors.text.inverse, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>✓</Text>
              ) : null}
            </View>
          ) : null}
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
          {!readOnly && !deleting && !selectionMode ? renderRowActions(note) : null}
        </View>

        {selection === 'all' && note.folderId != null ? (
          <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 8 }}>
            📁 {sortedFolders.find((folder) => folder.id === note.folderId)?.name ?? 'Folder'}
          </Text>
        ) : null}

        {deleting ? renderDeleteConfirm(note) : null}
      </CardWrapper>
    );
  }

  function renderChip(key: string, label: string, count: number, active: boolean, onPress: () => void) {
    return (
      <Pressable
        key={key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${label}, ${count} ${count === 1 ? 'note' : 'notes'}`}
        onPress={onPress}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: active ? colors.background.selectedRow : colors.background.input,
          borderColor: active ? colors.accent.primary : colors.border.input,
          borderRadius: 999,
          borderWidth: 1,
          flexDirection: 'row',
          gap: 6,
          opacity: pressed ? 0.72 : 1,
          paddingHorizontal: 14,
          paddingVertical: 7,
        })}
      >
        <Text
          numberOfLines={1}
          style={{
            color: active ? colors.text.accent : colors.text.secondary,
            fontFamily: active ? 'Inter-SemiBold' : 'Inter-Medium',
            fontSize: 13,
            maxWidth: 160,
          }}
        >
          {label}
        </Text>
        <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 12 }}>{count}</Text>
      </Pressable>
    );
  }

  function renderFolderBar() {
    if (folders.length === 0 && !canManageFolders) return null;
    const folderIdOrder = sortedFolders.map((folder) => folder.id);
    const activeIndex =
      selection === 'all' || selection === 'general' ? -1 : folderIdOrder.indexOf(selection);

    // A single ⋯ menu hosts everything: folder rename/reorder/delete when a real
    // folder is active, plus the bulk-move "Select" entry (available in any view
    // with notes). It renders wherever it has at least one action.
    const menuActions: OverflowAction[] = [];
    if (activeFolderName && canManageFolders && renamingFolderId !== selection) {
      menuActions.push({
        key: 'rename',
        label: 'Rename folder',
        onPress: () => {
          setRenameName(activeFolderName);
          setRenamingFolderId(selection);
        },
      });
      if (canReorder && activeIndex > 0) {
        menuActions.push({
          key: 'move-left',
          label: 'Move left',
          onPress: () => void onReorderFolders?.(reorderFolderIds(folderIdOrder, selection, 'left')),
        });
      }
      if (canReorder && activeIndex >= 0 && activeIndex < folderIdOrder.length - 1) {
        menuActions.push({
          key: 'move-right',
          label: 'Move right',
          onPress: () => void onReorderFolders?.(reorderFolderIds(folderIdOrder, selection, 'right')),
        });
      }
      menuActions.push({
        key: 'delete',
        label: 'Delete folder',
        destructive: true,
        onPress: () => setDeletingFolderId(selection),
      });
    }
    if (canMove && filtered.length > 0 && !selectionMode) {
      menuActions.push({
        key: 'select',
        label: 'Select notes to move',
        onPress: () => setSelectionMode(true),
      });
    }
    return (
      <View style={{ gap: 10, marginBottom: 14 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', gap: 8, paddingRight: 4 }}
        >
          {renderChip('all', 'All', noteCountFor('all'), selection === 'all', () => setSelection('all'))}
          {renderChip('general', 'General', noteCountFor('general'), selection === 'general', () => setSelection('general'))}
          {sortedFolders.map((folder) =>
            renderChip(folder.id, folder.name, noteCountFor(folder.id), selection === folder.id, () => setSelection(folder.id)),
          )}
          {canManageFolders ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New folder"
              onPress={() => {
                setNewFolderName('');
                setShowNewFolder(true);
              }}
              style={({ pressed }) => ({
                alignItems: 'center',
                borderColor: colors.border.divider,
                borderRadius: 999,
                borderStyle: 'dashed',
                borderWidth: 1,
                flexDirection: 'row',
                opacity: pressed ? 0.72 : 1,
                paddingHorizontal: 14,
                paddingVertical: 7,
              })}
            >
              <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Medium', fontSize: 13 }}>＋ New folder</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {/* Inline new-folder input */}
        {showNewFolder ? (
          <View style={{ flexDirection: compact ? 'column' : 'row', gap: 8 }}>
            <TextInput
              accessibilityLabel="New folder name"
              autoFocus
              maxLength={40}
              onChangeText={setNewFolderName}
              onSubmitEditing={() => void handleCreateFolder()}
              placeholder="Folder name"
              placeholderTextColor={colors.text.muted}
              style={{
                backgroundColor: colors.background.input,
                borderColor: colors.border.input,
                borderRadius: 9,
                borderWidth: 1,
                color: colors.text.primary,
                flex: compact ? undefined : 1,
                ...TYPE.bodySmall,
                paddingHorizontal: 12,
                paddingVertical: 9,
              }}
              value={newFolderName}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                accessibilityLabel="Cancel new folder"
                accessibilityRole="button"
                onPress={() => setShowNewFolder(false)}
                style={{ alignItems: 'center', borderColor: colors.border.divider, borderRadius: 9, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 9 }}
              >
                <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 13 }}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Create folder"
                accessibilityRole="button"
                disabled={creatingFolder || !newFolderName.trim()}
                onPress={() => void handleCreateFolder()}
                style={{ alignItems: 'center', backgroundColor: colors.accent.primary, borderRadius: 9, justifyContent: 'center', minWidth: 84, opacity: creatingFolder || !newFolderName.trim() ? 0.6 : 1, paddingHorizontal: 14, paddingVertical: 9 }}
              >
                {creatingFolder ? (
                  <ActivityIndicator color={colors.text.inverse} size="small" />
                ) : (
                  <Text style={{ color: colors.text.inverse, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>Create</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Active-folder + note actions, all behind one ⋯ menu */}
        {menuActions.length > 0 ? (
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
            {activeFolderName && renamingFolderId !== selection ? (
              <Text
                numberOfLines={1}
                style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 13, maxWidth: 200 }}
              >
                {activeFolderName}
              </Text>
            ) : null}
            <OverflowMenu accessibilityLabel="Folder and note actions" actions={menuActions} />
          </View>
        ) : null}

        {/* Inline rename input for the active folder */}
        {renamingFolderId === selection && activeFolderName ? (
          <View style={{ flexDirection: compact ? 'column' : 'row', gap: 8 }}>
            <TextInput
              accessibilityLabel="Rename folder"
              autoFocus
              maxLength={40}
              onChangeText={setRenameName}
              onSubmitEditing={() => void handleRenameFolder(selection)}
              placeholder="Folder name"
              placeholderTextColor={colors.text.muted}
              style={{
                backgroundColor: colors.background.input,
                borderColor: colors.border.input,
                borderRadius: 9,
                borderWidth: 1,
                color: colors.text.primary,
                flex: compact ? undefined : 1,
                ...TYPE.bodySmall,
                paddingHorizontal: 12,
                paddingVertical: 9,
              }}
              value={renameName}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel rename"
                onPress={() => setRenamingFolderId(null)}
                style={{ alignItems: 'center', borderColor: colors.border.divider, borderRadius: 9, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 9 }}
              >
                <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 13 }}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save folder name"
                disabled={!renameName.trim()}
                onPress={() => void handleRenameFolder(selection)}
                style={{ alignItems: 'center', backgroundColor: colors.accent.primary, borderRadius: 9, justifyContent: 'center', minWidth: 84, opacity: renameName.trim() ? 1 : 0.6, paddingHorizontal: 14, paddingVertical: 9 }}
              >
                <Text style={{ color: colors.text.inverse, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Delete-folder confirm */}
        {deletingFolderId === selection && activeFolderName ? (
          <View
            style={{
              alignItems: compact ? 'stretch' : 'center',
              backgroundColor: colors.feedback.danger.bg,
              borderColor: colors.feedback.danger.border,
              borderRadius: 10,
              borderWidth: 1,
              flexDirection: compact ? 'column' : 'row',
              gap: 8,
              justifyContent: 'space-between',
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: colors.feedback.danger.text, flex: compact ? undefined : 1, ...TYPE.caption }}>
              Delete “{activeFolderName}”? Its notes move to General.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel deleting folder" onPress={() => setDeletingFolderId(null)} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 14 }}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete folder ${activeFolderName}`}
                onPress={() => void handleDeleteFolder(selection)}
                style={{ backgroundColor: colors.feedback.danger.bg, borderColor: colors.feedback.danger.border, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 }}
              >
                <Text style={{ color: colors.feedback.danger.text, fontFamily: 'Inter-SemiBold', fontSize: 14 }}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
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

      {folderError ? (
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
          <Text style={{ color: colors.feedback.danger.text, flex: 1, ...TYPE.caption }}>{folderError}</Text>
          {onDismissFolderError ? (
            <Pressable accessibilityLabel="Dismiss folder error" accessibilityRole="button" onPress={onDismissFolderError} style={{ paddingHorizontal: 4, paddingVertical: 3 }}>
              <Text style={{ color: colors.feedback.danger.text, ...TYPE.bodySmall, fontFamily: FONT.ui.medium }}>Dismiss</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {renderFolderBar()}

      {notes.length > 0 ? (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.background.input,
            borderColor: colors.border.input,
            borderRadius: 10,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 8,
            marginBottom: 12,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ color: colors.text.muted, fontSize: 14 }}>🔍</Text>
          <TextInput
            accessibilityLabel="Search notes"
            autoCapitalize="none"
            onChangeText={setNoteQuery}
            placeholder="Search notes…"
            placeholderTextColor={colors.text.muted}
            style={{ color: colors.text.primary, flex: 1, ...TYPE.bodySmall, minWidth: 0, paddingVertical: 9, outlineStyle: 'none' } as never}
            value={noteQuery}
          />
          {searching ? (
            <Pressable accessibilityLabel="Clear note search" onPress={() => setNoteQuery('')} hitSlop={8}>
              <Text style={{ color: colors.text.muted, fontSize: 16 }}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {visibleNotes.length > 0 ? (
        <View style={{ flexDirection: embedded && !compact ? 'row' : 'column', flexWrap: 'wrap', gap: 12 }}>
          {visibleNotes.map((note) => renderNoteCard(note))}
        </View>
      ) : !showAddForm ? (
        <View style={{ paddingHorizontal: 2, paddingVertical: 6 }}>
          <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21 }}>
            {notes.length === 0
              ? 'Sticky notes are quick, freeform reminders for this goal — a title, a note, and an optional photo.'
              : searching
                ? `No notes match “${noteQuery.trim()}”.`
                : selection === 'all'
                  ? 'No notes yet.'
                  : `No notes in ${selection === 'general' ? 'General' : `“${activeFolderName ?? 'this folder'}”`} yet.`}
          </Text>
        </View>
      ) : null}

      {showAddForm && !readOnly ? (
        <View style={{ marginTop: visibleNotes.length > 0 ? 12 : 4 }}>
          <NoteEditor
            onCancel={() => setShowAddForm(false)}
            onSubmit={async (input) => {
              await onAdd?.({ ...input, folderId: activeFolderId });
            }}
            submitLabel="Create"
          />
        </View>
      ) : !readOnly && onAdd && !selectionMode ? (
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

      {/* Bulk-selection action bar */}
      {selectionMode ? (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.background.selectedRow,
            borderColor: colors.border.input,
            borderRadius: 12,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 12,
            justifyContent: 'space-between',
            marginTop: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: colors.text.primary, fontFamily: 'Inter-Medium', fontSize: 14 }}>
            {selectedIds.size} selected
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel selection" onPress={exitSelectionMode} style={{ paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Medium', fontSize: 13 }}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Move selected notes to a folder"
              disabled={selectedIds.size === 0}
              onPress={() => setMovePickerNoteIds(Array.from(selectedIds))}
              style={{ alignItems: 'center', backgroundColor: colors.accent.primary, borderRadius: 9, justifyContent: 'center', opacity: selectedIds.size === 0 ? 0.6 : 1, paddingHorizontal: 14, paddingVertical: 7 }}
            >
              <Text style={{ color: colors.text.inverse, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>Move to…</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Folder picker for single-note or bulk move */}
      <Modal visible={movePickerNoteIds !== null} onClose={() => setMovePickerNoteIds(null)} contentStyle={{ maxWidth: 420 }}>
        <View style={{ gap: 6, padding: 4 }}>
          <Text style={{ color: colors.text.primary, ...TYPE.sectionTitle }}>
            Move {movePickerNoteIds?.length ?? 0} {(movePickerNoteIds?.length ?? 0) === 1 ? 'note' : 'notes'} to…
          </Text>
          <View style={{ marginTop: 6 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Move to General"
              onPress={() => void handleMove(movePickerNoteIds ?? [], null)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.background.selectedRow : 'transparent',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 12,
              })}
            >
              <Text style={{ color: colors.text.primary, fontFamily: 'Inter-Medium', fontSize: 14 }}>General</Text>
            </Pressable>
            {sortedFolders.map((folder) => (
              <Pressable
                key={folder.id}
                accessibilityRole="button"
                accessibilityLabel={`Move to ${folder.name}`}
                onPress={() => void handleMove(movePickerNoteIds ?? [], folder.id)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.background.selectedRow : 'transparent',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                })}
              >
                <Text style={{ color: colors.text.primary, fontFamily: 'Inter-Medium', fontSize: 14 }}>{folder.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
