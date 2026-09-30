import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { fetchEntryDetail } from '../services/entry-service';
import { useEntriesStore } from '../store';
import type { EntryDetailDto } from '../types';
import { NoteEditor } from './NoteEditor';
import { CompletedReflection } from './CompletedReflection';
import { QuickReflectionEditor } from './QuickReflectionEditor';
import { isQuickReflection } from '../utils';
import { router } from 'expo-router';
import { SharedEntryReadView } from './SharedEntryReadView';

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
  const upsertEntry = useEntriesStore((state) => state.upsertEntry);
  const [detail, setDetail] = useState<EntryDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void fetchEntryDetail(entryId)
      .then((result) => {
        if (!active) return;
        setDetail(result);
        if (result?.capabilities.canEdit) upsertEntry(result.entry);
        if (!result) setError('This entry is no longer available.');
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load entry');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [entryId, upsertEntry]);

  if (loading) {
    return (
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }
  if (error || !detail) {
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
  const entry = detail.entry;
  const back = onBack ?? (() => router.replace(entry.entryType === 'note' ? '/(app)/notes' as never : '/(app)/reflections' as never));
  if (!detail.capabilities.canEdit) {
    return <SharedEntryReadView detail={detail} onBack={back} />;
  }
  if (entry.entryType === 'note') {
    return (
      <NoteEditor
        embedded={embedded}
        entryId={entry.id}
        onBack={back}
        showBack={showBack}
      />
    );
  }
  if (isQuickReflection(entry)) {
    return <QuickReflectionEditor entry={entry} onBack={back} showBack={showBack} />;
  }
  return <CompletedReflection entry={entry} onBack={back} showBack={showBack} />;
}
