import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { GOAL_CATEGORY_CATALOG, normalizeGoalCategoryForEntries } from '@/lib/goals/catalog';
import { getCategoryAccentTheme } from '@/constants/themes';
import { useThemeColors } from '@/store/uiStore';
import type { EntryGoalOption } from '../types';
import type { GoalCreationCategory } from '@/lib/goals/schema';

export function EntryLinkPicker({
  goals,
  visible,
  selectedGoalIds,
  selectedCategoryIds,
  onClose,
  onApply,
}: {
  goals: EntryGoalOption[];
  visible: boolean;
  selectedGoalIds: string[];
  selectedCategoryIds: GoalCreationCategory[];
  onClose: () => void;
  onApply: (goalIds: string[], categoryIds: GoalCreationCategory[]) => void;
}) {
  const colors = useThemeColors();
  const [query, setQuery] = useState('');
  const [goalIds, setGoalIds] = useState(selectedGoalIds);
  const [categoryIds, setCategoryIds] = useState(selectedCategoryIds);
  const availableGoals = useMemo(() => goals.filter((goal) => (
    goal.status !== 'archived'
    && goal.title.toLowerCase().includes(query.trim().toLowerCase())
  )), [goals, query]);

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
        onApply(goalIds, categoryIds);
        onClose();
      }}
      contentStyle={{ maxHeight: '82%', maxWidth: 560 }}
    >
      <Typography variant="title">Link this entry</Typography>
      <Typography variant="body" style={{ marginTop: 6 }}>
        Specific goals provide the strongest context. Category-only links remain available.
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
            fontFamily: 'Inter-Regular',
            minHeight: 44,
            outlineStyle: 'solid',
            outlineWidth: 0,
          }}
          value={query}
        />
      </View>
      <ScrollView style={{ marginTop: 14, maxHeight: 390 }}>
        <Typography variant="eyebrow" style={{ marginBottom: 8 }}>SPECIFIC GOALS</Typography>
        {availableGoals.length ? availableGoals.map((goal) => {
          const selected = goalIds.includes(goal.id);
          const category = normalizeGoalCategoryForEntries(goal.category);
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
        }) : (
          <Typography variant="caption" style={{ paddingVertical: 12 }}>
            No accessible goals match your search.
          </Typography>
        )}

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
