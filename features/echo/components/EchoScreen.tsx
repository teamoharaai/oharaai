import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, Pressable, SafeAreaView, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/components/ui/Typography';
import { LIGHT_THEME } from '@/constants/colors';
import { useUIStore } from '@/store/uiStore';
import { useEditEntry } from '../hooks/useEditEntry';
import { useEntries } from '../hooks/useEntries';
import { useMoveEntry } from '../hooks/useMoveEntry';
import { useEchoStore } from '../store';
import { EchoContainerTree } from './EchoContainerTree';
import { CreateFolderModal } from './CreateFolderModal';
import { EchoDetailPane } from './EchoDetailPane';
import { EchoEntryList } from './EchoEntryList';
import { EchoFilterPill, type EchoFilterScope } from './EchoFilterPill';
import { EchoPaneResizer } from './EchoPaneResizer';
import { MoveEntryModal } from './MoveEntryModal';
import type { EchoEntry } from '../types';

const ALL_SCOPE: EchoFilterScope = { type: 'all', id: 'all', label: 'All' };
const RIGHT_PANE_MIN_WIDTH = 280;
const MIDDLE_COLUMN_MIN_WIDTH = 220;

export function EchoScreen() {
  const { goalId: routeGoalIdParam } = useLocalSearchParams<{ goalId?: string | string[] }>();
  const routeGoalId = Array.isArray(routeGoalIdParam) ? routeGoalIdParam[0] : routeGoalIdParam;
  const {
    entries,
    isLoading,
    pickerGoals,
    pickerFolders,
    containerOptions,
    saveEntry,
    createFolder,
    reloadPickerGoals,
  } = useEntries();
  const removeEntry = useEchoStore((state) => state.removeEntry);
  const deleteEntry = useEchoStore((state) => state.deleteEntry);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const rightPaneWidth = useUIStore((state) => state.rightPaneWidth);
  const setRightPaneWidth = useUIStore((state) => state.setRightPaneWidth);
  const middleMode = useUIStore((state) => state.echoMiddleMode);
  const setMiddleMode = useUIStore((state) => state.setEchoMiddleMode);
  const moveEntry = useMoveEntry({
    onEntryGone: removeEntry,
    onTargetsStale: reloadPickerGoals,
  });
  const editEntry = useEditEntry({ onEntryGone: removeEntry });

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<EchoFilterScope>(ALL_SCOPE);
  const [detailMode, setDetailMode] = useState<'empty' | 'view' | 'add' | 'edit'>('empty');
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [createFolderError, setCreateFolderError] = useState<string | null>(null);

  const selectedEntry = selectedEntryId
    ? entries.find((entry) => entry.id === selectedEntryId) ?? null
    : null;
  const listGroupBy = selectedScope.type === 'all' ? 'date' : 'none';
  const visibleEntries = useMemo(() => {
    if (selectedScope.type === 'all') return entries;
    if (selectedScope.type === 'goal') {
      return entries.filter((entry) => entry.goalId === selectedScope.id);
    }
    return entries.filter((entry) => entry.folderId === selectedScope.id);
  }, [entries, selectedScope]);

  const clampRightPaneWidth = useCallback(
    (width: number) => {
      const windowWidth = Dimensions.get('window').width;
      const sidebarWidth = sidebarCollapsed ? 76 : 220;
      const maxWidth = Math.max(
        RIGHT_PANE_MIN_WIDTH,
        windowWidth - sidebarWidth - MIDDLE_COLUMN_MIN_WIDTH,
      );
      return Math.max(RIGHT_PANE_MIN_WIDTH, Math.min(width, maxWidth));
    },
    [sidebarCollapsed],
  );

  const handleResizeRightPane = useCallback(
    (width: number) => {
      setRightPaneWidth(clampRightPaneWidth(width));
    },
    [clampRightPaneWidth, setRightPaneWidth],
  );

  function handleScopeChange(scope: EchoFilterScope) {
    setSelectedScope(scope);
    setSelectedEntryId(null);
    setDetailMode('empty');
  }

  function handleAddEntry() {
    setSelectedEntryId(null);
    setDetailMode('add');
  }

  function handleOpenCreateFolder() {
    setCreateFolderError(null);
    setCreateFolderOpen(true);
  }

  function handleCloseCreateFolder() {
    if (isCreatingFolder) return;
    setCreateFolderOpen(false);
    setCreateFolderError(null);
  }

  async function handleCreateFolder(name: string) {
    if (isCreatingFolder) return;

    setIsCreatingFolder(true);
    setCreateFolderError(null);
    try {
      const folder = await createFolder(name);
      setSelectedScope({ type: 'folder', id: folder.id, label: folder.name });
      setSelectedEntryId(null);
      setDetailMode('empty');
      setCreateFolderOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create folder. Please try again.';
      setCreateFolderError(message);
    } finally {
      setIsCreatingFolder(false);
    }
  }

  function handleSelectEntry(entryId: string) {
    setSelectedEntryId(entryId);
    setDetailMode('view');
  }

  async function handleDeleteEntry(entryId: string) {
    const confirmed = window.confirm('Delete entry? This cannot be undone.');
    if (!confirmed) return;

    try {
      await deleteEntry(entryId);
      if (selectedEntryId === entryId) {
        setSelectedEntryId(null);
        setDetailMode('empty');
      }
    } catch {
      Alert.alert('Could not delete entry', 'Please try again.');
    }
  }

  function handleEditEntry(entry: EchoEntry) {
    setSelectedEntryId(entry.id);
    editEntry.open(entry);
    setDetailMode('edit');
  }

  // Save success, entry-vanished (404), and Cancel all resolve to
  // editEntry.activeEntry going back to null — react to that instead of
  // threading a distinct completion signal out of the hook.
  useEffect(() => {
    if (detailMode === 'edit' && editEntry.activeEntry === null) {
      setDetailMode(selectedEntry ? 'view' : 'empty');
    }
  }, [detailMode, editEntry.activeEntry, selectedEntry]);

  function handleComposerSaved(entry: EchoEntry | undefined) {
    if (!entry) {
      setSelectedEntryId(null);
      setDetailMode('empty');
      return;
    }

    setSelectedEntryId(entry.id);
    setDetailMode('view');
  }

  const renderedRightPaneWidth = clampRightPaneWidth(rightPaneWidth);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: LIGHT_THEME.background.page }}>
      <View className="flex-1 flex-row">
        <View className="min-w-[220px] flex-1">
          <View className="px-3 pb-3 pt-4">
            <TouchableOpacity
              onPress={handleAddEntry}
              className="items-center rounded-[10px] py-3"
              style={{ backgroundColor: LIGHT_THEME.background.sidebar }}
              activeOpacity={0.82}
            >
              <Typography variant="echo-add-button">+ Add an entry</Typography>
            </TouchableOpacity>

            <View className="mt-3 flex-row items-center justify-between gap-2">
              <View className="min-w-0 flex-1 flex-row items-center gap-2">
                <EchoFilterPill
                  options={containerOptions}
                  selectedScope={selectedScope}
                  onSelectScope={handleScopeChange}
                />
                <Pressable
                  onPress={handleOpenCreateFolder}
                  accessibilityRole="button"
                  accessibilityLabel="Create Echo folder"
                  hitSlop={6}
                  style={{
                    alignItems: 'center',
                    borderColor: LIGHT_THEME.border.input,
                    borderRadius: 8,
                    borderWidth: 1,
                    height: 30,
                    justifyContent: 'center',
                    flexShrink: 0,
                    width: 30,
                  }}
                >
                  <Ionicons name="add" size={17} color={LIGHT_THEME.text.secondary} />
                </Pressable>
              </View>

              <Pressable
                onPress={() => setMiddleMode(middleMode === 'list' ? 'tree' : 'list')}
                accessibilityRole="button"
                accessibilityLabel={middleMode === 'list' ? 'Show folder tree' : 'Show entry list'}
                style={{
                  alignItems: 'center',
                  borderColor: LIGHT_THEME.border.input,
                  borderRadius: 8,
                  borderWidth: 1,
                  height: 30,
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: 30,
                }}
              >
                <Ionicons
                  name={middleMode === 'list' ? 'git-branch-outline' : 'calendar-outline'}
                  size={16}
                  color={LIGHT_THEME.text.secondary}
                />
              </Pressable>
            </View>
          </View>

          {middleMode === 'tree' ? (
            <EchoContainerTree
              entries={entries}
              goals={pickerGoals}
              folders={pickerFolders}
              selectedScope={selectedScope}
              selectedEntryId={selectedEntryId}
              onSelectScope={handleScopeChange}
              onSelectEntry={handleSelectEntry}
            />
          ) : (
            <EchoEntryList
              entries={visibleEntries}
              isLoading={isLoading}
              groupBy={listGroupBy}
              scopeId={selectedScope.type === 'all' ? undefined : selectedScope.id}
              selectedEntryId={selectedEntryId}
              onSelectEntry={handleSelectEntry}
              onEditEntry={handleEditEntry}
              onMoveEntry={moveEntry.open}
              onDeleteEntry={handleDeleteEntry}
            />
          )}
        </View>

        <View
          className="relative"
          style={{
            backgroundColor: LIGHT_THEME.background.page,
            width: renderedRightPaneWidth,
          }}
        >
          <EchoPaneResizer
            width={rightPaneWidth}
            onResize={handleResizeRightPane}
          />
          <EchoDetailPane
            mode={detailMode}
            entry={selectedEntry}
            goals={pickerGoals}
            initialGoalId={routeGoalId ?? null}
            saveEntry={saveEntry}
            onCancelAdd={() => setDetailMode(selectedEntry ? 'view' : 'empty')}
            onSaved={handleComposerSaved}
            editIsSaving={editEntry.isSaving}
            editError={editEntry.error}
            onSaveEdit={editEntry.save}
            onCancelEdit={editEntry.close}
          />
        </View>
      </View>

      <MoveEntryModal
        visible={moveEntry.activeEntryId !== null}
        isLoading={moveEntry.isLoading}
        isSaving={moveEntry.isSaving}
        error={moveEntry.error}
        goals={pickerGoals}
        folders={moveEntry.folders}
        currentContainer={moveEntry.currentContainer}
        onClose={moveEntry.close}
        onConfirm={moveEntry.confirm}
      />

      <CreateFolderModal
        visible={createFolderOpen}
        isSaving={isCreatingFolder}
        error={createFolderError}
        onClose={handleCloseCreateFolder}
        onCreate={handleCreateFolder}
      />
    </SafeAreaView>
  );
}
