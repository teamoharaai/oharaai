import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FEATURES } from '@/constants/features';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { useEntries } from '../hooks/useEntries';
import type { EchoEntry } from '../types';

const COLORS = {
  background: '#F5F1EA',
  card: '#FFFFFF',
  accent: '#3D5247',
  text: '#1C1C1E',
  muted: '#6B7280',
  border: '#D8D2C8',
  shadow: '#000000',
  badgeBackground: '#EEF2EF',
};

function formatPillLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatHeaderDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const ranges = [
    { limit: 60, unit: 'second' },
    { limit: 3600, unit: 'minute', divisor: 60 },
    { limit: 86400, unit: 'hour', divisor: 3600 },
    { limit: 604800, unit: 'day', divisor: 86400 },
    { limit: 2629800, unit: 'week', divisor: 604800 },
    { limit: 31557600, unit: 'month', divisor: 2629800 },
  ] as const;

  for (const range of ranges) {
    if (seconds < range.limit) {
      const value = 'divisor' in range ? Math.floor(seconds / range.divisor) : seconds;
      return `${value} ${range.unit}${value === 1 ? '' : 's'} ago`;
    }
  }

  const years = Math.floor(seconds / 31557600);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        marginBottom: 10,
        fontFamily: 'Inter',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: COLORS.muted,
      }}
    >
      {children}
    </Text>
  );
}

