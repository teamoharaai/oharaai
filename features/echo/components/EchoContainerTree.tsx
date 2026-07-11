import { useMemo, useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LIGHT_THEME } from '@/constants/colors';
import type { EchoFolder } from '@/types/echo-folder';
import type { EchoEntry, EchoGoalOption } from '../types';
import { useContainerGrouping } from '../hooks/useContainerGrouping';
import type { EchoFilterScope } from './EchoFilterPill';

type EchoContainerTreeProps = {
  entries: EchoEntry[];
  goals: EchoGoalOption[];
  folders: EchoFolder[];
  selectedScope: EchoFilterScope;
  selectedEntryId: string | null;
  onSelectScope: (scope: EchoFilterScope) => void;
  onSelectEntry: (id: string) => void;
};

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      className="px-3 pb-2 pt-4 font-sans"
      style={{
        color: LIGHT_THEME.text.secondary,
        fontFamily: 'Inter-Bold',
        fontSize: 10.5,
        letterSpacing: 0.63,
        lineHeight: 14,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Text>
  );
}

function SelectionDot({ selected }: { selected: boolean }) {
  return (
    <View
      className="h-[7px] w-[7px] rounded-full"
      style={{ backgroundColor: selected ? LIGHT_THEME.background.sidebar : LIGHT_THEME.text.muted }}
    />
  );
}

function getEntryTitle(entry: EchoEntry): string {
  const title = entry.title?.trim();
  if (title) return title;

  const firstLine = entry.content.split('\n').find((line) => line.trim().length > 0)?.trim();
  return firstLine || 'Untitled Echo';
}

