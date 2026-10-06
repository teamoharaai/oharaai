import { router, useLocalSearchParams } from 'expo-router';
import { EntryDetailScreen } from '@/features/entries/components/EntryDetailScreen';

export default function JournalDetailRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <EntryDetailScreen
      entryId={entryId ?? ''}
      onBack={() => router.replace('/(app)/journal' as never)}
    />
  );
}
