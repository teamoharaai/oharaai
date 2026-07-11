import { useCallback, useMemo, useState } from 'react';
import { Alert, Dimensions, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LIGHT_THEME } from '@/constants/colors';
import { useUIStore } from '@/store/uiStore';
import { useEditEntry } from '../hooks/useEditEntry';
import { useEntries } from '../hooks/useEntries';
import { useMoveEntry } from '../hooks/useMoveEntry';
import { useEchoStore } from '../store';
import { EditEntryModal } from './EditEntryModal';
import { EchoDetailPane } from './EchoDetailPane';
import { EchoEntryList } from './EchoEntryList';
import { EchoFilterPill, type EchoFilterScope } from './EchoFilterPill';
import { EchoPaneResizer } from './EchoPaneResizer';
import { MoveEntryModal } from './MoveEntryModal';
import type { EchoEntry } from '../types';

const ALL_SCOPE: EchoFilterScope = { type: 'all', id: 'all', label: 'All' };
const RIGHT_PANE_MIN_WIDTH = 340;
const MIDDLE_COLUMN_MIN_WIDTH = 280;

export function EchoScreen() {
  const { goalId: routeGoalIdParam } = useLocalSearchParams<{ goalId?: string | string[] }>();
  const routeGoalId = Array.isArray(routeGoalIdParam) ? routeGoalIdParam[0] : routeGoalIdParam;
  const {
    entries,
    isLoading,
    pickerGoals,
    containerOptions,
    saveEntry,
    reloadPickerGoals,
  } = useEntries();
  const removeEntry = useEchoStore((state) => state.removeEntry);
  const deleteEntry = useEchoStore((state) => state.deleteEntry);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const rightPaneWidth = useUIStore((state) => state.rightPaneWidth);
  const setRightPaneWidth = useUIStore((state) => state.setRightPaneWidth);
  const moveEntry = useMoveEntry({
    onEntryGone: removeEntry,
    onTargetsStale: reloadPickerGoals,
  });
  const editEntry = useEditEntry({ onEntryGone: removeEntry });

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<EchoFilterScope>(ALL_SCOPE);
  const [detailMode, setDetailMode] = useState<'empty' | 'view' | 'add'>('empty');

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
    editEntry.open(entry);
  }

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
        <View
          className="min-w-[280px] flex-1 bg-white"
          style={{ borderRightColor: LIGHT_THEME.border.divider, borderRightWidth: 1 }}
        >
          <View className="px-3 pb-3 pt-4">
            <TouchableOpacity
              onPress={handleAddEntry}
              className="items-center rounded-[10px] py-3"
              style={{ backgroundColor: LIGHT_THEME.background.sidebar }}
              activeOpacity={0.82}
            >
              <Text
                className="font-sans"
                style={{
                  color: LIGHT_THEME.text.inverse,
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 13.5,
                  lineHeight: 18,
                }}
              >
                + Add an entry
              </Text>
            </TouchableOpacity>

            <View className="mt-3 flex-row items-center">
              <EchoFilterPill
                options={containerOptions}
                selectedScope={selectedScope}
                onSelectScope={handleScopeChange}
              />
            </View>
          </View>

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

      <EditEntryModal
        visible={editEntry.activeEntry !== null}
        entry={editEntry.activeEntry}
        isSaving={editEntry.isSaving}
        error={editEntry.error}
        onClose={editEntry.close}
        onSave={editEntry.save}
      />
    </SafeAreaView>
  );
}
