import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useProjectStore } from '@/features/projects/store';
import { Typography } from '@/components/ui/Typography';

export default function CreateProjectScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createProject } = useProjectStore();

  const canSubmit = title.trim().length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await createProject({ title: title.trim(), description: description.trim() || undefined });
      router.back();
    } catch {
      setIsSubmitting(false);
    }
  }

  const inputStyle = {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE7E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1F1C',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nav header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 16, marginBottom: 32 }}>
            <Pressable onPress={() => router.back()}>
              <Typography variant="nav-back">← Goals</Typography>
            </Pressable>
            <Typography variant="nav-back" style={{ color: '#9CAF9F', marginHorizontal: 8 }}>
              |
            </Typography>
            <Typography variant="nav-title">New project</Typography>
          </View>

          {/* Body — centered, max-width 480px on web */}
          <View style={{ alignSelf: 'center', width: '100%', maxWidth: 480 }}>
            <Typography variant="heading" style={{ marginBottom: 8 }}>
              What are you working toward?
            </Typography>
            <Typography variant="body" style={{ fontSize: 15, lineHeight: 22, marginBottom: 32 }}>
              A project is a long-term ambition. Your goals will help you get there.
            </Typography>

            {/* Title input */}
            <View style={{ marginBottom: 20 }}>
              <Typography variant="eyebrow" style={{ marginBottom: 8 }}>
                Project name
              </Typography>
              <TextInput
                style={inputStyle}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Build financial independence"
                placeholderTextColor="#9CAF9F"
                autoFocus
                returnKeyType="next"
              />
            </View>

            {/* Description input */}
            <View style={{ marginBottom: 40 }}>
              <Typography variant="eyebrow" style={{ marginBottom: 8 }}>
                Long-term intent (optional)
              </Typography>
              <TextInput
                style={[inputStyle, { minHeight: 80, maxHeight: 120, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe what achieving this means to you..."
                placeholderTextColor="#9CAF9F"
                multiline
              />
            </View>

            {/* Submit button */}
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={{
                backgroundColor: canSubmit ? '#3D5247' : '#9CAF9F',
                borderRadius: 12,
                paddingHorizontal: 24,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Typography variant="emphasis-sm" style={{ fontSize: 16, color: '#E8EDE9' }}>
                {isSubmitting ? 'Creating…' : 'Create project'}
              </Typography>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
