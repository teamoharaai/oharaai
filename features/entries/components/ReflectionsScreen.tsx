import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthenticatedPageShell } from '@/components/layout/AuthenticatedPageShell';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { FONT, RADIUS, SPACE, TYPE, elevationStyle } from '@/constants/design';
import { goalWorkspaceHref } from '@/features/goals/navigation';
import { setEntryProjectShare } from '@/features/projects/services/project-service';
import { useProjectStore } from '@/features/projects/store';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { useEntriesStore } from '../store';
import type { EntryDraft, EntryRecord, RichTextDocument } from '../types';
import { createEntryRequestId } from '../utils';

type Visibility = 'private' | 'project' | 'guide';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function reflectionDocument(text: string): RichTextDocument {
  return {
    type: 'doc',
    schemaVersion: 2,
    content: text.split('\n').map((line, index) => ({
      type: 'paragraph',
      attrs: { id: `reflection-${index}` },
      ...(line ? { content: [{ type: 'text', text: line }] } : {}),
    })),
  };
}

function reflectionTitle(date: Date): string {
  return `Reflection · ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;
}

function dateGroup(date: Date): string {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'TODAY';
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' }).toUpperCase();
}

function timeLabel(date: Date): string {
  const today = new Date();
  const prefix = date.toDateString() === today.toDateString() ? 'Today · ' : '';
  return `${prefix}${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function visibilityLabel(scope: EntryRecord['projectShareScope']): string {
  if (scope === 'guide') return 'Shared with Guide';
  if (scope === 'project') return 'Shared with Project';
  return 'Private to me';
}

function ChoiceRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ gap: SPACE.sm }}>
      <Typography variant="eyebrow" style={{ color: colors.text.secondary }}>{label}</Typography>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{children}</View>
    </View>
  );
}

function Choice({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: active ? colors.background.selectedRow : colors.background.input,
        borderColor: active ? colors.border.accent : colors.border.input,
        borderRadius: RADIUS.round,
        borderWidth: 1,
        minHeight: 38,
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
        paddingHorizontal: SPACE.lg,
      })}
    >
      <Typography variant="caption" style={{ color: active ? colors.text.accent : colors.text.secondary }}>
        {label}
      </Typography>
    </Pressable>
  );
}

