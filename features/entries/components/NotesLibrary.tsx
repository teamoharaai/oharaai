import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { GOAL_CATEGORY_CATALOG } from '@/lib/goals/catalog';
import { useThemeColors } from '@/store/uiStore';
import { useEntriesStore } from '../store';
import type { EntryDraft, EntryRecord } from '../types';
import {
  createEmptyDocument,
  entriesForCategory,
  isUnlinkedNote,
  sortEntriesByRecency,
} from '../utils';

type LibraryFilter =
  | { kind: 'all' }
  | { kind: 'unlinked' }
  | { kind: 'category'; id: string; label: string }
  | { kind: 'goal'; id: string; label: string };

function formatEdited(date: Date): string {
  const difference = Date.now() - date.getTime();
  if (difference < 60_000) return 'Edited just now';
  if (difference < 3_600_000) return `Edited ${Math.max(1, Math.floor(difference / 60_000))}m ago`;
  if (difference < 86_400_000) return `Edited ${Math.floor(difference / 3_600_000)}h ago`;
  return `Edited ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function emptyNoteDraft(categoryId?: EntryRecord['categoryIds'][number]): EntryDraft {
  return {
    entryType: 'note',
    title: '',
    content: createEmptyDocument(),
    plainText: '',
    relationships: {
      goalIds: [],
      categoryIds: categoryId ? [categoryId] : [],
      milestoneIds: [],
    },
  };
}

function NoteCard({
  entry,
  accent,
  list,
  onDelete,
  onPin,
}: {
  entry: EntryRecord;
  accent: string;
  list: boolean;
  onDelete: () => void;
  onPin: () => void;
}) {
  const colors = useThemeColors();
  const [menuOpen, setMenuOpen] = useState(false);
  const context = entry.goals[0]?.title
    ?? GOAL_CATEGORY_CATALOG.find((category) => entry.categoryIds.includes(category.id))?.label
    ?? 'Unlinked';
  return (
    <Pressable
      accessibilityLabel={`Open note ${entry.title || 'Untitled note'}`}
      accessibilityRole="button"
      onPress={() => router.push(`/(app)/entries/${entry.id}` as never)}
      style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
    >
      <Card
        padding="default"
        style={{
          borderTopColor: accent,
          borderTopWidth: 3,
          gap: 9,
          minHeight: list ? 126 : 190,
          width: list ? '100%' : 260,
        }}
      >
        <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 8 }}>
          <Typography variant="title" numberOfLines={2} style={{ flex: 1, fontSize: 16 }}>
            {entry.title || 'Untitled note'}
          </Typography>
          {entry.pinned ? <Ionicons name="pin" color={accent} size={15} /> : null}
          <Pressable
            accessibilityLabel="Note actions"
            accessibilityRole="button"
            onPress={(event) => {
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
            hitSlop={8}
          >
            <Ionicons name="ellipsis-horizontal" color={colors.text.muted} size={18} />
          </Pressable>
        </View>
        {menuOpen ? (
          <View
            style={{
              backgroundColor: colors.background.input,
              borderRadius: 9,
              flexDirection: 'row',
              gap: 12,
              padding: 8,
            }}
          >
            <Pressable onPress={(event) => { event.stopPropagation(); onPin(); setMenuOpen(false); }}>
              <Typography variant="caption">{entry.pinned ? 'Unpin' : 'Pin'}</Typography>
            </Pressable>
            <Pressable onPress={(event) => { event.stopPropagation(); onDelete(); setMenuOpen(false); }}>
              <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>
                Delete
              </Typography>
            </Pressable>
          </View>
        ) : null}
        <Typography
          variant="body"
          numberOfLines={list ? 2 : 3}
          style={{ color: colors.text.secondary, flex: 1, fontSize: 13.5 }}
        >
          {entry.plainText || 'Start writing…'}
        </Typography>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
          <View style={{ backgroundColor: accent, borderRadius: 3, height: 6, width: 6 }} />
          <Typography variant="caption" numberOfLines={1} style={{ flex: 1 }}>
            {context}
          </Typography>
          <Typography variant="caption">{formatEdited(entry.updatedAt)}</Typography>
        </View>
      </Card>
    </Pressable>
  );
}

export function NotesLibrary() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const {
    entries,
    goals,
    isLoading,
    error,
    loadEntries,
    loadContext,
    createEntry,
    updateEntry,
    deleteEntry,
  } = useEntriesStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>({ kind: 'all' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortMode, setSortMode] = useState<'recent' | 'title'>('recent');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedShelves, setExpandedShelves] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<EntryRecord | null>(null);

  useEffect(() => {
    void loadEntries('note');
    void loadContext();
  }, [loadContext, loadEntries]);

  const notes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let result = entries.filter((entry) => entry.entryType === 'note' && !entry.archived);
    if (normalizedQuery) {
      result = result.filter((entry) => (
        entry.title.toLowerCase().includes(normalizedQuery)
        || entry.plainText.toLowerCase().includes(normalizedQuery)
      ));
    }
    if (filter.kind === 'unlinked') result = result.filter(isUnlinkedNote);
    if (filter.kind === 'category') {
      result = result.filter((entry) => entriesForCategory([entry], filter.id).length > 0);
    }
    if (filter.kind === 'goal') {
      result = result.filter((entry) => entry.goals.some((goal) => goal.id === filter.id));
    }
    return sortMode === 'title'
      ? [...result].sort((a, b) => a.title.localeCompare(b.title))
      : sortEntriesByRecency(result);
  }, [entries, filter, query, sortMode]);

  async function handleCreate(categoryId?: EntryRecord['categoryIds'][number]) {
    if (creating) return;
    setCreating(true);
    setActionError(null);
    try {
      const entry = await createEntry(emptyNoteDraft(categoryId));
      router.push(`/(app)/entries/${entry.id}` as never);
    } catch (creationError) {
      setActionError(creationError instanceof Error ? creationError.message : 'Could not create note');
    } finally {
      setCreating(false);
    }
  }

  async function handlePin(entry: EntryRecord) {
    try {
      await updateEntry(entry.id, {
        entryType: 'note',
        title: entry.title,
        content: entry.content,
        plainText: entry.plainText,
        pinned: !entry.pinned,
        archived: entry.archived,
        relationships: {
          goalIds: entry.goals.map((goal) => goal.id),
          categoryIds: entry.categoryIds,
          milestoneIds: [],
        },
      });
    } catch (pinError) {
      setActionError(pinError instanceof Error ? pinError.message : 'Could not update note');
    }
  }

  async function handleDelete(entry: EntryRecord) {
    try {
      await deleteEntry(entry.id);
      setPendingDelete(null);
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Could not delete note');
    }
  }

  function renderShelf(
    id: string,
    title: string,
    icon: string,
    accent: string,
    shelfEntries: EntryRecord[],
    unlinked = false,
  ) {
    const expanded = expandedShelves.includes(id);
    const visible = expanded ? shelfEntries : shelfEntries.slice(0, compact ? 2 : 4);
    return (
      <View key={id} style={{ gap: 12 }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 9 }}>
          <Typography style={{ color: accent, fontSize: 18 }}>{icon}</Typography>
          <Typography variant="title" style={{ flex: 1, fontSize: 18 }}>{title}</Typography>
          {!unlinked ? (
            <Pressable
              accessibilityLabel={`New note in ${title}`}
              accessibilityRole="button"
              onPress={() => handleCreate(id as EntryRecord['categoryIds'][number])}
              style={({ pressed }) => ({
                alignItems: 'center',
                borderColor: colors.border.input,
                borderRadius: 18,
                borderWidth: 1,
                height: 34,
                justifyContent: 'center',
                opacity: pressed ? 0.65 : 1,
                width: 34,
              })}
            >
              <Ionicons name="add" color={colors.text.secondary} size={18} />
            </Pressable>
          ) : null}
          {shelfEntries.length > (compact ? 2 : 4) ? (
            <Pressable
              onPress={() => setExpandedShelves((current) => (
                current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
              ))}
            >
              <Typography variant="caption" style={{ color: colors.text.accent }}>
                {expanded ? 'Show less' : 'View all'}
              </Typography>
            </Pressable>
          ) : null}
        </View>
        {shelfEntries.length === 0 && !unlinked ? (
          <View
            style={{
              borderColor: colors.border.subtle,
              borderRadius: 14,
              borderStyle: 'dashed',
              borderWidth: 1,
              padding: 16,
            }}
          >
            <Typography variant="caption">
              Notes linked to {title} will appear here.
            </Typography>
          </View>
        ) : view === 'list' ? (
          <View style={{ gap: 10 }}>
            {unlinked ? (
              <Pressable
                accessibilityLabel="Create a new unlinked note"
                accessibilityRole="button"
                onPress={() => handleCreate()}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  borderColor: colors.border.input,
                  borderRadius: 14,
                  borderStyle: 'dashed',
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: 9,
                  minHeight: 58,
                  opacity: pressed ? 0.7 : 1,
                  paddingHorizontal: 16,
                })}
              >
                <Ionicons name="add-circle-outline" color={colors.text.accent} size={22} />
                <Typography variant="emphasis-sm">New Note</Typography>
              </Pressable>
            ) : null}
            {visible.map((entry) => (
              <NoteCard
                accent={accent}
                entry={entry}
                key={entry.id}
                list
                onDelete={() => setPendingDelete(entry)}
                onPin={() => handlePin(entry)}
              />
            ))}
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 24 }}
          >
            {unlinked ? (
              <Pressable
                accessibilityLabel="Create a new unlinked note"
                accessibilityRole="button"
                onPress={() => handleCreate()}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <View
                  style={{
                    alignItems: 'center',
                    borderColor: colors.border.input,
                    borderRadius: 16,
                    borderStyle: 'dashed',
                    borderWidth: 1,
                    gap: 10,
                    justifyContent: 'center',
                    minHeight: 190,
                    width: 220,
                  }}
                >
                  <Ionicons name="add-circle-outline" color={colors.text.accent} size={28} />
                  <Typography variant="emphasis-sm">New Note</Typography>
                </View>
              </Pressable>
            ) : null}
            {visible.map((entry) => (
              <NoteCard
                accent={accent}
                entry={entry}
                key={entry.id}
                list={false}
                onDelete={() => setPendingDelete(entry)}
                onPin={() => handlePin(entry)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  const unlinkedNotes = notes.filter(isUnlinkedNote);

  return (
    <View style={{ gap: compact ? 22 : 28 }}>
      <View
        style={{
          alignItems: compact ? 'stretch' : 'center',
          flexDirection: compact ? 'column' : 'row',
          gap: 10,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.background.card,
            borderColor: colors.border.input,
            borderRadius: 12,
            borderWidth: 1,
            flex: 1,
            flexDirection: 'row',
            maxWidth: compact ? undefined : 480,
            paddingHorizontal: 12,
          }}
        >
          <Ionicons name="search-outline" color={colors.text.muted} size={18} />
          <TextInput
            accessibilityLabel="Search notes"
            onChangeText={setQuery}
            placeholder="Search notes"
            placeholderTextColor={colors.text.muted}
            style={{
              color: colors.text.primary,
              flex: 1,
              fontFamily: 'Inter-Regular',
              minHeight: 44,
              outlineStyle: 'solid',
              outlineWidth: 0,
              paddingHorizontal: 8,
            }}
            value={query}
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button onPress={() => setFilterOpen(true)} size="compact" variant="secondary">
            <Ionicons name="filter-outline" size={16} />{' '}
            {filter.kind === 'all'
              ? 'Filter'
              : filter.kind === 'unlinked'
                ? 'Unlinked Notes'
                : filter.label}
          </Button>
          <Button
            onPress={() => setSortMode((current) => current === 'recent' ? 'title' : 'recent')}
            size="compact"
            variant="secondary"
          >
            {sortMode === 'recent' ? 'Recently edited' : 'Title A–Z'}
          </Button>
          <Button
            onPress={() => setView((current) => current === 'grid' ? 'list' : 'grid')}
            size="compact"
            variant="secondary"
          >
            <Ionicons name={view === 'grid' ? 'grid-outline' : 'list-outline'} size={16} />
          </Button>
          <Button disabled={creating} loading={creating} onPress={() => handleCreate()} size="compact">
            New Note
          </Button>
        </View>
      </View>

      {actionError || error ? (
        <View
          accessibilityRole="alert"
          style={{
            backgroundColor: colors.feedback.danger.bg,
            borderColor: colors.feedback.danger.border,
            borderRadius: 12,
            borderWidth: 1,
            padding: 12,
          }}
        >
          <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>
            {actionError ?? error}
          </Typography>
        </View>
      ) : null}

      {isLoading && entries.filter((entry) => entry.entryType === 'note').length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <ActivityIndicator color={colors.accent.primary} />
          <Typography variant="caption" style={{ marginTop: 10 }}>Loading notes…</Typography>
        </View>
      ) : (
        <>
          {renderShelf('unlinked', 'Unlinked Notes', '○', colors.text.muted, unlinkedNotes, true)}
          {GOAL_CATEGORY_CATALOG.map((category) => renderShelf(
            category.id,
            category.label,
            category.icon,
            category.accent.color,
            entriesForCategory(notes, category.id),
          ))}
        </>
      )}

      <Modal
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        closeOnBackdropPress
        showCloseButton={false}
        contentStyle={{ maxHeight: '80%', maxWidth: 480 }}
      >
        <Typography variant="title">Filter notes</Typography>
        <ScrollView style={{ marginTop: 14, maxHeight: 420 }}>
          {([
            { kind: 'all', label: 'All notes' },
            { kind: 'unlinked', label: 'Unlinked Notes' },
          ] as const).map((option) => (
            <Pressable
              key={option.kind}
              onPress={() => { setFilter({ kind: option.kind }); setFilterOpen(false); }}
              style={{ paddingVertical: 10 }}
            >
              <Typography variant="emphasis-sm">{option.label}</Typography>
            </Pressable>
          ))}
          <Typography variant="eyebrow" style={{ marginBottom: 6, marginTop: 12 }}>
            CATEGORIES
          </Typography>
          {GOAL_CATEGORY_CATALOG.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => {
                setFilter({ kind: 'category', id: category.id, label: category.label });
                setFilterOpen(false);
              }}
              style={{ paddingVertical: 9 }}
            >
              <Typography variant="emphasis-sm">{category.icon} {category.label}</Typography>
            </Pressable>
          ))}
          <Typography variant="eyebrow" style={{ marginBottom: 6, marginTop: 12 }}>
            GOALS
          </Typography>
          {goals.filter((goal) => goal.status !== 'archived').map((goal) => (
            <Pressable
              key={goal.id}
              onPress={() => {
                setFilter({ kind: 'goal', id: goal.id, label: goal.title });
                setFilterOpen(false);
              }}
              style={{ paddingVertical: 9 }}
            >
              <Typography variant="emphasis-sm">{goal.title}</Typography>
            </Pressable>
          ))}
        </ScrollView>
      </Modal>

      <Modal
        visible={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        closeOnBackdropPress
        showCloseButton={false}
        cancelText="Cancel"
        confirmText="Delete note"
        confirmVariant="destructive"
        onConfirm={() => pendingDelete && void handleDelete(pendingDelete)}
      >
        <Typography variant="title">Delete this note?</Typography>
        <Typography variant="body" style={{ marginTop: 8 }}>
          “{pendingDelete?.title || 'Untitled note'}” will be permanently removed.
        </Typography>
      </Modal>
    </View>
  );
}
