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
import { EntryCard } from './EntryCard';

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

function StarlogLoadingState() {
  return (
    <View className="gap-3 py-2">
      {[0, 1, 2].map((item) => (
        <View
          key={item}
          className="animate-pulse rounded-xl border border-dark-border bg-dark-card p-4"
        >
          <View className="mb-3 h-4 w-full rounded-full bg-dark-border" />
          <View className="mb-2 h-4 w-5/6 rounded-full bg-dark-border" />
          <View className="mb-4 h-4 w-2/3 rounded-full bg-dark-border" />
          <View className="h-3 w-20 rounded-full bg-dark-border" />
        </View>
      ))}
    </View>
  );
}

export function StarlogScreen() {
  const { entries, isLoading, pickerGoals, saveEntry } = useEntries();

  const [text, setText] = useState('');
  const [linkedGoal, setLinkedGoal] = useState<{ id: string; title: string } | null>(null);
  const [aiInsightOn, setAiInsightOn] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!text.trim()) return;
    setIsSaving(true);
    const aiRequested = FEATURES.INTELLIGENCE_ENABLED ? aiInsightOn : false;
    await saveEntry(text.trim(), linkedGoal?.id ?? null, aiRequested);
    setText('');
    setLinkedGoal(null);
    setAiInsightOn(false);
    setIsSaving(false);
  }

  const today = new Date();
  const canSave = text.trim().length > 0 && !isSaving;

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-6">
          <Text className="text-2xl font-extrabold text-ink">Starlog</Text>
          <Text className="mt-0.5 text-[13px] text-ink-dim">{formatHeaderDate(today)}</Text>
        </View>

        <View className="mb-6 rounded-xl border border-dark-border bg-dark-card p-4">
          <TextInput
            className="min-h-[100px] text-[15px] leading-[22px] text-ink"
            placeholder="What's on your mind?"
            placeholderTextColor="#8888A0"
            multiline
            value={text}
            onChangeText={setText}
          />

          <View className="mt-3.5 flex-row flex-wrap items-center gap-2">
            {linkedGoal ? (
              <TouchableOpacity
                onPress={() => setLinkedGoal(null)}
                className="flex-row items-center gap-1.5 rounded-full bg-dark-border px-3 py-1.5"
                activeOpacity={0.7}
              >
                <Text className="text-xs text-ink">{linkedGoal.title}</Text>
                <Text className="text-sm leading-4 text-ink-dim">×</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setPickerVisible(true)}
                className="flex-row items-center rounded-full border border-dark-border px-3 py-1.5"
                activeOpacity={0.7}
              >
                <Text className="text-xs text-ink-dim">+ Link goal</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setAiInsightOn((value) => !value)}
              className={`rounded-full px-3 py-1.5 ${aiInsightOn ? 'bg-[#1B7A5A]' : 'bg-dark-border'}`}
              activeOpacity={0.7}
            >
              <Text className={`text-xs ${aiInsightOn ? 'text-ink' : 'text-ink-dim'}`}>AI insight</Text>
            </TouchableOpacity>
          </View>

          {aiInsightOn ? (
            <Text className="mt-2 text-[11px] text-ink-dim">Ohara AI will reflect on this entry</Text>
          ) : null}

          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            className={`mt-4 items-center rounded-lg py-3 ${canSave ? 'bg-[#6FDFB8]' : 'bg-dark-border'}`}
            activeOpacity={0.8}
          >
            <Text className={`text-sm font-semibold ${canSave ? 'text-dark-bg' : 'text-ink-dim'}`}>
              {isSaving ? 'Saving...' : 'Save Entry'}
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <StarlogLoadingState />
        ) : entries.length === 0 ? (
          <View className="pt-2">
            <EmptyStateCard
              title="No Starlog entries yet."
              description="Write your first reflection above to start building your Starlog."
            />
          </View>
        ) : (
          entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
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
          className="flex-1 justify-end bg-black/60"
          onPress={() => setPickerVisible(false)}
        >
          <Pressable className="max-h-[60%] rounded-t-2xl border-t border-dark-border bg-dark-card pb-10 pt-3">
            <View className="mb-4 h-1 w-9 self-center rounded-full bg-[#2E2E3E]" />
            <Text className="mb-3 px-5 text-base font-bold text-ink">Link a goal</Text>
            {pickerGoals.length === 0 ? (
              <Text className="px-5 text-sm text-ink-dim">No active goals found.</Text>
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
                    className="border-b border-dark-border px-5 py-3.5"
                    activeOpacity={0.7}
                  >
                    <Text className="text-[15px] text-ink">{item.title}</Text>
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
