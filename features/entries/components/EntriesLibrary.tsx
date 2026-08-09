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
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { GOAL_CATEGORY_CATALOG } from '@/lib/goals/catalog';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { useEntriesStore } from '../store';
import type { EntryDraft, EntryRecord } from '../types';
import {
  createEmptyDocument,
  entriesForCategory,
  isUnlinkedEntry,
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

function EntryCard({
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
  const isReflection = entry.entryType === 'reflection';
  const fallbackTitle = isReflection ? 'Reflection' : 'Untitled note';
  const entryLabel = isReflection ? 'Reflection' : 'Note';
  const context = entry.goals[0]?.title
    ?? GOAL_CATEGORY_CATALOG.find((category) => entry.categoryIds.includes(category.id))?.label
    ?? 'Unlinked';
  return (
    <Card
      elevation="sm"
      padding="spacious"
      style={{
        gap: SPACE.md,
        minHeight: list ? 132 : 204,
        width: list ? '100%' : 276,
      }}
    >
      <View style={{ flex: 1, position: 'relative' }}>
        <Pressable
          accessibilityLabel={`Open ${entryLabel.toLowerCase()} ${entry.title || fallbackTitle}`}
          accessibilityRole="button"
          onPress={() => router.push(`/(app)/entries/${entry.id}` as never)}
          style={({ pressed }) => ({ flex: 1, gap: SPACE.md, opacity: pressed ? 0.72 : 1 })}
        >
          <View
            style={{
              alignItems: 'flex-start',
              flexDirection: 'row',
              gap: 8,
              paddingRight: 26,
            }}
          >
            <View style={{
              alignItems: 'center',
              backgroundColor: colors.background.selectedRow,
              borderRadius: RADIUS.sm,
              height: 36,
              justifyContent: 'center',
              width: 36,
            }}>
              <Ionicons
                accessibilityLabel={entryLabel}
                name={isReflection ? 'sparkles-outline' : 'document-text-outline'}
                color={accent}
                size={18}
              />
            </View>
            <Typography variant="title" numberOfLines={2} style={{ flex: 1, fontSize: 16 }}>
              {entry.title || fallbackTitle}
            </Typography>
            {entry.pinned ? <Ionicons name="pin" color={accent} size={15} /> : null}
          </View>
          <Typography
            variant="body"
            numberOfLines={list ? 2 : 3}
            style={{ color: colors.text.secondary, flex: 1 }}
          >
            {entry.takeaway || entry.plainText || (isReflection ? 'Open reflection…' : 'Start writing…')}
          </Typography>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
            <View style={{ backgroundColor: accent, borderRadius: 3, height: 6, width: 6 }} />
            <Typography variant="caption" numberOfLines={1} style={{ flex: 1 }}>
              {context}
            </Typography>
            <Typography variant="caption">{formatEdited(entry.updatedAt)}</Typography>
          </View>
        </Pressable>
        <Pressable
          accessibilityLabel={`${entryLabel} actions`}
          accessibilityRole="button"
          onPress={() => setMenuOpen((open) => !open)}
          hitSlop={8}
          style={({ pressed }) => ({
            alignItems: 'center',
            borderRadius: RADIUS.round,
            height: 44,
            justifyContent: 'center',
            opacity: pressed ? 0.56 : 1,
            position: 'absolute',
            right: -10,
            top: -10,
            width: 44,
          })}
        >
          <Ionicons name="ellipsis-horizontal" color={colors.text.muted} size={18} />
        </Pressable>
      </View>
      {menuOpen ? (
        <View
          style={{
            backgroundColor: colors.background.input,
            borderRadius: RADIUS.md,
            flexDirection: 'row',
            gap: 12,
            minHeight: 44,
            padding: SPACE.md,
          }}
        >
          {!isReflection ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => { onPin(); setMenuOpen(false); }}
            >
              <Typography variant="caption">{entry.pinned ? 'Unpin' : 'Pin'}</Typography>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => { onDelete(); setMenuOpen(false); }}
          >
            <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>
              Delete
            </Typography>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

export function EntriesLibrary() {
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
    void loadEntries();
    void loadContext();
  }, [loadContext, loadEntries]);

  const libraryEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let result = entries.filter((entry) => !entry.archived);
    if (normalizedQuery) {
      result = result.filter((entry) => (
        entry.title.toLowerCase().includes(normalizedQuery)
        || entry.plainText.toLowerCase().includes(normalizedQuery)
        || entry.takeaway?.toLowerCase().includes(normalizedQuery)
      ));
    }
    if (filter.kind === 'unlinked') result = result.filter(isUnlinkedEntry);
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
      setActionError(deleteError instanceof Error ? deleteError.message : 'Could not delete entry');
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
    if (shelfEntries.length === 0) return null;

    function toggleShelf() {
      setExpandedShelves((current) => (
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      ));
    }

    return (
      <View key={id} style={{ gap: 12 }}>
        <Card
          elevation="sm"
          padding="none"
          style={{
            alignItems: 'center',
            borderColor: expanded ? colors.border.accent : colors.border.divider,
            borderRadius: RADIUS.lg,
            flexDirection: 'row',
            gap: SPACE.sm,
            minHeight: 64,
            paddingHorizontal: SPACE.lg,
          }}
        >
          <Pressable
            accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={toggleShelf}
            style={({ pressed }) => ({
              alignItems: 'center',
              flex: 1,
              flexDirection: 'row',
              gap: SPACE.md,
              minHeight: 64,
              opacity: pressed ? 0.7 : 1,
              paddingVertical: SPACE.md,
            })}
          >
            <Typography style={{ color: accent, fontSize: 18 }}>{icon}</Typography>
            <Typography variant="title" style={{ flex: 1, fontSize: 18 }}>{title}</Typography>
            <View
              style={{
                alignItems: 'center',
                backgroundColor: colors.background.input,
                borderRadius: 999,
                justifyContent: 'center',
                minWidth: 28,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Typography variant="caption">{shelfEntries.length}</Typography>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              color={colors.text.muted}
              size={18}
            />
          </Pressable>
          {!unlinked ? (
            <Pressable
              accessibilityLabel={`New note in ${title}`}
              accessibilityRole="button"
              onPress={() => handleCreate(id as EntryRecord['categoryIds'][number])}
              style={({ pressed }) => ({
                alignItems: 'center',
                borderColor: colors.border.input,
                borderRadius: RADIUS.round,
                borderWidth: 1,
                height: 44,
                justifyContent: 'center',
                opacity: pressed ? 0.65 : 1,
                width: 44,
              })}
            >
              <Ionicons name="add" color={colors.text.secondary} size={18} />
            </Pressable>
          ) : null}
        </Card>
        {expanded && view === 'list' ? (
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
            {shelfEntries.map((entry) => (
              <EntryCard
                accent={accent}
                entry={entry}
                key={entry.id}
                list
                onDelete={() => setPendingDelete(entry)}
                onPin={() => handlePin(entry)}
              />
            ))}
          </View>
        ) : expanded ? (
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
            {shelfEntries.map((entry) => (
              <EntryCard
                accent={accent}
                entry={entry}
                key={entry.id}
                list={false}
                onDelete={() => setPendingDelete(entry)}
                onPin={() => handlePin(entry)}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>
    );
  }

  const unlinkedEntries = libraryEntries.filter(isUnlinkedEntry);
  const populatedCategoryShelves = GOAL_CATEGORY_CATALOG
    .map((category) => ({
      category,
      entries: entriesForCategory(libraryEntries, category.id),
    }))
    .filter((shelf) => shelf.entries.length > 0);

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
            borderRadius: RADIUS.md,
            borderWidth: 1,
            flex: 1,
            flexDirection: 'row',
            maxWidth: compact ? undefined : 480,
            paddingHorizontal: SPACE.lg,
          }}
        >
          <Ionicons name="search-outline" color={colors.text.muted} size={18} />
          <TextInput
            accessibilityLabel="Search entries"
            onChangeText={setQuery}
            placeholder="Search notes and reflections"
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
                ? 'Unlinked Entries'
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

      {isLoading && entries.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <ActivityIndicator color={colors.accent.primary} />
          <Typography variant="caption" style={{ marginTop: 10 }}>Loading entries…</Typography>
        </View>
      ) : libraryEntries.length === 0 ? (
        <View
          style={{
            alignItems: 'center',
            borderColor: colors.border.subtle,
            borderRadius: 16,
            borderStyle: 'dashed',
            borderWidth: 1,
            gap: 8,
            padding: 28,
          }}
        >
          <Ionicons name="documents-outline" color={colors.text.accent} size={28} />
          <Typography variant="title">No entries to show</Typography>
          <Typography variant="caption" style={{ textAlign: 'center' }}>
            Create a note or start a reflection to begin your record.
          </Typography>
          <Button disabled={creating} loading={creating} onPress={() => handleCreate()} size="compact">
            New Note
          </Button>
        </View>
      ) : (
        <>
          {renderShelf(
            'unlinked',
            'Unlinked Entries',
            '○',
            colors.text.muted,
            unlinkedEntries,
            true,
          )}
          {populatedCategoryShelves.map(({ category, entries: shelfEntries }) => renderShelf(
            category.id,
            category.label,
            category.icon,
            category.accent.color,
            shelfEntries,
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
        <Typography variant="title">Filter entries</Typography>
        <ScrollView style={{ marginTop: 14, maxHeight: 420 }}>
          {([
            { kind: 'all', label: 'All entries' },
            { kind: 'unlinked', label: 'Unlinked Entries' },
          ] as const).map((option) => (
            <Pressable
              key={option.kind}
              onPress={() => { setFilter({ kind: option.kind }); setFilterOpen(false); }}
              style={{ paddingVertical: 10 }}
            >
              <Typography variant="emphasis-sm">{option.label}</Typography>
            </Pressable>
          ))}
          {populatedCategoryShelves.length > 0 ? (
            <>
              <Typography variant="eyebrow" style={{ marginBottom: 6, marginTop: 12 }}>
                CATEGORIES
              </Typography>
              {populatedCategoryShelves.map(({ category }) => (
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
            </>
          ) : null}
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
        confirmText="Delete entry"
        confirmVariant="destructive"
        onConfirm={() => pendingDelete && void handleDelete(pendingDelete)}
      >
        <Typography variant="title">Delete this entry?</Typography>
        <Typography variant="body" style={{ marginTop: 8 }}>
          “{pendingDelete?.title
            || (pendingDelete?.entryType === 'reflection' ? 'Reflection' : 'Untitled note')}”
          {' '}will be permanently removed.
        </Typography>
      </Modal>
    </View>
  );
}
