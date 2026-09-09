import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE, TYPE } from '@/constants/design';
import type { Project } from '@/features/projects/types';
import { useProjectStore } from '@/features/projects/store';
import { useThemeColors } from '@/store/uiStore';
import { useEntriesStore } from '../store';
import type { EntryRecord, EntryType } from '../types';
import { entriesForProject, sortEntriesByRecency } from '../utils';

export type EchoLibraryFilter = 'all' | EntryType;

function formatUpdatedAt(date: Date): string {
  const difference = Date.now() - date.getTime();
  if (difference < 60_000) return 'Now';
  if (difference < 3_600_000) return `${Math.max(1, Math.floor(difference / 60_000))}m`;
  if (difference < 86_400_000) return `${Math.floor(difference / 3_600_000)}h`;
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }),
  });
}

function entryTitle(entry: EntryRecord): string {
  if (entry.title.trim()) return entry.title.trim();
  return entry.entryType === 'reflection' ? 'Reflection' : 'Untitled note';
}

function EntryRow({
  entry,
  selected,
  onPress,
}: {
  entry: EntryRecord;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const reflection = entry.entryType === 'reflection';

  return (
    <Pressable
      accessibilityLabel={`Open ${reflection ? 'reflection' : 'note'} ${entryTitle(entry)}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ hovered, pressed }) => ({
        backgroundColor: selected
          ? colors.background.selectedRow
          : hovered
            ? colors.background.hoverAccent
            : 'transparent',
        borderColor: selected ? colors.border.accent : 'transparent',
        borderRadius: RADIUS.md,
        borderWidth: 1,
        gap: SPACE.sm,
        minHeight: 92,
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: SPACE.lg,
        paddingVertical: SPACE.md,
      })}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md, minWidth: 0 }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: reflection
              ? colors.background.selectedRow
              : colors.background.input,
            borderRadius: RADIUS.round,
            flexShrink: 0,
            height: 34,
            justifyContent: 'center',
            width: 34,
          }}
        >
          <BrandIcon
            name={reflection ? 'echo' : 'echo-add-entry'}
            color={colors.accent.primary}
            size={17}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Typography numberOfLines={1} variant="emphasis-sm">
            {entryTitle(entry)}
          </Typography>
          <Typography numberOfLines={1} variant="caption" style={{ marginTop: 2 }}>
            {reflection ? 'Reflection' : 'Note'}
            {entry.project?.title ? ` · ${entry.project.title}` : ''}
          </Typography>
        </View>
        <Typography variant="caption" style={{ flexShrink: 0 }}>
          {formatUpdatedAt(entry.updatedAt)}
        </Typography>
      </View>
      <Typography
        numberOfLines={2}
        variant="caption"
        style={{ color: colors.text.secondary, lineHeight: 19, paddingLeft: 46 }}
      >
        {entry.takeaway || entry.plainText || (reflection ? 'Write freely…' : 'Start writing…')}
      </Typography>
    </Pressable>
  );
}

function ProjectRow({
  project,
  selected,
  count,
  onPress,
}: {
  project: Project;
  selected: boolean;
  count: number;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityLabel={`Open Echo project ${project.title}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ hovered, pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected
          ? colors.background.selectedRow
          : hovered
            ? colors.background.hoverAccent
            : 'transparent',
        borderRadius: RADIUS.md,
        flexDirection: 'row',
        gap: SPACE.md,
        minHeight: 44,
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: SPACE.lg,
      })}
    >
      <BrandIcon name="project" color={colors.text.accent} size={17} />
      <Typography numberOfLines={1} variant="emphasis-sm" style={{ flex: 1 }}>
        {project.title}
      </Typography>
      <Typography variant="caption">{count}</Typography>
    </Pressable>
  );
}