export function EchoContainerTree({
  entries,
  goals,
  folders,
  selectedScope,
  selectedEntryId,
  onSelectScope,
  onSelectEntry,
}: EchoContainerTreeProps) {
  const { goalGroups } = useContainerGrouping(goals, folders);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(() => new Set());
  const entriesByFolderId = useMemo(() => {
    const groupedEntries = new Map<string, EchoEntry[]>();
    for (const entry of entries) {
      if (!entry.folderId) continue;
      const folderEntries = groupedEntries.get(entry.folderId);
      if (folderEntries) {
        folderEntries.push(entry);
      } else {
        groupedEntries.set(entry.folderId, [entry]);
      }
    }
    return groupedEntries;
  }, [entries]);
  const entriesByGoalId = useMemo(() => {
    const groupedEntries = new Map<string, EchoEntry[]>();
    for (const entry of entries) {
      if (!entry.goalId) continue;
      const goalEntries = groupedEntries.get(entry.goalId);
      if (goalEntries) {
        goalEntries.push(entry);
      } else {
        groupedEntries.set(entry.goalId, [entry]);
      }
    }
    return groupedEntries;
  }, [entries]);

  function toggleFolderEntries(folderId: string) {
    setExpandedFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }

  function toggleGoalEntries(goalId: string) {
    setExpandedGoalIds((current) => {
      const next = new Set(current);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  }

  return (
    <View className="flex-1" style={{ backgroundColor: LIGHT_THEME.background.page }}>
      <View
        className="mx-3 border-b pb-2 pt-1"
        style={{ borderBottomColor: LIGHT_THEME.border.divider }}
      >
        <Text
          className="font-sans"
          style={{
            color: LIGHT_THEME.text.secondary,
            fontFamily: 'Inter-Bold',
            fontSize: 10.5,
            letterSpacing: 0.63,
            lineHeight: 14,
            textTransform: 'uppercase',
          }}
        >
          Folders & Goals
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <SectionLabel>Echo Folders</SectionLabel>
        {folders.map((folder) => {
          const selected = selectedScope.type === 'folder' && selectedScope.id === folder.id;
          const folderEntries = entriesByFolderId.get(folder.id) ?? [];
          const hasEntries = folderEntries.length > 0;
          const expanded = expandedFolderIds.has(folder.id);
          return (
            <View key={folder.id}>
              <View
                className="mx-2 flex-row items-center rounded-lg px-1"
                style={{
                  backgroundColor: selected ? LIGHT_THEME.background.selectedRow : 'transparent',
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={expanded ? `Hide entries for ${folder.name}` : `Show entries for ${folder.name}`}
                  disabled={!hasEntries}
                  hitSlop={6}
                  onPress={() => toggleFolderEntries(folder.id)}
                  style={{
                    alignItems: 'center',
                    height: 30,
                    justifyContent: 'center',
                    opacity: hasEntries ? 1 : 0,
                    width: 20,
                  }}
                >
                  <Ionicons
                    name={expanded ? 'chevron-down' : 'chevron-forward'}
                    size={13}
                    color={LIGHT_THEME.text.muted}
                  />
                </Pressable>

                <Pressable
                  onPress={() => onSelectScope({ type: 'folder', id: folder.id, label: folder.name })}
                  className="min-w-0 flex-1 flex-row items-center gap-2 py-3 pr-3"
                >
                  <SelectionDot selected={selected} />
                  <Text
                    numberOfLines={1}
                    className="min-w-0 flex-1 font-sans"
                    style={{
                      color: LIGHT_THEME.text.primary,
                      fontFamily: selected ? 'Inter-Bold' : 'Inter-Medium',
                      fontSize: 13.5,
                      lineHeight: 18,
                    }}
                  >
                    {folder.name}
                  </Text>
                </Pressable>
              </View>

              {expanded ? (
                <View className="pb-0.5">
                  {folderEntries.map((entry) => {
                    const entrySelected = selectedEntryId === entry.id;
                    return (
                      <Pressable
                        key={entry.id}
                        onPress={() => onSelectEntry(entry.id)}
                        className="mx-2 ml-9 flex-row items-center gap-2 rounded-lg px-3 py-2"
                        style={{
                          backgroundColor: entrySelected
                            ? LIGHT_THEME.background.selectedRow
                            : 'transparent',
                        }}
                      >
                        <View
                          className="h-[5px] w-[5px] rounded-full"
                          style={{ backgroundColor: LIGHT_THEME.text.muted }}
                        />
                        <Text
                          numberOfLines={1}
                          className="min-w-0 flex-1 font-sans"
                          style={{
                            color: LIGHT_THEME.text.primary,
                            fontFamily: entrySelected ? 'Inter-Bold' : 'Inter-Regular',
                            fontSize: 12.5,
                            lineHeight: 17,
                          }}
                        >
                          {getEntryTitle(entry)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}

        <SectionLabel>Goals</SectionLabel>
        {goalGroups.map((group) => (
          <View key={group.key} className="pb-1">
            <Text
              numberOfLines={1}
              className="px-3 pb-1.5 pt-2 font-sans"
              style={{
                color: LIGHT_THEME.text.primary,
                fontFamily: 'Inter-Bold',
                fontSize: 13.5,
                lineHeight: 18,
              }}
            >
              {group.label}
            </Text>
            {group.goals.map((goal) => {
              const selected = selectedScope.type === 'goal' && selectedScope.id === goal.id;
              const goalEntries = entriesByGoalId.get(goal.id) ?? [];
              const hasEntries = goalEntries.length > 0;
              const expanded = expandedGoalIds.has(goal.id);
              return (
                <View key={goal.id}>
                  <View
                    className="mx-2 ml-7 flex-row items-center rounded-lg px-1"
                    style={{
                      backgroundColor: selected ? LIGHT_THEME.background.selectedRow : 'transparent',
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={expanded ? `Hide entries for ${goal.title}` : `Show entries for ${goal.title}`}
                      disabled={!hasEntries}
                      hitSlop={6}
                      onPress={() => toggleGoalEntries(goal.id)}
                      style={{
                        alignItems: 'center',
                        height: 28,
                        justifyContent: 'center',
                        opacity: hasEntries ? 1 : 0,
                        width: 20,
                      }}
                    >
                      <Ionicons
                        name={expanded ? 'chevron-down' : 'chevron-forward'}
                        size={13}
                        color={LIGHT_THEME.text.muted}
                      />
                    </Pressable>

                    <Pressable
                      onPress={() => onSelectScope({ type: 'goal', id: goal.id, label: goal.title })}
                      className="min-w-0 flex-1 flex-row items-center gap-2 py-2.5 pr-3"
                    >
                      <SelectionDot selected={selected} />
                      <Text
                        numberOfLines={1}
                        className="min-w-0 flex-1 font-sans"
                        style={{
                          color: LIGHT_THEME.text.primary,
                          fontFamily: selected ? 'Inter-Bold' : 'Inter-Regular',
                          fontSize: 13,
                          lineHeight: 18,
                        }}
                      >
                        {goal.title}
                      </Text>
                    </Pressable>
                  </View>

                  {expanded ? (
                    <View className="pb-0.5">
                      {goalEntries.map((entry) => {
                        const entrySelected = selectedEntryId === entry.id;
                        return (
                          <Pressable
                            key={entry.id}
                            onPress={() => onSelectEntry(entry.id)}
                            className="mx-2 ml-14 flex-row items-center gap-2 rounded-lg px-3 py-2"
                            style={{
                              backgroundColor: entrySelected
                                ? LIGHT_THEME.background.selectedRow
                                : 'transparent',
                            }}
                          >
                            <View
                              className="h-[5px] w-[5px] rounded-full"
                              style={{ backgroundColor: LIGHT_THEME.text.muted }}
                            />
                            <Text
                              numberOfLines={1}
                              className="min-w-0 flex-1 font-sans"
                              style={{
                                color: LIGHT_THEME.text.primary,
                                fontFamily: entrySelected ? 'Inter-Bold' : 'Inter-Regular',
                                fontSize: 12.5,
                                lineHeight: 17,
                              }}
                            >
                              {getEntryTitle(entry)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
