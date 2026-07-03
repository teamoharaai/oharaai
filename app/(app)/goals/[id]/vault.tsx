import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { useVault } from '@/features/goals/hooks/useVault';
import { useEchoTrail } from '@/features/goals/hooks/useEchoTrail';
import { VaultItemCard } from '@/features/goals/components/VaultItemCard';
import { EchoTrail } from '@/features/goals/components/EchoTrail';

const CARD_STYLE = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 16,
  marginBottom: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 1,
};

const INPUT_STYLE = {
  fontSize: 14,
  color: '#1A1F1C',
  backgroundColor: '#F5F1EA',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#EAE7E0',
  paddingHorizontal: 12,
  paddingVertical: 10,
};

// ─── Sheet sub-components ──────────────────────────────────────────────────────

type VaultPickerSheetProps = {
  onNote: () => void;
  onLink: () => void;
  onClose: () => void;
};

function VaultPickerSheet({ onNote, onLink, onClose }: VaultPickerSheetProps) {
  return (
    <View>
      <Text
        style={{
          fontFamily: 'Inter-SemiBold',
          fontSize: 15,
          color: '#1A1F1C',
          marginBottom: 16,
        }}
      >
        Add to Vault
      </Text>
      <Pressable
        onPress={onNote}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#F0EDE6',
        }}
      >
        <Text style={{ fontSize: 20 }}>📝</Text>
        <Text style={{ fontFamily: 'Inter-Medium', fontSize: 14, color: '#1A1F1C' }}>
          Add Note
        </Text>
      </Pressable>
      <Pressable
        onPress={onLink}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#F0EDE6',
        }}
      >
        <Text style={{ fontSize: 20 }}>🔗</Text>
        <Text style={{ fontFamily: 'Inter-Medium', fontSize: 14, color: '#1A1F1C' }}>
          Save Link
        </Text>
      </Pressable>
      <Pressable
        onPress={onClose}
        style={{ paddingVertical: 14, alignItems: 'center' }}
      >
        <Text style={{ fontFamily: 'Inter-Regular', fontSize: 14, color: '#6B7B6E' }}>Cancel</Text>
      </Pressable>
    </View>
  );
}

type AddNoteSheetProps = {
  onSave: (title: string, content: string) => Promise<void>;
  onClose: () => void;
};

function AddNoteSheet({ onSave, onClose }: AddNoteSheetProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    await onSave(title.trim(), content.trim());
    setSaving(false);
  }

  return (
    <View>
      <Text
        style={{
          fontFamily: 'Inter-SemiBold',
          fontSize: 15,
          color: '#1A1F1C',
          marginBottom: 14,
        }}
      >
        Add Note
      </Text>
      <TextInput
        style={[INPUT_STYLE, { marginBottom: 10 }]}
        placeholder="Title (optional)"
        placeholderTextColor="#9CAF9F"
        value={title}
        onChangeText={setTitle}
        returnKeyType="next"
      />
      <TextInput
        style={[INPUT_STYLE, { minHeight: 100, textAlignVertical: 'top', marginBottom: 14 }]}
        placeholder="Write your note…"
        placeholderTextColor="#9CAF9F"
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={5}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={onClose}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#EAE7E0',
          }}
          disabled={saving}
        >
          <Typography variant="body">Cancel</Typography>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: '#3D5247',
            opacity: saving || !content.trim() ? 0.5 : 1,
          }}
          disabled={saving || !content.trim()}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#FFFFFF' }}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

type SaveLinkSheetProps = {
  onSave: (url: string, annotation?: string) => Promise<void>;
  onClose: () => void;
};

