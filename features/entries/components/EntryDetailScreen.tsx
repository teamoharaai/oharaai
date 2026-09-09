import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { fetchEntry } from '../services/entry-service';
import { useEntriesStore } from '../store';
import type { EntryRecord } from '../types';
import { NoteEditor } from './NoteEditor';
import { CompletedReflection } from './CompletedReflection';
import { QuickReflectionEditor } from './QuickReflectionEditor';
import { isQuickReflection } from '../utils';
import { router } from 'expo-router';

export function EntryDetailScreen({
  entryId,
  embedded = false,
  showBack = true,
  onBack,
}: {
  entryId: string;
  embedded?: boolean;
  showBack?: boolean;
  onBack?: () => void;
}) {
  const colors = useThemeColors();
  const cached = useEntriesStore((state) => state.entries.find((entry) => entry.id === entryId));
  const upsertEntry = useEntriesStore((state) => state.upsertEntry);
  const [entry, setEntry] = useState<EntryRecord | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cached) {
      setEntry(cached);
      setError(null);
      setLoading(false);
      return;
    }
    let active = true;
    void fetchEntry(entryId)
      .then((result) => {
        if (!active) return;
        setEntry(result);
        if (result) upsertEntry(result);
        else setError('This entry is no longer available.');
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load entry');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [cached, entryId, upsertEntry]);

  if (loading) {
    return (
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }
  if (error || !entry) {
    return (
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 }}>
        <Typography variant="title">Entry unavailable</Typography>
        <Typography variant="body" style={{ marginTop: 8 }}>{error}</Typography>
        <Button onPress={() => onBack ? onBack() : router.replace('/(app)/entries' as never)} style={{ marginTop: 18 }}>
          Back to Entries
        </Button>
      </View>
    );
  }
  if (entry.entryType === 'note') {
    return (
      <NoteEditor
        embedded={embedded}
        entryId={entry.id}
        onBack={onBack}
        showBack={showBack}
      />
    );
  }
  if (isQuickReflection(entry)) {
    return <QuickReflectionEditor entry={entry} onBack={onBack ?? (() => router.replace('/(app)/entries' as never))} showBack={showBack} />;
  }
  return <CompletedReflection entry={entry} onBack={onBack} showBack={showBack} />;
}
