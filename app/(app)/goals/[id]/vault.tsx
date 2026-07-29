import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { AppHeader } from '@/components/layout/AppHeader';
import { useVault } from '@/features/goals/hooks/useVault';
import { useEchoTrail } from '@/features/goals/hooks/useEchoTrail';
import { VaultItemCard } from '@/features/goals/components/VaultItemCard';
import { EchoTrail } from '@/features/goals/components/EchoTrail';
import { useThemeColors } from '@/store/uiStore';

// ─── Sheet sub-components ──────────────────────────────────────────────────────

type VaultPickerSheetProps = {
  onNote: () => void;
  onLink: () => void;
  onClose: () => void;
};

function VaultPickerSheet({ onNote, onLink, onClose }: VaultPickerSheetProps) {
  const colors = useThemeColors();

  return (
    <View>
      <Typography variant="nav-title" style={{ fontFamily: 'Inter-SemiBold', marginBottom: 16 }}>
        Add to Vault
      </Typography>
      <Pressable
        onPress={onNote}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.divider,
        }}
      >
        <Typography variant="meta" style={{ fontSize: 20 }}>📝</Typography>
        <Typography variant="label" style={{ color: colors.text.primary }}>
          Add Note
        </Typography>
      </Pressable>
      <Pressable
        onPress={onLink}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.divider,
        }}
      >
        <Typography variant="meta" style={{ fontSize: 20 }}>🔗</Typography>
        <Typography variant="label" style={{ color: colors.text.primary }}>
          Save Link
        </Typography>
      </Pressable>
      <Pressable
        onPress={onClose}
        style={{ paddingVertical: 14, alignItems: 'center' }}
      >
        <Typography variant="body" style={{ fontFamily: 'Inter-Regular', fontSize: 14 }}>Cancel</Typography>
      </Pressable>
    </View>
  );
}

type AddNoteSheetProps = {
  onSave: (title: string, content: string) => Promise<void>;
  onClose: () => void;
};

function AddNoteSheet({ onSave, onClose }: AddNoteSheetProps) {
  const colors = useThemeColors();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const inputStyle = {
    backgroundColor: colors.background.input,
    borderColor: colors.border.input,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text.primary,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  } as const;

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    await onSave(title.trim(), content.trim());
    setSaving(false);
  }

  return (
    <View>
      <Typography variant="nav-title" style={{ fontFamily: 'Inter-SemiBold', marginBottom: 14 }}>
        Add Note
      </Typography>
      <TextInput
        style={[inputStyle, { marginBottom: 10 }]}
        placeholder="Title (optional)"
        placeholderTextColor={colors.text.muted}
        value={title}
        onChangeText={setTitle}
        returnKeyType="next"
      />
      <TextInput
        style={[inputStyle, { minHeight: 100, textAlignVertical: 'top', marginBottom: 14 }]}
        placeholder="Write your note…"
        placeholderTextColor={colors.text.muted}
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
            borderColor: colors.border.divider,
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
            backgroundColor: colors.accent.primary,
            opacity: saving || !content.trim() ? 0.5 : 1,
          }}
          disabled={saving || !content.trim()}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.text.onAccent} />
          ) : (
            <Typography variant="emphasis-sm" style={{ color: colors.text.onAccent }}>
              Save
            </Typography>
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
  const colors = useThemeColors();
  const [url, setUrl] = useState('');
  const [annotation, setAnnotation] = useState('');
  const [saving, setSaving] = useState(false);
  const inputStyle = {
    backgroundColor: colors.background.input,
    borderColor: colors.border.input,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text.primary,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  } as const;

  async function handleSave() {
    if (!url.trim()) return;
    setSaving(true);
    await onSave(url.trim(), annotation.trim() || undefined);
    setSaving(false);
  }

  return (
    <View>
      <Typography variant="nav-title" style={{ fontFamily: 'Inter-SemiBold', marginBottom: 14 }}>
        Save Link
      </Typography>
      <TextInput
        style={[inputStyle, { marginBottom: 10 }]}
        placeholder="https://…"
        placeholderTextColor={colors.text.muted}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        keyboardType="url"
        returnKeyType="next"
      />
      <TextInput
        style={[inputStyle, { marginBottom: 14 }]}
        placeholder="Note about this link (optional)"
        placeholderTextColor={colors.text.muted}
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
            borderColor: colors.border.divider,
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
            backgroundColor: colors.accent.primary,
            opacity: saving || !url.trim() ? 0.5 : 1,
          }}
          disabled={saving || !url.trim()}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.text.onAccent} />
          ) : (
            <Typography variant="emphasis-sm" style={{ color: colors.text.onAccent }}>
              Save
            </Typography>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function VaultScreen() {
  const colors = useThemeColors();
  const cardStyle = {
    backgroundColor: colors.background.card,
    borderColor: colors.border.warm,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 1,
    marginBottom: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  } as const;
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.page }}>
      <AppHeader backLabel="Back" onBack={() => router.back()} title="Vault" />

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
              <Typography variant="meta" style={{ fontSize: 22, color: colors.text.accent, lineHeight: 24 }}>＋</Typography>
            </TouchableOpacity>
          </View>

          {vault.loading && (
            <ActivityIndicator
              size="small"
              color={colors.text.muted}
              style={{ alignSelf: 'flex-start', marginBottom: 8 }}
            />
          )}

          {vault.error ? (
            <Typography variant="meta" style={{ color: colors.feedback.danger.text, marginBottom: 8 }}>{vault.error}</Typography>
          ) : null}

          {!vault.loading && vault.items.length === 0 ? (
            <Pressable
              onPress={openSheet}
              style={{
                ...cardStyle,
                alignItems: 'center',
                paddingVertical: 32,
              }}
            >
              <Typography variant="meta" style={{ fontSize: 30, marginBottom: 8 }}>◫</Typography>
              <Typography
                variant="meta"
                style={{ color: colors.text.muted, textAlign: 'center' }}
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
              Entries
            </Typography>
            <Pressable
              onPress={() =>
                router.push(`/(app)/echo?goalId=${goalId}` as never)
              }
            >
              <Typography variant="label" style={{ fontSize: 13, color: colors.text.accent }}>
                Add entry
              </Typography>
            </Pressable>
          </View>

          {echoTrail.loading && (
            <ActivityIndicator
              size="small"
              color={colors.text.muted}
              style={{ alignSelf: 'flex-start', marginBottom: 8 }}
            />
          )}

          {!echoTrail.loading && echoTrail.entries.length === 0 ? (
            <Pressable
              onPress={() =>
                router.push(`/(app)/echo?goalId=${goalId}` as never)
              }
              style={{
                ...cardStyle,
                alignItems: 'center',
                paddingVertical: 28,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Typography variant="meta" style={{ color: colors.text.muted }}>
                Add an entry about this goal
              </Typography>
              <Typography variant="caption" style={{ fontSize: 14 }}>›</Typography>
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
            backgroundColor: colors.background.card,
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