export function ReflectionsScreen({ selectedEntryId }: { selectedEntryId?: string }) {
  const colors = useThemeColors();
  const darkMode = useUIStore((state) => state.themeMode === 'dark');
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const params = useLocalSearchParams<{
    create?: string | string[];
    projectId?: string | string[];
    goalId?: string | string[];
  }>();
  const requestedProjectId = first(params.projectId) ?? '';
  const requestedGoalId = first(params.goalId) ?? '';
  const { entries, goals, isLoading, error, loadEntries, loadContext, createEntry, updateEntry, deleteEntry } = useEntriesStore();
  const { projects, loadProjects } = useProjectStore();
  const [composerOpen, setComposerOpen] = useState(Boolean(params.create));
  const [editingEntry, setEditingEntry] = useState<EntryRecord | null>(null);
  const [body, setBody] = useState('');
  const [projectId, setProjectId] = useState(requestedProjectId);
  const [goalId, setGoalId] = useState(requestedGoalId);
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [menuEntryId, setMenuEntryId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EntryRecord | null>(null);
  const requestId = useRef(createEntryRequestId());

  useEffect(() => {
    void loadEntries('reflection');
    void loadContext();
    void loadProjects();
  }, [loadContext, loadEntries, loadProjects]);

  useEffect(() => {
    if (!params.create) return;
    setProjectId(requestedProjectId);
    setGoalId(requestedGoalId);
    setComposerOpen(true);
  }, [params.create, requestedGoalId, requestedProjectId]);

  useEffect(() => {
    const selectedGoal = goals.find((goal) => goal.id === goalId);
    if (selectedGoal?.projectId && !projectId) setProjectId(selectedGoal.projectId);
  }, [goalId, goals, projectId]);

  const reflections = useMemo(
    () => entries
      .filter((entry) => entry.entryType === 'reflection' && !entry.archived && (!requestedProjectId || entry.project?.id === requestedProjectId))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
    [entries, requestedProjectId],
  );
  const activeProjects = projects.filter((project) => project.status !== 'archived');
  const activeGoals = goals.filter((goal) => goal.status === 'active' && (!projectId || goal.projectId === projectId));
  const selectedProject = activeProjects.find((project) => project.id === projectId) ?? null;
  const visibilityOptions: Array<{ id: Visibility; label: string }> = [
    { id: 'private', label: 'Private to me' },
    ...(selectedProject?.mode === 'guide'
      ? [{ id: 'guide' as const, label: 'Shared with Guide' }]
      : selectedProject && selectedProject.mode !== 'personal'
        ? [{ id: 'project' as const, label: 'Shared with Project' }]
        : []),
  ];

  function resetComposer() {
    setComposerOpen(false);
    setEditingEntry(null);
    setBody('');
    setProjectId('');
    setGoalId('');
    setVisibility('private');
    setSaveError(null);
    requestId.current = createEntryRequestId();
    if (params.create) router.setParams({ create: undefined, goalId: undefined });
  }

  function startReflection() {
    setEditingEntry(null);
    setBody('');
    setProjectId(requestedProjectId);
    setGoalId(requestedGoalId);
    setVisibility('private');
    setSaveError(null);
    requestId.current = createEntryRequestId();
    setComposerOpen(true);
  }

  function editReflection(entry: EntryRecord) {
    setMenuEntryId(null);
    setEditingEntry(entry);
    setBody(entry.plainText);
    setProjectId(entry.project?.id ?? '');
    setGoalId(entry.goals[0]?.id ?? '');
    setVisibility(entry.projectShareScope ?? 'private');
    setSaveError(null);
    setComposerOpen(true);
  }

  async function saveReflection() {
    const text = body.trim();
    if (!text || saving) return;
    setSaving(true);
    setSaveError(null);
    const now = new Date();
    const draft: EntryDraft = {
      entryType: 'reflection',
      title: editingEntry?.title || reflectionTitle(now),
      content: reflectionDocument(text),
      plainText: text,
      reflectionType: 'open',
      conversationTurns: [],
      takeaway: null,
      completedAt: editingEntry?.completedAt?.toISOString() ?? now.toISOString(),
      ...(editingEntry ? { expectedContentVersion: editingEntry.contentVersion } : { clientRequestId: requestId.current }),
      relationships: {
        goalIds: goalId ? [goalId] : [],
        projectId: projectId || null,
        categoryIds: [],
        milestoneIds: [],
      },
    };
    try {
      const saved = editingEntry
        ? await updateEntry(editingEntry.id, draft)
        : await createEntry(draft);
      if (projectId && visibility !== 'private') await setEntryProjectShare(saved.id, visibility);
      if (!projectId || visibility === 'private') await setEntryProjectShare(saved.id, 'private');
      await loadEntries('reflection');
      resetComposer();
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Could not save this Reflection.');
    } finally {
      setSaving(false);
    }
  }

  async function removeReflection() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteEntry(deleteTarget.id);
      setDeleteTarget(null);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Could not delete this Reflection.');
    } finally {
      setSaving(false);
    }
  }

  const grouped = reflections.reduce<Array<{ label: string; items: EntryRecord[] }>>((groups, entry) => {
    const label = dateGroup(entry.createdAt);
    const existing = groups.find((group) => group.label === label);
    if (existing) existing.items.push(entry);
    else groups.push({ label, items: [entry] });
    return groups;
  }, []);

  return (
    <AuthenticatedPageShell>
      <View style={{ alignSelf: 'center', gap: SPACE['3xl'], maxWidth: 980, width: '100%' }}>
        <View style={{ alignItems: compact ? 'stretch' : 'flex-end', flexDirection: compact ? 'column' : 'row', gap: SPACE.xl, justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            {requestedProjectId && selectedProject ? (
              <Pressable accessibilityRole="link" onPress={() => router.push(`/(app)/projects/${selectedProject.id}` as never)} style={{ alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: SPACE.sm, minHeight: 36 }}>
                <Ionicons color={colors.text.accent} name="arrow-back" size={16} />
                <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{selectedProject.title}</Typography>
              </Pressable>
            ) : null}
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
              <BrandIcon color={colors.accent.primary} name="reflections" size={28} />
              <Typography accessibilityRole="header" variant="heading">Reflections</Typography>
            </View>
            <Typography variant="body" style={{ color: colors.text.secondary, marginTop: SPACE.sm }}>
              A place to notice what&apos;s changing.
            </Typography>
          </View>
          <Button leftIcon={<Ionicons color={colors.text.onAccent} name="add" size={18} />} onPress={startReflection}>
            Reflect
          </Button>
        </View>

        {composerOpen ? (
          <View
            accessibilityLabel={editingEntry ? 'Edit Reflection composer' : 'New Reflection composer'}
            style={{
              ...elevationStyle('md', colors, darkMode),
              backgroundColor: colors.background.card,
              borderColor: colors.border.warmSubtle,
              borderRadius: RADIUS.xl,
              borderWidth: 1,
              gap: SPACE['2xl'],
              padding: compact ? SPACE.xl : SPACE['3xl'],
            }}
          >
            <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Typography variant="eyebrow">REFLECTION</Typography>
                <Typography variant="title" style={{ marginTop: SPACE.sm }}>How are things going?</Typography>
              </View>
              <Pressable accessibilityLabel="Close Reflection composer" accessibilityRole="button" onPress={resetComposer} hitSlop={8}>
                <Ionicons color={colors.text.secondary} name="close" size={23} />
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Reflection"
              autoFocus
              multiline
              onChangeText={setBody}
              placeholder="Write what you notice, what you learned, or how this moment feels…"
              placeholderTextColor={colors.text.muted}
              style={{
                backgroundColor: colors.background.input,
                borderColor: colors.border.input,
                borderRadius: RADIUS.lg,
                borderWidth: 1,
                color: colors.text.primary,
                fontFamily: FONT.editorial.regular,
                fontSize: compact ? 17 : 19,
                lineHeight: compact ? 27 : 31,
                minHeight: compact ? 220 : 270,
                outlineStyle: 'none',
                padding: compact ? SPACE.xl : SPACE['2xl'],
                textAlignVertical: 'top',
              } as never}
              value={body}
            />
            <ChoiceRow label="PROJECT · OPTIONAL">
              <Choice active={!projectId} label="None" onPress={() => { setProjectId(''); setGoalId(''); setVisibility('private'); }} />
              {activeProjects.map((project) => <Choice active={project.id === projectId} key={project.id} label={project.title} onPress={() => { setProjectId(project.id); setGoalId(''); setVisibility('private'); }} />)}
            </ChoiceRow>
            <ChoiceRow label="GOAL · OPTIONAL">
              <Choice active={!goalId} label="None" onPress={() => setGoalId('')} />
              {activeGoals.map((goal) => <Choice active={goal.id === goalId} key={goal.id} label={goal.title} onPress={() => { setGoalId(goal.id); if (goal.projectId) setProjectId(goal.projectId); }} />)}
            </ChoiceRow>
            <ChoiceRow label="VISIBILITY">
              {visibilityOptions.map((option) => <Choice active={option.id === visibility} key={option.id} label={option.label} onPress={() => setVisibility(option.id)} />)}
            </ChoiceRow>
            <View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.lg, justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
                <Ionicons color={colors.text.accent} name="lock-closed-outline" size={16} />
                <Typography variant="caption">Private is always the default.</Typography>
              </View>
              <Button disabled={!body.trim()} loading={saving} onPress={() => void saveReflection()}>
                {editingEntry ? 'Save Changes' : 'Save Reflection'}
              </Button>
            </View>
            {saveError ? <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.danger.text }}>{saveError}</Typography> : null}
          </View>
        ) : null}

        <View style={{ gap: SPACE['3xl'] }}>
          {isLoading && !reflections.length ? (
            <View style={{ alignItems: 'center', paddingVertical: SPACE['6xl'] }}>
              <ActivityIndicator color={colors.accent.primary} />
              <Typography variant="caption" style={{ marginTop: SPACE.md }}>Loading Reflections…</Typography>
            </View>
          ) : grouped.length ? grouped.map((group) => (
            <View key={group.label} style={{ gap: SPACE.lg }}>
              <Typography variant="eyebrow" style={{ color: colors.text.secondary, letterSpacing: 1.4 }}>{group.label}</Typography>
              {group.items.map((entry) => {
                const highlighted = entry.id === selectedEntryId;
                return (
                  <View
                    key={entry.id}
                    style={{
                      backgroundColor: highlighted ? colors.background.selectedRow : colors.background.card,
                      borderColor: highlighted ? colors.border.accent : colors.border.warmSubtle,
                      borderRadius: RADIUS.xl,
                      borderWidth: 1,
                      padding: compact ? SPACE.xl : SPACE['3xl'],
                    }}
                  >
                    <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Typography variant="caption" style={{ color: colors.text.secondary }}>{timeLabel(entry.createdAt)}</Typography>
                      <Pressable accessibilityLabel="Reflection actions" accessibilityRole="button" onPress={() => setMenuEntryId(menuEntryId === entry.id ? null : entry.id)} style={{ alignItems: 'center', height: 38, justifyContent: 'center', width: 38 }}>
                        <Ionicons color={colors.text.secondary} name="ellipsis-horizontal" size={20} />
                      </Pressable>
                    </View>
                    {menuEntryId === entry.id ? (
                      <View style={{ alignSelf: 'flex-end', backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, gap: SPACE.xs, marginBottom: SPACE.lg, padding: SPACE.sm }}>
                        {entry.echoOwned ? (
                          // Captured in Echo: changed only there (TD-005 B10).
                          <Button onPress={() => { setMenuEntryId(null); router.push('/(app)/echo' as never); }} size="compact" variant="ghost">Edit in Echo</Button>
                        ) : (
                          <>
                            <Button onPress={() => editReflection(entry)} size="compact" variant="ghost">Edit Reflection</Button>
                            <Button onPress={() => { setMenuEntryId(null); setDeleteTarget(entry); }} size="compact" variant="danger">Delete</Button>
                          </>
                        )}
                      </View>
                    ) : null}
                    <Typography style={{ color: colors.text.primary, fontFamily: FONT.editorial.regular, fontSize: compact ? 17 : 19, lineHeight: compact ? 28 : 31 }}>
                      {entry.plainText}
                    </Typography>
                    {(entry.project || entry.goals.length) ? (
                      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE['2xl'] }}>
                        {entry.project ? <Pressable accessibilityRole="link" onPress={() => router.push(`/(app)/projects/${entry.project!.id}` as never)}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{entry.project.title}</Typography></Pressable> : null}
                        {entry.project && entry.goals.length ? <Typography variant="caption">·</Typography> : null}
                        {entry.goals.map((goal) => <Pressable accessibilityRole="link" key={goal.id} onPress={() => router.push(goalWorkspaceHref(goal.id, 'active', entry.project?.id ? { projectId: entry.project.id } : undefined) as never)}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{goal.title}</Typography></Pressable>)}
                      </View>
                    ) : null}
                    <View style={{ alignItems: 'center', borderTopColor: colors.border.divider, borderTopWidth: 1, flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE['2xl'], paddingTop: SPACE.lg }}>
                      <Ionicons color={colors.text.muted} name={entry.projectShareScope === 'private' || !entry.projectShareScope ? 'lock-closed-outline' : 'people-outline'} size={15} />
                      <Typography variant="caption" style={{ color: colors.text.secondary }}>{visibilityLabel(entry.projectShareScope)}</Typography>
                      {entry.updatedAt.getTime() !== entry.createdAt.getTime() ? <Typography variant="caption" style={{ color: colors.text.muted }}>· Edited {entry.updatedAt.toLocaleDateString()}</Typography> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )) : (
            <View style={{ alignItems: 'center', backgroundColor: colors.background.card, borderColor: colors.border.warmSubtle, borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACE['5xl'] }}>
              <BrandIcon color={colors.text.accent} name="reflections" size={36} />
              <Typography variant="title" style={{ marginTop: SPACE.xl }}>Your Reflection history starts here.</Typography>
              <Typography variant="body" style={{ color: colors.text.secondary, marginTop: SPACE.sm, maxWidth: 520, textAlign: 'center' }}>Record a moment in time. You can connect it to a Goal or Project, or leave it entirely personal.</Typography>
              <Button onPress={startReflection} style={{ marginTop: SPACE.xl }}>Write a Reflection</Button>
            </View>
          )}
          {error ? <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}
        </View>
      </View>

      <Modal
        cancelText="Cancel"
        closeOnBackdropPress
        confirmText={saving ? 'Deleting…' : 'Delete Reflection'}
        confirmDisabled={saving}
        onCancel={() => setDeleteTarget(null)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void removeReflection()}
        visible={Boolean(deleteTarget)}
      >
        <Typography variant="title">Delete this Reflection?</Typography>
        <Typography variant="body" style={{ marginTop: SPACE.md }}>This permanently removes the journal entry. Its original date and links cannot be recovered.</Typography>
      </Modal>
    </AuthenticatedPageShell>
  );
}
