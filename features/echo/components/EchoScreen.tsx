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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#1A1F1C' }}>Echo</Text>
          <Text style={{ marginTop: 2, fontSize: 13, color: '#9CAF9F' }}>
            {formatHeaderDate(today)}
          </Text>
        </View>

        {/* Composer */}
        <View
          style={{
            marginBottom: 24,
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            padding: 16,
            borderWidth: 1,
            borderColor: '#EAE7E0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <TextInput
            style={{
              minHeight: 100,
              fontSize: 15,
              lineHeight: 22,
              color: '#1A1F1C',
            }}
            placeholder="What's on your mind?"
            placeholderTextColor="#9CAF9F"
            multiline
            value={text}
            onChangeText={setText}
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
                  backgroundColor: '#E8F5EF',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, color: '#4A7C5F' }}>{linkedGoal.title}</Text>
                <Text style={{ fontSize: 14, lineHeight: 16, color: '#4A7C5F' }}>×</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setPickerVisible(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: '#EAE7E0',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, color: '#9CAF9F' }}>+ Link goal</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setAiInsightOn((value) => !value)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: aiInsightOn ? '#4A7C5F' : '#EAE7E0',
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 12, color: aiInsightOn ? '#FFFFFF' : '#6B7B6E' }}>
                AI insight
              </Text>
            </TouchableOpacity>
          </View>

          {aiInsightOn ? (
            <Text style={{ marginTop: 8, fontSize: 11, color: '#9CAF9F' }}>
              Ohara AI will reflect on this entry
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={{
              marginTop: 16,
              alignItems: 'center',
              borderRadius: 8,
              paddingVertical: 12,
              backgroundColor: canSave ? '#4A7C5F' : '#EAE7E0',
            }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: canSave ? '#FFFFFF' : '#9CAF9F',
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
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setPickerVisible(false)}
        >
          <Pressable
            style={{
              maxHeight: '60%',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderTopWidth: 1,
              borderTopColor: '#EAE7E0',
              backgroundColor: '#FFFFFF',
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
                backgroundColor: '#EAE7E0',
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                marginBottom: 12,
                paddingHorizontal: 20,
                fontSize: 16,
                fontWeight: '700',
                color: '#1A1F1C',
              }}
            >
              Link a goal
            </Text>
            {pickerGoals.length === 0 ? (
              <Text style={{ paddingHorizontal: 20, fontSize: 14, color: '#9CAF9F' }}>
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
                      borderBottomColor: '#EAE7E0',
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 15, color: '#1A1F1C' }}>{item.title}</Text>
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
