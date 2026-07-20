import { ScrollView, Text, View } from 'react-native';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { useThemeColors } from '@/store/uiStore';
import { EchoEntryRow } from './EchoEntryRow';
import type { EchoEntry } from '../types';
import { formatEntryDate, getContainerCaption } from '../utils/entryDisplay';

type EchoEntryListProps = {
  entries: EchoEntry[];
  isLoading: boolean;
  groupBy: 'date' | 'none';
  scopeId?: string;
  selectedEntryId: string | null;
  onSelectEntry: (id: string) => void;
  onEditEntry: (entry: EchoEntry) => void;
  onMoveEntry: (entryId: string) => void;
  onDeleteEntry: (entryId: string) => void;
};

type EntryGroup = {
  key: string;
  label: string;
  entries: EchoEntry[];
};

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function getSectionLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const key = getDateKey(date);
  if (key === getDateKey(today)) return 'TODAY';
  if (key === getDateKey(yesterday)) return 'YESTERDAY';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function groupEntriesByDate(entries: EchoEntry[]): EntryGroup[] {
  const groups: EntryGroup[] = [];
  const groupByKey = new Map<string, EntryGroup>();

  for (const entry of entries) {
    const key = getDateKey(entry.createdAt);
    const existing = groupByKey.get(key);
    if (existing) {
      existing.entries.push(entry);
      continue;
    }

    const group = { key, label: getSectionLabel(entry.createdAt), entries: [entry] };
    groupByKey.set(key, group);
    groups.push(group);
  }

  return groups;
}

function EchoLoadingState() {
  const colors = useThemeColors();

  return (
    <View className="gap-3 py-2">
      {[0, 1, 2].map((item) => (
        <View
          key={item}
          className="rounded-xl p-4 shadow-sm"
          style={{ backgroundColor: colors.background.card }}
        >
          <View className="mb-3 h-3.5 rounded-full" style={{ backgroundColor: colors.background.subtle }} />
          <View className="mb-2 h-3.5 w-[83%] rounded-full" style={{ backgroundColor: colors.background.subtle }} />
          <View className="mb-4 h-3.5 w-[66%] rounded-full" style={{ backgroundColor: colors.background.subtle }} />
          <View className="h-3 w-20 rounded-full" style={{ backgroundColor: colors.background.subtle }} />
        </View>
      ))}
    </View>
  );
}

export function EchoEntryList({
  entries,
  isLoading,
  groupBy,
  scopeId,
  selectedEntryId,
  onSelectEntry,
  onEditEntry,
  onMoveEntry,
  onDeleteEntry,
}: EchoEntryListProps) {
  const colors = useThemeColors();
  void scopeId;

  if (isLoading) {
    return (
      <View
        className="px-3"
        style={{
          backgroundColor: colors.background.page,
          flex: 1,
          minHeight: 0,
        }}
      >
        <EchoLoadingState />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View
        className="justify-center px-3"
        style={{
          backgroundColor: colors.background.page,
          flex: 1,
          minHeight: 0,
        }}
      >
        <EmptyStateCard
          title={groupBy === 'none' ? 'No entries here yet.' : 'No Echo entries yet.'}
          description={
            groupBy === 'none'
              ? 'This container does not have any Echo entries yet.'
              : 'Add a reflection to start building your Echo.'
          }
        />
      </View>
    );
  }

  const groups = groupBy === 'date'
    ? groupEntriesByDate(entries)
    : [{ key: 'all', label: '', entries }];

  return (
    <View
      style={{
        backgroundColor: colors.background.page,
        flex: 1,
        minHeight: 0,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 24,
          paddingTop: 4,
        }}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, minHeight: 0 }}
      >
        {groups.map((group) => (
          <View key={group.key}>
            {groupBy === 'date' ? (
              <Text
                className="mb-1.5 px-3 pt-3 font-sans"
                style={{
                  color: '#8A8172',
                  fontFamily: 'Inter-Bold',
                  fontSize: 10.5,
                  letterSpacing: 0.63,
                  lineHeight: 14,
                }}
              >
                {group.label}
              </Text>
            ) : null}
            {group.entries.map((entry) => (
              <EchoEntryRow
                key={entry.id}
                entry={entry}
                caption={groupBy === 'date' ? getContainerCaption(entry) : formatEntryDate(entry.createdAt)}
                selected={entry.id === selectedEntryId}
                showSnippet={groupBy === 'date'}
                onSelect={() => onSelectEntry(entry.id)}
                onEdit={() => onEditEntry(entry)}
                onMoveToFolder={() => onMoveEntry(entry.id)}
                onDelete={() => onDeleteEntry(entry.id)}
              />
            ))}
          </View>
        ))}
        <View className="flex-1" />
      </ScrollView>
    </View>
  );
}
