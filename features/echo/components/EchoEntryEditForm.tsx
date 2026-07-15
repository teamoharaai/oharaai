import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { EchoEntry } from '../types';

interface EchoEntryEditFormProps {
  entry: EchoEntry;
  isSaving: boolean;
  error: string | null;
  onSave: (changes: { content: string; title: string | null }) => void;
  onCancel: () => void;
}

// Inline replacement for the retired EditEntryModal — same content/title
// diffing and save/cancel contract, rendered directly by EchoDetailPane in
// 'edit' mode instead of as a modal overlay.
export function EchoEntryEditForm({
  entry,
  isSaving,
  error,
  onSave,
  onCancel,
}: EchoEntryEditFormProps) {
  const [content, setContent] = useState(entry.content);
  const [title, setTitle] = useState(entry.title ?? '');

  // Re-seed the inputs whenever a different entry enters edit mode.
  useEffect(() => {
    setContent(entry.content);
    setTitle(entry.title ?? '');
  }, [entry]);

  const trimmedContent = content.trim();
  const canSave = trimmedContent.length > 0 && !isSaving;

  const handleCancel = () => {
    if (!isSaving) onCancel();
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({ content: trimmedContent, title: title.trim() || null });
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 36, paddingBottom: 48, paddingTop: 40 }}
      keyboardShouldPersistTaps="handled"
      style={{ minHeight: 0 }}
    >
      <TextInput
        className="mb-3 rounded-xl border border-[#D8D2C8] bg-white px-3.5 py-3 font-sans text-base text-near-black"
        placeholder="Title (optional)"
        placeholderTextColor="#8A8172"
        value={title}
        onChangeText={setTitle}
        editable={!isSaving}
        style={{ maxWidth: 640 }}
      />
      <TextInput
        className="min-h-[240px] rounded-xl border border-[#D8D2C8] bg-white px-3.5 py-3 font-sans text-base text-near-black"
        placeholder="What's on your mind?"
        placeholderTextColor="#8A8172"
        multiline
        value={content}
        onChangeText={setContent}
        editable={!isSaving}
        textAlignVertical="top"
        style={{ maxWidth: 640 }}
      />

      {error ? <Text className="mt-2 font-sans text-sm text-red-700">{error}</Text> : null}

      <View className="mt-4 flex-row gap-3" style={{ maxWidth: 640 }}>
        <TouchableOpacity
          onPress={handleCancel}
          disabled={isSaving}
          className={`flex-1 items-center rounded-xl border border-[#D8D2C8] py-3 ${
            isSaving ? 'opacity-40' : ''
          }`}
          activeOpacity={0.8}
        >
          <Text className="font-sans text-sm font-inter-semibold text-[#8A8172]">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          className={`flex-1 items-center rounded-xl py-3 ${
            canSave ? 'bg-[#1E3226]' : 'bg-[#D8D2C8]'
          }`}
          activeOpacity={0.8}
        >
          <Text
            className={`font-sans text-sm font-inter-semibold ${
              canSave ? 'text-white' : 'text-[#8A8172]'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
