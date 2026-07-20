import { useEffect, useState } from 'react';
import { TextInput, View, type TextStyle } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { LIGHT_THEME } from '@/constants/colors';
import { useProjectStore } from '../store';

interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
}

const INPUT_STYLE: TextStyle = {
  backgroundColor: LIGHT_THEME.background.card,
  borderWidth: 1,
  borderColor: LIGHT_THEME.border.input,
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontFamily: 'Inter-Regular',
  fontSize: 15,
  color: LIGHT_THEME.text.primary,
};

export function CreateProjectModal({ visible, onClose }: CreateProjectModalProps) {
  const createProject = useProjectStore((state) => state.createProject);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) return;

    setTitle('');
    setDescription('');
    setIsSubmitting(false);
    setError(null);
  }, [visible]);

  const canSubmit = title.trim().length > 0 && !isSubmitting;

  function handleClose() {
    if (isSubmitting) return;
    onClose();
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createProject({
        title: title.trim(),
        description: description.trim() || undefined,
      });
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not create the project. Please try again.',
      );
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      showCloseButton={false}
      closeDisabled={isSubmitting}
      closeOnBackdropPress
      cancelText="Cancel"
      onCancel={handleClose}
      cancelDisabled={isSubmitting}
      confirmText={isSubmitting ? 'Creating…' : 'Create project'}
      onConfirm={() => void handleSubmit()}
      confirmDisabled={!canSubmit}
      contentStyle={{ maxWidth: 480 }}
    >
      <Typography variant="heading" style={{ marginBottom: 8 }}>
        What are you working toward?
      </Typography>
      <Typography
        variant="body"
        style={{ fontSize: 15, lineHeight: 22, marginBottom: 24 }}
      >
        A project is a long-term ambition. Your goals will help you get there.
      </Typography>

      <View style={{ marginBottom: 18 }}>
        <Typography variant="eyebrow" style={{ marginBottom: 8 }}>
          Project name
        </Typography>
        <TextInput
          accessibilityLabel="Project name"
          autoFocus
          style={INPUT_STYLE}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Build financial independence"
          placeholderTextColor={LIGHT_THEME.text.muted}
        />
      </View>

      <View>
        <Typography variant="eyebrow" style={{ marginBottom: 8 }}>
          Long-term intent (optional)
        </Typography>
        <TextInput
          accessibilityLabel="Long-term project intent"
          multiline
          style={[
            INPUT_STYLE,
            { minHeight: 88, maxHeight: 140, textAlignVertical: 'top' },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what achieving this means to you..."
          placeholderTextColor={LIGHT_THEME.text.muted}
        />
      </View>

      {error ? (
        <Typography
          variant="caption"
          accessibilityRole="alert"
          style={{ color: LIGHT_THEME.feedback.danger.text, marginTop: 12 }}
        >
          {error}
        </Typography>
      ) : null}
    </Modal>
  );
}
