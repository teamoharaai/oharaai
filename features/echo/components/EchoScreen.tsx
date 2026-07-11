import { useState } from 'react';
import { Alert, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { LIGHT_THEME } from '@/constants/colors';
import { useEditEntry } from '../hooks/useEditEntry';
import { useEntries } from '../hooks/useEntries';
import { useMoveEntry } from '../hooks/useMoveEntry';
import { useEchoStore } from '../store';
import { EditEntryModal } from './EditEntryModal';
import { EchoEntryList } from './EchoEntryList';
import { EchoFilterPill, type EchoFilterScope } from './EchoFilterPill';
import { MoveEntryModal } from './MoveEntryModal';
import type { EchoEntry } from '../types';

const ALL_SCOPE: EchoFilterScope = { type: 'all', id: 'all', label: 'All' };

export function EchoScreen() {
  const { entries, isLoading, pickerGoals, containerOptions, reloadPickerGoals } = useEntries();
  const removeEntry = useEchoStore((state) => state.removeEntry);
  const deleteEntry = useEchoStore((state) => state.deleteEntry);
  const moveEntry = useMoveEntry({
    onEntryGone: removeEntry,
    onTargetsStale: reloadPickerGoals,
  });
  const editEntry = useEditEntry({ onEntryGone: removeEntry });

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<EchoFilterScope>(ALL_SCOPE);

  function handleScopeChange(scope: EchoFilterScope) {
    setSelectedScope(scope);
    setSelectedEntryId(null);
  }

  async function handleDeleteEntry(entryId: string) {
    const confirmed = window.confirm('Delete entry? This cannot be undone.');
    if (!confirmed) return;

    try {
      await deleteEntry(entryId);
      if (selectedEntryId === entryId) setSelectedEntryId(null);
    } catch {
      Alert.alert('Could not delete entry', 'Please try again.');
    }
  }

  function handleEditEntry(entry: EchoEntry) {
    editEntry.open(entry);
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: LIGHT_THEME.background.page }}>
      <View className="flex-1 flex-row">
        <View
          className="min-w-[280px] flex-1 bg-white"
          style={{ borderRightColor: LIGHT_THEME.border.divider, borderRightWidth: 1 }}
        >
          <View className="px-3 pb-3 pt-4">
            <TouchableOpacity
              onPress={() => setSelectedEntryId(null)}
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
            entries={entries}
            isLoading={isLoading}
            groupBy="date"
            selectedEntryId={selectedEntryId}
            onSelectEntry={setSelectedEntryId}
            onEditEntry={handleEditEntry}
            onMoveEntry={moveEntry.open}
            onDeleteEntry={handleDeleteEntry}
          />
        </View>

        <View
          className="w-[420px] items-center justify-center px-8"
          style={{ backgroundColor: LIGHT_THEME.background.page }}
        >
          <Text
            className="font-sans"
            style={{
              color: LIGHT_THEME.text.primary,
              fontFamily: 'Inter-Bold',
              fontSize: 16,
              lineHeight: 22,
            }}
          >
            Select an entry
          </Text>
          <Text
            className="mt-2 text-center font-sans"
            style={{ color: LIGHT_THEME.text.secondary, fontSize: 13.5, lineHeight: 20 }}
          >
            Choose an Echo from the list, or add a new reflection.
          </Text>
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
