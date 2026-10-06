import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { fetchEntry } from '@/features/entries/services/entry-service';
import type { EntryType } from '@/features/entries/types';
import { useThemeColors } from '@/store/uiStore';

export default function EntryDetailRoute() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [entryType, setEntryType] = useState<EntryType | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!entryId) { setMissing(true); return; }
    void fetchEntry(entryId).then((entry) => {
      if (entry) setEntryType(entry.entryType);
      else setMissing(true);
    }).catch(() => setMissing(true));
  }, [entryId]);

  if (entryId && entryType) return <Redirect href={`/(app)/${entryType === 'note' ? 'notes' : 'journal'}/${entryId}` as never} />;
  return <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>{missing ? <Typography variant="body">Entry unavailable.</Typography> : <ActivityIndicator color={colors.accent.primary} />}</View>;
}
