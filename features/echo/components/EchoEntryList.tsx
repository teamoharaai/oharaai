import { ScrollView, Text, View } from 'react-native';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { LIGHT_THEME } from '@/constants/colors';
import { EchoEntryRow } from './EchoEntryRow';
import type { EchoEntry } from '../types';

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

function formatEntryDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

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

function getContainerCaption(entry: EchoEntry): string {
  return entry.folderName || entry.goalTitle || 'Unassigned';
}

function EchoLoadingState() {
  return (
    <View className="gap-3 py-2">
      {[0, 1, 2].map((item) => (
        <View key={item} className="rounded-xl bg-white p-4 shadow-sm">
          <View className="mb-3 h-3.5 rounded-full bg-[#EAE7E0]" />
          <View className="mb-2 h-3.5 w-[83%] rounded-full bg-[#EAE7E0]" />
          <View className="mb-4 h-3.5 w-[66%] rounded-full bg-[#EAE7E0]" />
          <View className="h-3 w-20 rounded-full bg-[#EAE7E0]" />
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
  void scopeId;

  if (isLoading) {
    return (
      <View className="flex-1 px-3" style={{ backgroundColor: LIGHT_THEME.background.page }}>
        <EchoLoadingState />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View className="flex-1 justify-center px-3">
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
      className="flex-1"
      style={{ backgroundColor: LIGHT_THEME.background.page }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 24,
          paddingTop: 4,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {groups.map((group) => (
          <View key={group.key}>
            {groupBy === 'date' ? (
              <Text
                className="mb-1.5 px-3 pt-3 font-sans"
                style={{
                  color: LIGHT_THEME.text.secondary,
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
