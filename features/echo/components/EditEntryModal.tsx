import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { EchoEntry } from '../types';

interface EditEntryModalProps {
  visible: boolean;
  entry: EchoEntry | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (changes: { content: string; title: string | null }) => void;
}

// Presentational edit sheet — receives the entry + save/close callbacks as props
// and calls no services itself (features/ rule 3; the useEditEntry hook owns the
// updateEntry() call). Reuses the composer's title/content TextInput styling but
// none of its draft-persistence / linked-goal logic, which doesn't apply to a
// saved entry. Container assignment (goal/folder) is Move's job, not edited here.
export function EditEntryModal({
  visible,
  entry,
  isSaving,
  error,
  onClose,
  onSave,
}: EditEntryModalProps) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');

  // Re-seed the inputs whenever a different entry is opened for editing.
  useEffect(() => {
    if (entry) {
      setContent(entry.content);
      setTitle(entry.title ?? '');
    }
  }, [entry]);

  const trimmedContent = content.trim();
  const canSave = trimmedContent.length > 0 && !isSaving;

  // Block dismissal while a save is in flight so the outcome isn't missed.
  const handleDismiss = () => {
    if (!isSaving) onClose();
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({ content: trimmedContent, title: title.trim() || null });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleDismiss}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={handleDismiss}>
        <Pressable className="rounded-t-2xl border-t border-[#D8D2C8] bg-white pb-8 pt-3">
          <View className="mb-4 h-1 w-9 self-center rounded-full bg-[#D8D2C8]" />
          <Text
            className="mb-3 px-5 font-sans text-base text-near-black"
            style={{ fontFamily: 'Inter-Bold' }}
          >
            Edit entry
          </Text>

          <View className="px-5">
            <TextInput
              className="mb-2.5 rounded-xl border border-[#D8D2C8] bg-white px-3.5 py-3 font-sans text-base text-near-black"
              placeholder="Title (optional)"
              placeholderTextColor="#6B7B6E"
              value={title}
              onChangeText={setTitle}
              editable={!isSaving}
            />
            <TextInput
              className="min-h-[120px] rounded-xl border border-[#D8D2C8] bg-white px-3.5 py-3 font-sans text-base text-near-black"
              placeholder="What's on your mind?"
              placeholderTextColor="#6B7B6E"
              multiline
              value={content}
              onChangeText={setContent}
              editable={!isSaving}
              textAlignVertical="top"
            />

            {error ? (
              <Text className="mt-2 font-sans text-sm text-red-700">{error}</Text>
            ) : null}

            <View className="mt-4 flex-row gap-3">
              <TouchableOpacity
                onPress={handleDismiss}
                disabled={isSaving}
                className={`flex-1 items-center rounded-xl border border-[#D8D2C8] py-3 ${
                  isSaving ? 'opacity-40' : ''
                }`}
                activeOpacity={0.8}
              >
                <Text className="font-sans text-sm font-semibold text-[#6B7B6E]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!canSave}
                className={`flex-1 items-center rounded-xl py-3 ${
                  canSave ? 'bg-[#3D5247]' : 'bg-[#D8D2C8]'
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`font-sans text-sm font-semibold ${
                    canSave ? 'text-white' : 'text-[#6B7B6E]'
                  }`}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