function SaveLinkSheet({ onSave, onClose }: SaveLinkSheetProps) {
  const [url, setUrl] = useState('');
  const [annotation, setAnnotation] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!url.trim()) return;
    setSaving(true);
    await onSave(url.trim(), annotation.trim() || undefined);
    setSaving(false);
  }

  return (
    <View>
      <Text
        style={{
          fontFamily: 'Inter-SemiBold',
          fontSize: 15,
          color: '#1A1F1C',
          marginBottom: 14,
        }}
      >
        Save Link
      </Text>
      <TextInput
        style={[INPUT_STYLE, { marginBottom: 10 }]}
        placeholder="https://…"
        placeholderTextColor="#9CAF9F"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        keyboardType="url"
        returnKeyType="next"
      />
      <TextInput
        style={[INPUT_STYLE, { marginBottom: 14 }]}
        placeholder="Note about this link (optional)"
        placeholderTextColor="#9CAF9F"
        value={annotation}
        onChangeText={setAnnotation}
        returnKeyType="done"
        onSubmitEditing={handleSave}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={onClose}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#EAE7E0',
          }}
          disabled={saving}
        >
          <Typography variant="body">Cancel</Typography>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: '#3D5247',
            opacity: saving || !url.trim() ? 0.5 : 1,
          }}
          disabled={saving || !url.trim()}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#FFFFFF' }}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function VaultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = Array.isArray(id) ? id[0] : (id ?? '');

  const vault = useVault(goalId);
  const echoTrail = useEchoTrail(goalId);

  const [showSheet, setShowSheet] = useState(false);
  const [sheetMode, setSheetMode] = useState<'pick' | 'note' | 'link'>('pick');

  useFocusEffect(
    useCallback(() => {
      void vault.refresh();
      void echoTrail.refresh();
    }, [vault.refresh, echoTrail.refresh]),
  );

  function openSheet() {
    setSheetMode('pick');
    setShowSheet(true);
  }

  function closeSheet() {
    setShowSheet(false);
  }

  async function handleAddNote(title: string, content: string) {
    await vault.addNote(title, content);
    closeSheet();
  }

  async function handleAddLink(url: string, annotation?: string) {
    await vault.addLink(url, annotation);
    closeSheet();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
      {/* Nav bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Typography variant="nav-back">← Back</Typography>
        </Pressable>
        <Text style={{ fontFamily: 'Inter-Regular', fontSize: 15, color: '#9CAF9F', marginHorizontal: 8 }}>
          |
        </Text>
        <Typography variant="nav-title" style={{ flex: 1 }}>
          Vault
        </Typography>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Vault Items ────────────────────────────────────────────────── */}
        <View style={{ marginBottom: 24 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <Typography variant="eyebrow">
              Items{vault.items.length > 0 ? ` (${vault.items.length})` : ''}
            </Typography>
            <TouchableOpacity onPress={openSheet} hitSlop={8}>
              <Text style={{ fontSize: 22, color: '#3D5247', lineHeight: 24 }}>＋</Text>
            </TouchableOpacity>
          </View>

          {vault.loading && (
            <ActivityIndicator
              size="small"
              color="#9CAF9F"
              style={{ alignSelf: 'flex-start', marginBottom: 8 }}
            />
          )}

          {vault.error ? (
            <Text style={{ fontSize: 13, color: '#EF4444', marginBottom: 8 }}>{vault.error}</Text>
          ) : null}

          {!vault.loading && vault.items.length === 0 ? (
            <Pressable
              onPress={openSheet}
              style={{
                ...CARD_STYLE,
                alignItems: 'center',
                paddingVertical: 32,
              }}
            >
              <Text style={{ fontSize: 30, marginBottom: 8 }}>◫</Text>
              <Typography
                variant="meta"
                style={{ color: '#9CAF9F', textAlign: 'center' }}
              >
                Add notes, links, and resources{'\n'}to build your vault
              </Typography>
            </Pressable>
          ) : (
            vault.items.map((item) => (
              <VaultItemCard
                key={item.id}
                item={item}
                goalId={goalId}
                onUpdate={vault.updateItem}
                onDelete={vault.removeItem}
              />
            ))
          )}
        </View>

        {/* ── Echo Trail ─────────────────────────────────────────────────── */}
        <View style={{ marginBottom: 24 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <Typography variant="eyebrow">
              Reflections
            </Typography>
            <Pressable
              onPress={() =>
                router.push(`/(app)/echo?goalId=${goalId}` as never)
              }
            >
              <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: '#3D5247' }}>
                Write in Echo
              </Text>
            </Pressable>
          </View>

          {echoTrail.loading && (
            <ActivityIndicator
              size="small"
              color="#9CAF9F"
              style={{ alignSelf: 'flex-start', marginBottom: 8 }}
            />
          )}

          {!echoTrail.loading && echoTrail.entries.length === 0 ? (
            <Pressable
              onPress={() =>
                router.push(`/(app)/echo?goalId=${goalId}` as never)
              }
              style={{
                ...CARD_STYLE,
                alignItems: 'center',
                paddingVertical: 28,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, color: '#9CAF9F' }}>
                Journal about this goal in Echo
              </Text>
              <Text style={{ fontSize: 14, color: '#9CAF9F' }}>›</Text>
            </Pressable>
          ) : (
            <EchoTrail
              entries={echoTrail.entries}
              goalId={goalId}
              onConfirmLink={echoTrail.confirmLink}
              onDismissLink={echoTrail.dismissLink}
            />
          )}
        </View>
      </ScrollView>

      {/* ── Bottom Sheet ──────────────────────────────────────────────────── */}
      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={closeSheet}
        />
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
            minHeight: 280,
          }}
        >
          {sheetMode === 'pick' && (
            <VaultPickerSheet
              onNote={() => setSheetMode('note')}
              onLink={() => setSheetMode('link')}
              onClose={closeSheet}
            />
          )}
          {sheetMode === 'note' && (
            <AddNoteSheet onSave={handleAddNote} onClose={closeSheet} />
          )}
          {sheetMode === 'link' && (
            <SaveLinkSheet onSave={handleAddLink} onClose={closeSheet} />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