function EchoEntryListCard({ entry }: { entry: EchoEntry }) {
  return (
    <View
      style={{
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: COLORS.card,
        padding: 16,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <Text
        style={{
          color: COLORS.text,
          fontFamily: 'Inter',
          fontSize: 14,
          lineHeight: 21,
        }}
        numberOfLines={2}
      >
        {entry.content}
      </Text>

      <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          style={{
            color: COLORS.muted,
            fontFamily: 'Inter',
            fontSize: 12,
          }}
        >
          {formatRelativeTime(entry.createdAt)}
        </Text>
        {entry.emotion?.primary ? (
          <View
            style={{
              borderRadius: 999,
              backgroundColor: COLORS.badgeBackground,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                color: COLORS.accent,
                fontFamily: 'Inter',
                fontSize: 11,
                fontWeight: '500',
              }}
            >
              {formatPillLabel(entry.emotion.primary)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function EchoLoadingState() {
  return (
    <View style={{ gap: 12, paddingVertical: 8 }}>
      {[0, 1, 2].map((item) => (
        <View
          key={item}
          style={{
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View style={{ marginBottom: 12, height: 14, borderRadius: 999, backgroundColor: '#EAE7E0' }} />
          <View style={{ marginBottom: 8, height: 14, width: '83%', borderRadius: 999, backgroundColor: '#EAE7E0' }} />
          <View style={{ marginBottom: 16, height: 14, width: '66%', borderRadius: 999, backgroundColor: '#EAE7E0' }} />
          <View style={{ height: 12, width: 80, borderRadius: 999, backgroundColor: '#EAE7E0' }} />
        </View>
      ))}
    </View>
  );
}

export function EchoScreen() {
  const { entries, isLoading, pickerGoals, saveEntry } = useEntries();

  const [text, setText] = useState('');
  const [linkedGoal, setLinkedGoal] = useState<{ id: string; title: string } | null>(null);
  const [aiInsightOn, setAiInsightOn] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isComposerFocused, setIsComposerFocused] = useState(false);

  async function handleSave() {
    if (!text.trim()) return;
    setIsSaving(true);
    const aiRequested = FEATURES.INTELLIGENCE_ENABLED ? aiInsightOn : false;
    await saveEntry(text.trim(), linkedGoal?.id ?? null, aiRequested, null, null);
    setText('');
    setLinkedGoal(null);
    setAiInsightOn(false);
    setIsSaving(false);
  }

  const today = new Date();
  const canSave = text.trim().length > 0 && !isSaving;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: '800', color: COLORS.text }}>Echo</Text>
          <Text style={{ marginTop: 2, fontFamily: 'Inter', fontSize: 13, color: COLORS.muted }}>
            {formatHeaderDate(today)}
          </Text>
        </View>

        {/* Composer */}
        <View
          style={{
            marginBottom: 24,
            borderRadius: 12,
            backgroundColor: COLORS.card,
            padding: 16,
            borderWidth: 1,
            borderColor: isComposerFocused ? COLORS.accent : COLORS.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <SectionLabel>Reflection</SectionLabel>
          <TextInput
            style={{
              minHeight: 100,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isComposerFocused ? COLORS.accent : COLORS.border,
              backgroundColor: COLORS.card,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: 'Inter',
              fontSize: 15,
              lineHeight: 22,
              color: COLORS.text,
            }}
            placeholder="What's on your mind?"
            placeholderTextColor={COLORS.muted}
            multiline
            value={text}
            onChangeText={setText}
            onFocus={() => setIsComposerFocused(true)}
            onBlur={() => setIsComposerFocused(false)}
          />

          <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {linkedGoal ? (
              <TouchableOpacity
                onPress={() => setLinkedGoal(null)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 999,
                  backgroundColor: COLORS.badgeBackground,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: COLORS.accent }}>{linkedGoal.title}</Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 14, lineHeight: 16, color: COLORS.accent }}>×</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setPickerVisible(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: 'Inter', fontSize: 12, color: COLORS.muted }}>+ Link goal</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setAiInsightOn((value) => !value)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: aiInsightOn ? COLORS.accent : COLORS.background,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: 'Inter', fontSize: 12, color: aiInsightOn ? '#FFFFFF' : COLORS.muted }}>
                AI insight
              </Text>
            </TouchableOpacity>
          </View>

          {aiInsightOn ? (
            <Text style={{ marginTop: 8, fontFamily: 'Inter', fontSize: 11, color: COLORS.muted }}>
              Ohara AI will reflect on this entry
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={{
              marginTop: 16,
              alignItems: 'center',
              borderRadius: 12,
              paddingVertical: 12,
              backgroundColor: canSave ? COLORS.accent : COLORS.border,
            }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 14,
                fontWeight: '600',
                color: canSave ? '#FFFFFF' : COLORS.muted,
              }}
            >
              {isSaving ? 'Saving...' : 'Save Entry'}
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <EchoLoadingState />
        ) : entries.length === 0 ? (
          <View style={{ paddingTop: 8 }}>
            <EmptyStateCard
              title="No Echo entries yet."
              description="Write your first reflection above to start building your Echo."
            />
          </View>
        ) : (
          entries.map((entry) => (
            <EchoEntryListCard key={entry.id} entry={entry} />
          ))
        )}
      </ScrollView>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setPickerVisible(false)}
        >
          <Pressable
              style={{
                maxHeight: '60%',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                borderTopWidth: 1,
                borderTopColor: COLORS.border,
                backgroundColor: COLORS.card,
                paddingBottom: 40,
                paddingTop: 12,
              }}
          >
            <View
              style={{
                height: 4,
                width: 36,
                alignSelf: 'center',
                borderRadius: 999,
                backgroundColor: COLORS.border,
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                marginBottom: 12,
                paddingHorizontal: 20,
                fontFamily: 'Inter',
                fontSize: 16,
                fontWeight: '700',
                color: COLORS.text,
              }}
            >
              Link a goal
            </Text>
            {pickerGoals.length === 0 ? (
              <Text style={{ paddingHorizontal: 20, fontFamily: 'Inter', fontSize: 14, color: COLORS.muted }}>
                No active goals found.
              </Text>
            ) : (
              <FlatList
                data={pickerGoals}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setLinkedGoal(item);
                      setPickerVisible(false);
                    }}
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: COLORS.border,
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontFamily: 'Inter', fontSize: 15, color: COLORS.text }}>{item.title}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
