import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { GOAL_CATEGORY_CATALOG, normalizeGoalCategoryForEntries } from '@/lib/goals/catalog';
import { getCategoryAccentTheme } from '@/constants/themes';
import { TYPE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { EntryGoalOption } from '../types';
import type { GoalCreationCategory } from '@/lib/goals/schema';
import type { Project } from '@/features/projects/types';

export function EntryLinkPicker({
  goals,
  projects,
  visible,
  selectedGoalIds,
  selectedCategoryIds,
  selectedProjectId,
  onClose,
  onApply,
}: {
  goals: EntryGoalOption[];
  projects: Project[];
  visible: boolean;
  selectedGoalIds: string[];
  selectedCategoryIds: GoalCreationCategory[];
  selectedProjectId: string | null;
  onClose: () => void;
  onApply: (
    goalIds: string[],
    categoryIds: GoalCreationCategory[],
    projectId: string | null,
  ) => void;
}) {
  const colors = useThemeColors();
  const [query, setQuery] = useState('');
  const [goalIds, setGoalIds] = useState(selectedGoalIds);
  const [categoryIds, setCategoryIds] = useState(selectedCategoryIds);
  const [projectId, setProjectId] = useState<string | null>(selectedProjectId);
  const availableGoals = useMemo(() => goals.filter((goal) => (
    goal.status === 'active'
    && goal.title.toLowerCase().includes(query.trim().toLowerCase())
  )), [goals, query]);
  const selectedHistoricalGoals = useMemo(() => goals.filter((goal) => (
    goal.status !== 'active'
    && goalIds.includes(goal.id)
    && goal.title.toLowerCase().includes(query.trim().toLowerCase())
  )), [goalIds, goals, query]);

  useEffect(() => {
    if (!visible) return;
    setGoalIds(selectedGoalIds);
    setCategoryIds(selectedCategoryIds);
    setProjectId(selectedProjectId);
    setQuery('');
  }, [selectedCategoryIds, selectedGoalIds, selectedProjectId, visible]);

  function toggleGoal(goalId: string) {
    setGoalIds((current) => current.includes(goalId)
      ? current.filter((id) => id !== goalId)
      : [...current, goalId]);
  }

  function toggleCategory(categoryId: GoalCreationCategory) {
    setCategoryIds((current) => current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId]);
  }

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      closeOnBackdropPress
      showCloseButton={false}
      cancelText="Cancel"
      onCancel={onClose}
      confirmText="Apply links"
      onConfirm={() => {
        onApply(goalIds, categoryIds, projectId);
        onClose();
      }}
      contentStyle={{ maxHeight: '82%', maxWidth: 560 }}
    >
      <Typography variant="title">Organize this entry</Typography>
      <Typography variant="body" style={{ marginTop: 6 }}>
        Goal and Project links are optional. The entry remains available in Most Recent.
      </Typography>
      <View
        style={{
          alignItems: 'center',
          borderColor: colors.border.input,
          borderRadius: 12,
          borderWidth: 1,
          flexDirection: 'row',
          gap: 8,
          marginTop: 16,
          paddingHorizontal: 12,
        }}
      >
        <Ionicons name="search-outline" color={colors.text.muted} size={18} />
        <TextInput
          accessibilityLabel="Search goals to link"
          onChangeText={setQuery}
          placeholder="Search your goals"
          placeholderTextColor={colors.text.muted}
          style={{
            color: colors.text.primary,
            flex: 1,
            ...TYPE.bodySmall,
            minHeight: 44,
            outlineStyle: 'solid',
            outlineWidth: 0,
          }}
          value={query}
        />
      </View>
      <ScrollView style={{ marginTop: 14, maxHeight: 390 }}>
        <Typography variant="eyebrow" style={{ marginBottom: 8 }}>SPECIFIC GOALS</Typography>
        {selectedHistoricalGoals.map((goal) => {
          const category = normalizeGoalCategoryForEntries(goal.category, goal.id);
          const accent = getCategoryAccentTheme(category);
          return (
            <Pressable
              accessibilityHint="Removes this historical Goal link"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: true }}
              key={goal.id}
              onPress={() => toggleGoal(goal.id)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: colors.background.subtle,
                borderRadius: 10,
                flexDirection: 'row',
                gap: 10,
                opacity: pressed ? 0.7 : 1,
                padding: 10,
              })}
            >
              <View style={{ backgroundColor: accent.color, borderRadius: 5, height: 10, width: 10 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Typography variant="emphasis-sm" numberOfLines={1}>{goal.title}</Typography>
                <Typography variant="caption">
                  Historical link · {goal.status}
                </Typography>
              </View>
              <Ionicons name="checkmark-circle" color={colors.text.secondary} size={20} />
            </Pressable>
          );
        })}
        {availableGoals.length ? availableGoals.map((goal) => {
          const selected = goalIds.includes(goal.id);
          const category = normalizeGoalCategoryForEntries(goal.category, goal.id);
          const accent = getCategoryAccentTheme(category);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              key={goal.id}
              onPress={() => toggleGoal(goal.id)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: selected ? colors.background.selectedRow : 'transparent',
                borderRadius: 10,
                flexDirection: 'row',
                gap: 10,
                opacity: pressed ? 0.7 : 1,
                padding: 10,
              })}
            >
              <View style={{ backgroundColor: accent.color, borderRadius: 5, height: 10, width: 10 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Typography variant="emphasis-sm" numberOfLines={1}>{goal.title}</Typography>
                <Typography variant="caption">
                  {GOAL_CATEGORY_CATALOG.find((item) => item.id === category)?.label} · {goal.status}
                </Typography>
              </View>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                color={selected ? colors.accent.primary : colors.text.muted}
                size={20}
              />
            </Pressable>
          );
        }) : selectedHistoricalGoals.length === 0 ? (
          <Typography variant="caption" style={{ paddingVertical: 12 }}>
            No accessible goals match your search.
          </Typography>
        ) : null}

        <Typography variant="eyebrow" style={{ marginBottom: 8, marginTop: 18 }}>
          PROJECT
        </Typography>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: projectId === null }}
          onPress={() => setProjectId(null)}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: projectId === null ? colors.background.selectedRow : 'transparent',
            borderRadius: 10,
            flexDirection: 'row',
            gap: 10,
            opacity: pressed ? 0.7 : 1,
            padding: 10,
          })}
        >
          <Ionicons name="remove-circle-outline" color={colors.text.muted} size={20} />
          <Typography variant="emphasis-sm" style={{ flex: 1 }}>No Project</Typography>
          {projectId === null ? <Ionicons name="checkmark" color={colors.text.accent} size={18} /> : null}
        </Pressable>
        {projects.filter((project) => project.status !== 'archived').map((project) => {
          const selected = projectId === project.id;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={project.id}
              onPress={() => setProjectId(project.id)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: selected ? colors.background.selectedRow : 'transparent',
                borderRadius: 10,
                flexDirection: 'row',
                gap: 10,
                opacity: pressed ? 0.7 : 1,
                padding: 10,
              })}
            >
              <Ionicons name="folder-outline" color={colors.text.accent} size={20} />
              <Typography variant="emphasis-sm" numberOfLines={1} style={{ flex: 1 }}>
                {project.title}
              </Typography>
              {selected ? <Ionicons name="checkmark" color={colors.text.accent} size={18} /> : null}
            </Pressable>
          );
        })}

        <Typography variant="eyebrow" style={{ marginBottom: 8, marginTop: 18 }}>
          CATEGORY ONLY
        </Typography>
        {GOAL_CATEGORY_CATALOG.map((category) => {
          const selected = categoryIds.includes(category.id);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              key={category.id}
              onPress={() => toggleCategory(category.id)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: selected ? colors.background.selectedRow : 'transparent',
                borderRadius: 10,
                flexDirection: 'row',
                gap: 10,
                opacity: pressed ? 0.7 : 1,
                padding: 10,
              })}
            >
              <Typography style={{ color: category.accent.mid, width: 22 }}>
                {category.icon}
              </Typography>
              <Typography variant="emphasis-sm" style={{ flex: 1 }}>
                {category.label}
              </Typography>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                color={selected ? colors.accent.primary : colors.text.muted}
                size={20}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </Modal>
  );
}
