import { ScrollView, Text, View, Pressable } from 'react-native';
import { LIGHT_THEME } from '@/constants/colors';
import type { EchoFolder } from '@/types/echo-folder';
import type { EchoGoalOption } from '../types';
import type { EchoFilterScope } from './EchoFilterPill';

type EchoContainerTreeProps = {
  goals: EchoGoalOption[];
  folders: EchoFolder[];
  selectedScope: EchoFilterScope;
  onSelectScope: (scope: EchoFilterScope) => void;
};

type GoalGroup = {
  key: string;
  label: string;
  goals: EchoGoalOption[];
};

function groupGoalsByProject(goals: EchoGoalOption[]): GoalGroup[] {
  const groups: GoalGroup[] = [];
  const groupByKey = new Map<string, GoalGroup>();
  const ungrouped: EchoGoalOption[] = [];

  for (const goal of goals) {
    if (!goal.projectId) {
      ungrouped.push(goal);
      continue;
    }

    const existing = groupByKey.get(goal.projectId);
    if (existing) {
      existing.goals.push(goal);
      continue;
    }

    const group = {
      key: goal.projectId,
      label: goal.projectTitle || 'Untitled Project',
      goals: [goal],
    };
    groupByKey.set(goal.projectId, group);
    groups.push(group);
  }

  if (ungrouped.length > 0) {
    groups.push({ key: 'ungrouped', label: 'Ungrouped', goals: ungrouped });
  }

  return groups;
}

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

export function EchoContainerTree({
  goals,
  folders,
  selectedScope,
  onSelectScope,
}: EchoContainerTreeProps) {
  const goalGroups = groupGoalsByProject(goals);

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
          return (
            <Pressable
              key={folder.id}
              onPress={() => onSelectScope({ type: 'folder', id: folder.id, label: folder.name })}
              className="mx-2 flex-row items-center gap-2 rounded-lg px-3 py-3"
              style={{ backgroundColor: selected ? LIGHT_THEME.background.selectedRow : 'transparent' }}
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
              return (
                <Pressable
                  key={goal.id}
                  onPress={() => onSelectScope({ type: 'goal', id: goal.id, label: goal.title })}
                  className="mx-2 ml-7 flex-row items-center gap-2 rounded-lg px-3 py-2.5"
                  style={{
                    backgroundColor: selected ? LIGHT_THEME.background.selectedRow : 'transparent',
                  }}
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
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
