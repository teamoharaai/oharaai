import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useEntries } from '../hooks/useEntries';
import { EntryCard } from './EntryCard';
import { FEATURES } from '@/constants/features';

function formatHeaderDate(date: Date): string {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
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
    // FEATURES.INTELLIGENCE_ENABLED guards any AI logic — currently false, so no API calls
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: '#FAFAFA', fontSize: 24, fontWeight: '800' }}>Starlog</Text>
          <Text style={{ color: '#8888A0', fontSize: 13, marginTop: 2 }}>
            {formatHeaderDate(today)}
          </Text>
        </View>

        {/* Composer */}
        <View
          style={{
            backgroundColor: '#14141F',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#1E1E2E',
            padding: 16,
            marginBottom: 24,
          }}
        >
          <TextInput
            style={{
              color: '#FAFAFA',
              fontSize: 15,
              lineHeight: 22,
              minHeight: 100,
              textAlignVertical: 'top',
            }}
            placeholder="What's on your mind?"
            placeholderTextColor="#8888A0"
            multiline
            value={text}
            onChangeText={setText}
          />

          {/* Controls row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8, flexWrap: 'wrap' }}>
            {/* Goal link */}
            {linkedGoal ? (
              <TouchableOpacity
                onPress={() => setLinkedGoal(null)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#1E1E2E',
                  borderRadius: 16,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  gap: 6,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#FAFAFA', fontSize: 12 }}>{linkedGoal.title}</Text>
                <Text style={{ color: '#8888A0', fontSize: 14, lineHeight: 16 }}>×</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setPickerVisible(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#1E1E2E',
                  borderRadius: 16,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#8888A0', fontSize: 12 }}>+ Link goal</Text>
              </TouchableOpacity>
            )}

            {/* AI insight toggle */}
            <TouchableOpacity
              onPress={() => setAiInsightOn((v) => !v)}
              style={{
                borderRadius: 16,
                paddingHorizontal: 10,
                paddingVertical: 5,
                backgroundColor: aiInsightOn ? '#6E5CE7' : '#1E1E2E',
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: aiInsightOn ? '#FAFAFA' : '#8888A0', fontSize: 12 }}>
                AI insight
              </Text>
            </TouchableOpacity>
          </View>

          {aiInsightOn && (
            <Text style={{ color: '#8888A0', fontSize: 11, marginTop: 8 }}>
              Ohara AI will reflect on this entry
            </Text>
          )}

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={{
              backgroundColor: canSave ? '#FAFAFA' : '#1E1E2E',
              borderRadius: 8,
              paddingVertical: 12,
              alignItems: 'center',
              marginTop: 16,
            }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: canSave ? '#0A0A0F' : '#8888A0',
                fontWeight: '600',
                fontSize: 14,
              }}
            >
              {isSaving ? 'Saving...' : 'Save Entry'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Entries list */}
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color="#8888A0" />
          </View>
        ) : entries.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ color: '#8888A0', textAlign: 'center', fontSize: 14 }}>
              No entries yet. Write your first reflection above.
            </Text>
          </View>
        ) : (
          entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))
        )}
      </ScrollView>

      {/* Goal picker modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setPickerVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: '#14141F',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderTopWidth: 1,
              borderColor: '#1E1E2E',
              paddingTop: 12,
              paddingBottom: 40,
              maxHeight: '60%',
            }}
          >
            {/* Handle */}
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: '#2E2E3E',
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                color: '#FAFAFA',
                fontWeight: '700',
                fontSize: 16,
                paddingHorizontal: 20,
                marginBottom: 12,
              }}
            >
              Link a goal
            </Text>
            {pickerGoals.length === 0 ? (
              <Text style={{ color: '#8888A0', paddingHorizontal: 20, fontSize: 14 }}>
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
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: '#1E1E2E',
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: '#FAFAFA', fontSize: 15 }}>{item.title}</Text>
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
