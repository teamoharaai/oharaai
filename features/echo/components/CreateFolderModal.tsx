import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useThemeColors } from '@/store/uiStore';

type CreateFolderModalProps = {
  visible: boolean;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (name: string) => void;
};

export function CreateFolderModal({
  visible,
  isSaving,
  error,
  onClose,
  onCreate,
}: CreateFolderModalProps) {
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName('');
      setLocalError(null);
    }
  }, [visible]);

  const handleClose = () => {
    if (!isSaving) onClose();
  };

  const handleCreate = () => {
    if (isSaving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setLocalError('Enter a folder name.');
      return;
    }

    setLocalError(null);
    onCreate(trimmedName);
  };

  const displayError = localError ?? error;
  const canCreate = name.trim().length > 0 && !isSaving;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={handleClose}>
        <Pressable
          className="w-full max-w-sm rounded-2xl border p-5"
          style={{ backgroundColor: colors.background.card, borderColor: colors.border.input }}
        >
          <Text
            className="font-sans"
            style={{
              color: colors.text.primary,
              fontFamily: 'Inter-Bold',
              fontSize: 17,
              lineHeight: 23,
            }}
          >
            New Echo folder
          </Text>

          <Text
            className="mt-2 font-sans"
            style={{ color: colors.text.secondary, fontSize: 13, lineHeight: 18 }}
          >
            Give this folder a name.
          </Text>

          <TextInput
            autoFocus
            value={name}
            editable={!isSaving}
            onChangeText={(nextName) => {
              setName(nextName);
              if (localError) setLocalError(null);
            }}
            onSubmitEditing={handleCreate}
            returnKeyType="done"
            placeholder="Folder name"
            placeholderTextColor="#8A8172"
            accessibilityLabel="Echo folder name"
            className="mt-4 rounded-xl border px-3.5 py-3 font-sans"
            style={{
              borderColor: colors.border.input,
              color: '#211F1A',
              fontSize: 14,
              lineHeight: 20,
            }}
          />

          {displayError ? (
            <Text
              className="mt-3 font-sans"
              style={{ color: colors.feedback.danger, fontSize: 13, lineHeight: 18 }}
            >
              {displayError}
            </Text>
          ) : null}

          <View className="mt-5 flex-row justify-end gap-3">
            <Pressable
              onPress={handleClose}
              disabled={isSaving}
              className="rounded-xl border px-4 py-3"
              style={{ borderColor: colors.border.input, opacity: isSaving ? 0.55 : 1 }}
            >
              <Text
                className="font-sans"
                style={{ color: colors.text.secondary, fontFamily: 'Inter-SemiBold', fontSize: 13.5 }}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleCreate}
              disabled={!canCreate}
              className="min-w-[82px] items-center rounded-xl px-4 py-3"
              style={{
                backgroundColor: canCreate ? colors.background.sidebar : colors.border.input,
              }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text
                  className="font-sans"
                  style={{
                    color: colors.text.inverse,
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 13.5,
                  }}
                >
                  Create
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
