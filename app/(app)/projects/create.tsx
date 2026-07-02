import {
  View,
  Text,
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
            <Pressable onPress={() => router.back()} style={{ marginRight: 8 }}>
              <Text style={{ fontSize: 15, color: '#4A7C5F' }}>← Goals</Text>
            </Pressable>
            <Text style={{ fontSize: 15, color: '#9CAF9F' }}>|</Text>
            <Text style={{ fontSize: 15, color: '#1A1F1C', marginLeft: 8, fontWeight: '500' }}>
              New project
            </Text>
          </View>

          {/* Body — centered, max-width 480px on web */}
          <View style={{ alignSelf: 'center', width: '100%', maxWidth: 480 }}>
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#1A1F1C', marginBottom: 8 }}>
              What are you working toward?
            </Text>
            <Text style={{ fontSize: 15, color: '#6B7B6E', lineHeight: 22, marginBottom: 32 }}>
              A project is a long-term ambition. Your goals will help you get there.
            </Text>

            {/* Title input */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '500',
                  color: '#6B7B6E',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Project name
              </Text>
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
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '500',
                  color: '#6B7B6E',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Long-term intent (optional)
              </Text>
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
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#E8EDE9' }}>
                {isSubmitting ? 'Creating…' : 'Create project'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
