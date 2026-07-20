import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import type { Project } from '@/features/projects/types';

interface GoalProjectPickerModalProps {
  currentProjectId: string | null;
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (projectId: string | null) => Promise<void>;
  projects: Project[];
  visible: boolean;
}

export function GoalProjectPickerModal({
  currentProjectId,
  error,
  isLoading,
  isSaving,
  onClose,
  onSave,
  projects,
  visible,
}: GoalProjectPickerModalProps) {
  const colors = useThemeColors();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(currentProjectId);

  useEffect(() => {
    if (visible) setSelectedProjectId(currentProjectId);
  }, [currentProjectId, visible]);

  const options: Array<{ id: string | null; title: string; description: string | null }> = [
    {
      id: null,
      title: 'Standalone goal',
      description: 'Keep this goal outside of a project.',
    },
    ...projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
    })),
  ];

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      showCloseButton={false}
      closeDisabled={isSaving}
      cancelText="Cancel"
      onCancel={onClose}
      cancelDisabled={isSaving}
      confirmText={isSaving ? 'Moving…' : 'Save location'}
      onConfirm={() => {
        void onSave(selectedProjectId);
      }}
      confirmDisabled={isSaving || selectedProjectId === currentProjectId}
      contentStyle={{ maxWidth: 440 }}
    >
      <Typography variant="section-header" style={{ marginBottom: 8 }}>
        Move goal
      </Typography>
      <Typography variant="body" style={{ fontSize: 14, lineHeight: 21, marginBottom: 18 }}>
        Choose a project, or keep this goal on its own.
      </Typography>

      {isLoading && projects.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 28 }}>
          <ActivityIndicator color={colors.accent.primary} />
        </View>
      ) : (
        <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 8 }}>
          {options.map((option) => {
            const selected = selectedProjectId === option.id;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled: isSaving }}
                disabled={isSaving}
                key={option.id ?? 'standalone'}
                onPress={() => setSelectedProjectId(option.id)}
                style={({ pressed }) => ({
                  backgroundColor: selected
                    ? colors.background.selectedRow
                    : colors.background.card,
                  borderColor: selected ? colors.border.accent : colors.border.warm,
                  borderRadius: 12,
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: 12,
                  opacity: pressed ? 0.72 : 1,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                })}
              >
                <View
                  style={{
                    alignItems: 'center',
                    borderColor: selected ? colors.accent.primary : colors.border.input,
                    borderRadius: 9,
                    borderWidth: 1.5,
                    height: 18,
                    justifyContent: 'center',
                    marginTop: 1,
                    width: 18,
                  }}
                >
                  {selected ? (
                    <View
                      style={{
                        backgroundColor: colors.accent.primary,
                        borderRadius: 5,
                        height: 10,
                        width: 10,
                      }}
                    />
                  ) : null}
                </View>

                <View style={{ flex: 1 }}>
                  <Typography variant="emphasis-sm" style={{ color: colors.text.primary }}>
                    {option.title}
                  </Typography>
                  {option.description ? (
                    <Typography
                      numberOfLines={2}
                      variant="meta"
                      style={{ color: colors.text.secondary, lineHeight: 18, marginTop: 3 }}
                    >
                      {option.description}
                    </Typography>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {error ? (
        <Typography
          variant="meta"
          style={{ color: colors.feedback.danger.text, lineHeight: 18, marginTop: 12 }}
        >
          {error}
        </Typography>
      ) : null}
    </Modal>
  );
}
