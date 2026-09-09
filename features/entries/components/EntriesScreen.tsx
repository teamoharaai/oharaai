import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE, elevationStyle } from '@/constants/design';
import { useProjectStore } from '@/features/projects/store';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import type { EntryType } from '../types';
import { EchoCreationModal } from './EchoCreationModal';
import { EntriesLibrary } from './EntriesLibrary';
import { EntryDetailScreen } from './EntryDetailScreen';

function param(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function EntriesScreen({ selectedEntryId }: { selectedEntryId?: string }) {
  const colors = useThemeColors();
  const darkMode = useUIStore((state) => state.themeMode === 'dark');
  const libraryCollapsed = useUIStore((state) => state.entriesLibraryCollapsed);
  const toggleLibrary = useUIStore((state) => state.toggleEntriesLibraryCollapsed);
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const params = useLocalSearchParams<{
    create?: string | string[];
    goalId?: string | string[];
    projectId?: string | string[];
  }>();
  const selectedProjectId = param(params.projectId);
  const requestedCreation = param(params.create);
  const projects = useProjectStore((state) => state.projects);
  const [creationOpen, setCreationOpen] = useState(false);
  const [creationType, setCreationType] = useState<EntryType | null>(null);
  const collapseProgress = useRef(new Animated.Value(libraryCollapsed ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(collapseProgress, {
      duration: 210,
      toValue: libraryCollapsed ? 0 : 1,
      useNativeDriver: false,
    }).start();
  }, [collapseProgress, libraryCollapsed]);

  useEffect(() => {
    if (!['new', 'note', 'reflection'].includes(requestedCreation ?? '')) return;
    setCreationType(requestedCreation === 'note' || requestedCreation === 'reflection'
      ? requestedCreation
      : null);
    setCreationOpen(true);
  }, [requestedCreation]);

  function entriesHref(projectId?: string) {
    return projectId
      ? ({ pathname: '/(app)/entries', params: { projectId } } as never)
      : ('/(app)/entries' as never);
  }

  function selectEntry(entryId: string) {
    router.push({
      pathname: '/(app)/entries/[id]',
      params: {
        id: entryId,
        ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
      },
    } as never);
  }

  function selectMostRecent() {
    if (selectedEntryId) {
      router.replace({ pathname: '/(app)/entries/[id]', params: { id: selectedEntryId } } as never);
      return;
    }
    router.replace(entriesHref());
  }

  function closeCreation() {
    setCreationOpen(false);
    setCreationType(null);
    if (requestedCreation) {
      if (selectedEntryId) {
        router.replace({
          pathname: '/(app)/entries/[id]',
          params: { id: selectedEntryId, ...(selectedProjectId ? { projectId: selectedProjectId } : {}) },
        } as never);
      } else {
        router.replace(entriesHref(selectedProjectId));
      }
    }
  }

  function openCreation(type: EntryType | null = null) {
    setCreationType(type);
    setCreationOpen(true);
  }

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const libraryWidth = collapseProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 326] });
  const librarySpacing = collapseProgress.interpolate({ inputRange: [0, 1], outputRange: [0, SPACE.xl] });
  const workspaceElevation = elevationStyle('sm', colors, darkMode);

  const library = (
    <EntriesLibrary
      onCollapse={compact ? undefined : toggleLibrary}
      onNew={() => openCreation()}
      onSelectEntry={selectEntry}
      onSelectMostRecent={selectMostRecent}
      onSelectProject={(projectId) => router.replace(entriesHref(projectId))}
      selectedEntryId={selectedEntryId}
      selectedProjectId={selectedProjectId}
    />
  );

  const activeWorkspace = selectedEntryId ? (
    <EntryDetailScreen
      embedded
      entryId={selectedEntryId}
      onBack={() => router.replace(entriesHref(selectedProjectId))}
      showBack={compact}
    />
  ) : (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: colors.background.card,
        flex: 1,
        justifyContent: 'center',
        padding: compact ? SPACE['2xl'] : SPACE['4xl'],
        userSelect: 'none',
      }}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.background.selectedRow,
          borderColor: colors.border.subtle,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          maxWidth: 440,
          paddingHorizontal: compact ? SPACE['2xl'] : SPACE['4xl'],
          paddingVertical: compact ? SPACE['3xl'] : SPACE['4xl'],
          width: '100%',
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.background.card,
            borderColor: colors.border.input,
            borderWidth: 1,
            borderRadius: RADIUS.round,
            height: 52,
            justifyContent: 'center',
            width: 52,
          }}
        >
          <BrandIcon name={selectedProject ? 'project' : 'echo'} color={colors.text.accent} size={25} />
        </View>
        <Typography variant="heading" style={{ fontSize: compact ? 25 : 28, marginTop: SPACE['2xl'], textAlign: 'center' }}>
          {selectedProject?.title ?? 'A space to hear yourself think'}
        </Typography>
        <Typography variant="body" style={{ color: colors.text.secondary, lineHeight: 24, marginTop: SPACE.md, textAlign: 'center' }}>
          {selectedProject
            ? 'Choose a Note or Reflection from this Project, or create something new for it.'
            : 'Choose something from Most Recent, open a Project, or begin with a new Note or Reflection.'}
        </Typography>
      </View>
    </View>
  );

  return (
    <View
      className="ohara-echo-workspace"
      style={{
        backgroundColor: colors.background.page,
        flex: 1,
        gap: compact ? SPACE.lg : SPACE.xl,
        minHeight: 0,
        paddingBottom: compact ? 0 : SPACE.lg,
        paddingHorizontal: compact ? SPACE.xl : SPACE['3xl'],
        paddingTop: SPACE.lg,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          minHeight: 44,
          minWidth: 0,
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md, minWidth: 0 }}>
          <BrandIcon name="echo" color={colors.accent.primary} size={compact ? 23 : 25} />
          <Typography
            accessibilityRole="header"
            variant="heading"
            style={{ letterSpacing: -0.6 }}
          >
            Echo
          </Typography>
        </View>
        <Button onPress={() => openCreation()} style={{ minWidth: compact ? 98 : 112 }}>
          + New
        </Button>
      </View>

      <View style={{ flex: 1, flexDirection: 'row', minHeight: 0, minWidth: 0 }}>
        {compact ? null : (
          <Animated.View
            testID="echo-library-surface"
            style={[
              {
                backgroundColor: colors.background.card,
                borderColor: colors.border.divider,
                borderRadius: RADIUS.xl,
                borderWidth: libraryCollapsed ? 0 : 1,
                marginRight: librarySpacing,
                opacity: collapseProgress,
                overflow: 'hidden',
                width: libraryWidth,
              },
              workspaceElevation,
            ]}
          >
            <View style={{ height: '100%', width: 326 }}>{library}</View>
          </Animated.View>
        )}
        <View
          testID="echo-workspace-surface"
          style={[
            {
              backgroundColor: colors.background.card,
              borderColor: colors.border.divider,
              borderRadius: compact ? RADIUS.lg : RADIUS.xl,
              borderWidth: 1,
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              position: 'relative',
            },
            workspaceElevation,
          ]}
        >
          {compact ? (selectedEntryId ? activeWorkspace : library) : activeWorkspace}
          {!compact && libraryCollapsed ? (
            <Pressable
              accessibilityLabel="Expand Echo library"
              accessibilityRole="button"
              accessibilityState={{ expanded: false }}
              onPress={toggleLibrary}
              style={({ hovered, pressed }) => ({
                alignItems: 'center',
                backgroundColor: hovered ? colors.background.hoverAccent : colors.background.card,
                borderColor: colors.border.input,
                borderRadius: RADIUS.round,
                borderWidth: 1,
                height: 36,
                justifyContent: 'center',
                left: SPACE.sm,
                marginTop: -18,
                opacity: pressed ? 0.68 : 0.94,
                position: 'absolute',
                top: '50%',
                width: 36,
                zIndex: 30,
              })}
            >
              <Ionicons name="chevron-forward" color={colors.text.accent} size={18} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <EchoCreationModal
        initialGoalId={param(params.goalId)}
        initialProjectId={selectedProjectId}
        initialType={creationType}
        onClose={closeCreation}
        onCreated={(entryId) => {
          setCreationOpen(false);
          setCreationType(null);
          router.replace({ pathname: '/(app)/entries/[id]', params: { id: entryId } } as never);
        }}
        visible={creationOpen}
      />
    </View>
  );
}
