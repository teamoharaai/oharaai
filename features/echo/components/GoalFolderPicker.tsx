import { ScrollView, Text, View, Pressable } from 'react-native';
import { LIGHT_THEME } from '@/constants/colors';
import type { EchoFolder } from '@/types/echo-folder';
import type { EchoGoalOption } from '../types';

export type GoalFolderPickerValue = {
  type: 'goal' | 'folder';
  id: string;
  displayName: string;
};

type GoalFolderPickerProps = {
  goals: EchoGoalOption[];
  folders: EchoFolder[];
  selected: { type: 'goal' | 'folder'; id: string } | null;
  disabled?: boolean;
  maxHeight?: number;
  showFolders?: boolean;
  onSelect: (value: GoalFolderPickerValue) => void;
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

    const key = goal.projectId;
    const existing = groupByKey.get(key);
    if (existing) {
      existing.goals.push(goal);
      continue;
    }

    const group = {
      key,
      label: goal.projectTitle || 'Untitled Project',
      goals: [goal],
    };
    groupByKey.set(key, group);
    groups.push(group);
  }

  if (ungrouped.length > 0) {
    groups.push({ key: 'ungrouped', label: 'Ungrouped', goals: ungrouped });
  }

  return groups;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text
      className="px-4 pb-2 pt-4 font-sans"
      style={{
        color: LIGHT_THEME.text.secondary,
        fontFamily: 'Inter-Bold',
        fontSize: 10.5,
        letterSpacing: 0.63,
        lineHeight: 14,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Text>
  );
}

function ProjectHeader({ label }: { label: string }) {
  return (
    <Text
      className="px-4 pb-1.5 pt-2 font-sans"
      style={{
        color: LIGHT_THEME.text.primary,
        fontFamily: 'Inter-Bold',
        fontSize: 13,
        lineHeight: 18,
      }}
    >
      {label}
    </Text>
  );
}

export function GoalFolderPicker({
  goals,
  folders,
  selected,
  disabled = false,
  maxHeight,
  showFolders = true,
  onSelect,
}: GoalFolderPickerProps) {
  const goalGroups = groupGoalsByProject(goals);
  const visibleFolders = showFolders ? folders : [];
  const hasTargets = goals.length > 0 || visibleFolders.length > 0;

  if (!hasTargets) {
    return (
      <Text className="px-4 py-4 font-sans text-sm" style={{ color: LIGHT_THEME.text.secondary }}>
        No goals or folders yet.
      </Text>
    );
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <SectionHeader label="Goals" />
      {goalGroups.length === 0 ? (
        <Text className="px-4 py-2 font-sans text-sm" style={{ color: LIGHT_THEME.text.secondary }}>
          No goals yet.
        </Text>
      ) : (
        goalGroups.map((group) => (
          <View key={group.key}>
            <ProjectHeader label={group.label} />
            {group.goals.map((goal) => {
              const isSelected = selected?.type === 'goal' && selected.id === goal.id;
              return (
                <Pressable
                  key={goal.id}
                  disabled={disabled}
                  onPress={() => onSelect({ type: 'goal', id: goal.id, displayName: goal.title })}
                  className="mx-2 rounded-lg px-4 py-3"
                  style={{
                    backgroundColor: isSelected ? LIGHT_THEME.background.selectedRow : 'transparent',
                    opacity: disabled ? 0.45 : 1,
                  }}
                >
                  <Text
                    className="font-sans"
                    style={{
                      color: LIGHT_THEME.text.primary,
                      fontFamily: isSelected ? 'Inter-Bold' : 'Inter-Regular',
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
        ))
      )}

      {showFolders ? (
        <>
          <SectionHeader label="Echo Folders" />
          {visibleFolders.map((folder) => {
            const isSelected = selected?.type === 'folder' && selected.id === folder.id;
            return (
              <Pressable
                key={folder.id}
                disabled={disabled}
                onPress={() => onSelect({ type: 'folder', id: folder.id, displayName: folder.name })}
                className="mx-2 rounded-lg px-4 py-3"
                style={{
                  backgroundColor: isSelected ? LIGHT_THEME.background.selectedRow : 'transparent',
                  opacity: disabled ? 0.45 : 1,
                }}
              >
                <Text
                  className="font-sans"
                  style={{
                    color: LIGHT_THEME.text.primary,
                    fontFamily: isSelected ? 'Inter-Bold' : 'Inter-Regular',
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                >
                  {folder.name}
                </Text>
              </Pressable>
            );
          })}
        </>
      ) : null}
    </ScrollView>
  );
}
