import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { useEntriesStore } from '../store';
import type { EntryRecord } from '../types';
import { copyEntryText, exportEntryPdf, exportEntryText } from '../export';

export function CompletedReflection({ entry }: { entry: EntryRecord }) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const updateEntry = useEntriesStore((state) => state.updateEntry);
  const deleteEntry = useEntriesStore((state) => state.deleteEntry);
  const [showConversation, setShowConversation] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [takeaway, setTakeaway] = useState(entry.takeaway ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  async function saveEdits() {
    setSaving(true);
    setError(null);
    try {
      await updateEntry(entry.id, {
        entryType: 'reflection',
        title,
        content: entry.content,
        plainText: entry.plainText,
        reflectionType: entry.reflectionType,
        conversationTurns: entry.conversationTurns,
        takeaway: takeaway.trim() || null,
        completedAt: entry.completedAt?.toISOString() ?? new Date().toISOString(),
        relationships: {
          goalIds: entry.goals.map((goal) => goal.id),
          categoryIds: entry.categoryIds,
          milestoneIds: entry.milestones.map((milestone) => milestone.id),
        },
      });
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save reflection');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await deleteEntry(entry.id);
      router.replace('/(app)/entries?tab=reflections' as never);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete reflection');
    }
  }

  async function exportAction(action: 'pdf' | 'text' | 'copy') {
    setExportMessage(null);
    try {
      if (action === 'pdf') exportEntryPdf(title, entry.plainText);
      if (action === 'text') exportEntryText(title, entry.plainText);
      if (action === 'copy') await copyEntryText(title, entry.plainText);
      setExportMessage(action === 'copy' ? 'Copied to clipboard.' : 'Export started.');
    } catch (exportError) {
      setExportMessage(exportError instanceof Error ? exportError.message : 'Export failed');
    }
  }

  return (
    <View style={{ backgroundColor: colors.background.page, flex: 1, minHeight: 0 }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.background.card,
          borderBottomColor: colors.border.divider,
          borderBottomWidth: 1,
          flexDirection: 'row',
          gap: 12,
          minHeight: 64,
          paddingHorizontal: compact ? 14 : 22,
        }}
      >
        <Pressable
          accessibilityLabel="Back to Reflections"
          onPress={() => router.replace('/(app)/entries?tab=reflections' as never)}
        >
          <Ionicons name="arrow-back" color={colors.text.primary} size={22} />
        </Pressable>
        <Typography variant="nav-title" numberOfLines={1} style={{ flex: 1 }}>
          Reflection
        </Typography>
        <Button onPress={() => setExportOpen(true)} size="compact" variant="secondary">
          Export
        </Button>
        <Button onPress={() => setEditing((current) => !current)} size="compact" variant="secondary">
          {editing ? 'Cancel' : 'Edit'}
        </Button>
        <Pressable accessibilityLabel="Delete reflection" onPress={() => setDeleteConfirmOpen(true)}>
          <Ionicons name="trash-outline" color={colors.feedback.danger.text} size={20} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          alignSelf: 'center',
          gap: 22,
          maxWidth: 820,
          padding: compact ? 20 : 40,
          paddingBottom: 80,
          width: '100%',
        }}
      >
        <View>
          {editing ? (
            <TextInput
              accessibilityLabel="Reflection title"
              onChangeText={setTitle}
              style={{
                borderBottomColor: colors.border.input,
                borderBottomWidth: 1,
                color: colors.text.primary,
                fontFamily: 'Inter-SemiBold',
                fontSize: compact ? 26 : 34,
                outlineStyle: 'solid',
                outlineWidth: 0,
                paddingVertical: 8,
              }}
              value={title}
            />
          ) : (
            <Typography
              variant="heading"
              style={{ fontFamily: 'Inter-SemiBold', fontSize: compact ? 28 : 36 }}
            >
              {title}
            </Typography>
          )}
          <Typography variant="caption" style={{ marginTop: 8 }}>
            {(entry.completedAt ?? entry.updatedAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Typography>
          {(entry.goals.length || entry.milestones.length) ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
              {entry.goals.map((goal) => (
                <View key={goal.id} style={{ backgroundColor: colors.background.input, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Typography variant="caption">{goal.title}</Typography>
                </View>
              ))}
              {entry.milestones.map((milestone) => (
                <View key={milestone.id} style={{ backgroundColor: colors.background.input, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Typography variant="caption">{milestone.title}</Typography>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ gap: 12 }}>
          <Typography variant="eyebrow">YOUR REFLECTION</Typography>
          {entry.conversationTurns.filter((turn) => turn.role === 'user').map((turn) => (
            <Card key={turn.id}>
              <Typography variant="body" style={{ lineHeight: 24 }}>{turn.content}</Typography>
            </Card>
          ))}
        </View>

        <Card padding="spacious">
          <Typography variant="eyebrow">TAKEAWAY</Typography>
          {editing ? (
            <TextInput
              accessibilityLabel="Your reflection takeaway"
              multiline
              onChangeText={setTakeaway}
              placeholder="Add an optional takeaway in your own words."
              placeholderTextColor={colors.text.muted}
              style={{
                borderColor: colors.border.input,
                borderRadius: 12,
                borderWidth: 1,
                color: colors.text.primary,
                fontFamily: 'Inter-Regular',
                lineHeight: 23,
                marginTop: 12,
                minHeight: 100,
                outlineStyle: 'solid',
                outlineWidth: 0,
                padding: 12,
                textAlignVertical: 'top',
              }}
              value={takeaway}
            />
          ) : (
            <Typography variant="body" style={{ marginTop: 10 }}>
              {takeaway || 'No takeaway added. This is always optional and user-authored.'}
            </Typography>
          )}
        </Card>

        {editing ? (
          <Button disabled={saving} loading={saving} onPress={() => void saveEdits()} style={{ alignSelf: 'flex-start' }}>
            Save changes
          </Button>
        ) : null}
        {error ? (
          <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.danger.text }}>
            {error}
          </Typography>
        ) : null}

        <View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowConversation((current) => !current)}
            style={{ alignItems: 'center', flexDirection: 'row', gap: 7 }}
          >
            <Ionicons
              name={showConversation ? 'chevron-down' : 'chevron-forward'}
              color={colors.text.secondary}
              size={18}
            />
            <Typography variant="emphasis-sm">Original guided conversation</Typography>
          </Pressable>
          {showConversation ? (
            <View style={{ gap: 10, marginTop: 14 }}>
              {entry.conversationTurns.map((turn) => (
                <View
                  key={turn.id}
                  style={{
                    alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
                    backgroundColor: turn.role === 'user'
                      ? colors.background.selectedRow
                      : colors.background.card,
                    borderColor: colors.border.subtle,
                    borderRadius: 14,
                    borderWidth: 1,
                    maxWidth: '84%',
                    padding: 12,
                  }}
                >
                  <Typography variant="caption" style={{ marginBottom: 4 }}>
                    {turn.role === 'user' ? 'You' : 'Ohara'}
                  </Typography>
                  <Typography variant="body">{turn.content}</Typography>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={exportOpen}
        onClose={() => setExportOpen(false)}
        closeOnBackdropPress
        showCloseButton={false}
      >
        <Typography variant="title">Export reflection</Typography>
        <View style={{ gap: 8, marginTop: 16 }}>
          <Button onPress={() => void exportAction('pdf')} variant="secondary">Export as PDF</Button>
          <Button onPress={() => void exportAction('text')} variant="secondary">Export as plain text</Button>
          <Button onPress={() => void exportAction('copy')} variant="secondary">Copy text</Button>
        </View>
        {exportMessage ? <Typography variant="caption" style={{ marginTop: 12 }}>{exportMessage}</Typography> : null}
        <Button onPress={() => setExportOpen(false)} style={{ marginTop: 16 }}>Done</Button>
      </Modal>

      <Modal
        visible={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        closeOnBackdropPress
        showCloseButton={false}
        cancelText="Cancel"
        confirmText="Delete reflection"
        confirmVariant="destructive"
        onConfirm={() => void remove()}
      >
        <Typography variant="title">Delete this reflection?</Typography>
        <Typography variant="body" style={{ marginTop: 8 }}>
          This permanently removes the reflection and its entry relationships.
        </Typography>
      </Modal>
    </View>
  );
}