export function EntriesLibrary({
  selectedEntryId,
  selectedProjectId,
  onSelectEntry,
  onSelectMostRecent,
  onSelectProject,
  onNew,
  onCollapse,
}: {
  selectedEntryId?: string;
  selectedProjectId?: string;
  onSelectEntry: (entryId: string) => void;
  onSelectMostRecent: () => void;
  onSelectProject: (projectId: string) => void;
  onNew: () => void;
  onCollapse?: () => void;
}) {
  const colors = useThemeColors();
  const { entries, isLoading, error, loadEntries, loadContext } = useEntriesStore();
  const {
    projects,
    isLoading: projectsLoading,
    error: projectsError,
    loadProjects,
  } = useProjectStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<EchoLibraryFilter>('note');

  useEffect(() => {
    setFilter(selectedProjectId ? 'all' : 'note');
  }, [selectedProjectId]);

  useEffect(() => {
    void loadEntries();
    void loadContext();
    void loadProjects();
  }, [loadContext, loadEntries, loadProjects]);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status !== 'archived'),
    [projects],
  );
  const selectedProject = activeProjects.find((project) => project.id === selectedProjectId) ?? null;
  const inProjectContext = Boolean(selectedProjectId);
  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const scopedEntries = selectedProjectId ? entriesForProject(entries, selectedProjectId) : entries;
    return sortEntriesByRecency(scopedEntries.filter((entry) => {
      if (entry.archived) return false;
      if (filter !== 'all' && entry.entryType !== filter) return false;
      if (!normalizedQuery) return true;
      return entry.title.toLowerCase().includes(normalizedQuery)
        || entry.plainText.toLowerCase().includes(normalizedQuery)
        || entry.takeaway?.toLowerCase().includes(normalizedQuery);
    }));
  }, [entries, filter, query, selectedProjectId]);

  const projectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      if (!entry.archived && entry.project?.id) {
        counts.set(entry.project.id, (counts.get(entry.project.id) ?? 0) + 1);
      }
    });
    return counts;
  }, [entries]);

  function retryLibraryLoad() {
    void Promise.all([loadEntries(), loadContext(), loadProjects()]);
  }

  return (
    <View
      style={{
        backgroundColor: colors.background.card,
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        userSelect: 'none',
      }}
    >
      <View
        style={{
          borderBottomColor: colors.border.divider,
          borderBottomWidth: 1,
          gap: SPACE.lg,
          paddingBottom: SPACE['2xl'],
          paddingHorizontal: SPACE.xl,
          paddingTop: SPACE.xl,
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
          <Pressable
            accessibilityLabel={inProjectContext ? 'Return to Most Recent Echo content' : 'Show Most Recent Echo content'}
            accessibilityRole="button"
            accessibilityState={{ selected: !inProjectContext }}
            onPress={onSelectMostRecent}
            style={({ hovered, pressed }) => ({
              alignItems: 'center',
              backgroundColor: !inProjectContext
                ? colors.background.selectedRow
                : hovered
                  ? colors.background.hoverAccent
                  : 'transparent',
              borderRadius: RADIUS.md,
              flex: 1,
              flexDirection: 'row',
              gap: SPACE.md,
              minHeight: 44,
              opacity: pressed ? 0.72 : 1,
              paddingHorizontal: SPACE.lg,
            })}
          >
            <Ionicons
              name={inProjectContext ? 'arrow-back' : 'time-outline'}
              color={colors.text.accent}
              size={19}
            />
            <Typography variant="title" style={{ flex: 1, fontSize: 17 }}>
              Most Recent
            </Typography>
          </Pressable>
          {onCollapse ? (
            <Pressable
              accessibilityLabel="Collapse Echo library"
              accessibilityRole="button"
              accessibilityState={{ expanded: true }}
              hitSlop={6}
              onPress={onCollapse}
              style={({ hovered, pressed }) => ({
                alignItems: 'center',
                backgroundColor: hovered ? colors.background.hoverAccent : 'transparent',
                borderRadius: RADIUS.round,
                height: 38,
                justifyContent: 'center',
                opacity: pressed ? 0.68 : 1,
                width: 38,
              })}
            >
              <Ionicons name="chevron-back" color={colors.text.accent} size={18} />
            </Pressable>
          ) : null}
        </View>

        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.background.input,
            borderColor: colors.border.input,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            flexDirection: 'row',
            paddingHorizontal: SPACE.lg,
          }}
        >
          <Ionicons name="search-outline" color={colors.text.muted} size={18} />
          <TextInput
            accessibilityLabel="Search Echo"
            onChangeText={setQuery}
            placeholder="Search Echo"
            placeholderTextColor={colors.text.muted}
            style={{
              color: colors.text.primary,
              flex: 1,
            ...TYPE.bodySmall,
            minHeight: 42,
              outlineStyle: 'solid',
              outlineWidth: 0,
              paddingHorizontal: SPACE.md,
            }}
            value={query}
          />
        </View>

        <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: SPACE.xs }}>
          {([
            { id: 'all', label: 'All' },
            { id: 'note', label: 'Notes' },
            { id: 'reflection', label: 'Reflections' },
          ] as const).map((option) => {
            const selected = filter === option.id;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={option.id}
                onPress={() => setFilter(option.id)}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: selected ? colors.background.selectedRow : 'transparent',
                  borderRadius: RADIUS.round,
                  flex: 1,
                  justifyContent: 'center',
                minHeight: 38,
                  opacity: pressed ? 0.7 : 1,
                  paddingHorizontal: SPACE.md,
                })}
              >
                <Typography
                  variant="emphasis-sm"
                  style={{ color: selected ? colors.text.accent : colors.text.secondary }}
                >
                  {option.label}
                </Typography>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACE.xl, paddingBottom: SPACE['3xl'] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        <Typography variant="eyebrow" style={{ marginBottom: SPACE.md, paddingHorizontal: SPACE.sm }}>
          {selectedProject?.title ?? 'MOST RECENT'}
        </Typography>

        {(isLoading || projectsLoading) && entries.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: SPACE['5xl'] }}>
            <ActivityIndicator color={colors.accent.primary} />
            <Typography variant="caption" style={{ marginTop: SPACE.md }}>Loading Echo…</Typography>
          </View>
        ) : visibleEntries.length ? (
          <View style={{ gap: SPACE.xs }}>
            {visibleEntries.map((entry) => (
              <EntryRow
                entry={entry}
                key={entry.id}
                onPress={() => onSelectEntry(entry.id)}
                selected={entry.id === selectedEntryId}
              />
            ))}
          </View>
        ) : (
          <View style={{ alignItems: 'flex-start', gap: SPACE.md, padding: SPACE.lg }}>
            <BrandIcon name="echo" color={colors.text.accent} size={25} />
            <Typography variant="title">
              {selectedProject ? 'This project is quiet for now' : 'A clear place to begin'}
            </Typography>
            <Typography variant="body-small">
              {selectedProject
                ? 'Notes and Reflections added to this Project will appear here by recency.'
                : query
                  ? 'No Notes or Reflections match this search.'
                  : 'Your Notes and Reflections will appear here as you create them.'}
            </Typography>
            {!query ? <Button onPress={onNew} size="compact">New</Button> : null}
          </View>
        )}

        {error || projectsError ? (
          <View
            accessibilityRole="alert"
            style={{
              backgroundColor: colors.feedback.danger.bg,
              borderColor: colors.feedback.danger.border,
              borderRadius: RADIUS.md,
              borderWidth: 1,
              gap: SPACE.md,
              marginTop: SPACE.lg,
              padding: SPACE.lg,
            }}
          >
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
              <Ionicons name="alert-circle-outline" color={colors.feedback.danger.text} size={18} />
              <Typography
                variant="body-small"
                style={{ color: colors.feedback.danger.text, flex: 1 }}
              >
                We couldn’t load all of your Echo content.
              </Typography>
            </View>
            <Pressable
              accessibilityLabel="Retry loading Echo content"
              accessibilityRole="button"
              onPress={retryLibraryLoad}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                borderRadius: RADIUS.sm,
                opacity: pressed ? 0.65 : 1,
                paddingHorizontal: SPACE.sm,
                paddingVertical: SPACE.xs,
              })}
            >
              <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
                Retry
              </Typography>
            </Pressable>
          </View>
        ) : null}

        <View
          style={{
            backgroundColor: colors.background.input,
            borderColor: colors.border.subtle,
            borderRadius: RADIUS.lg,
            borderWidth: 1,
            marginTop: SPACE['2xl'],
            padding: SPACE.sm,
            paddingBottom: SPACE.md,
            paddingTop: SPACE.lg,
          }}
        >
          <Typography variant="eyebrow" style={{ marginBottom: SPACE.md, paddingHorizontal: SPACE.lg }}>
            PROJECTS
          </Typography>
          {activeProjects.length ? (
            <View style={{ gap: SPACE.xs }}>
              {activeProjects.map((project) => (
                <ProjectRow
                  count={projectCounts.get(project.id) ?? 0}
                  key={project.id}
                  onPress={() => onSelectProject(project.id)}
                  project={project}
                  selected={project.id === selectedProjectId}
                />
              ))}
            </View>
          ) : (
            <Typography variant="body-small" style={{ paddingHorizontal: SPACE.lg }}>
              No projects yet.
            </Typography>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
