import { useLocalSearchParams } from 'expo-router';
import { EntriesScreen } from '@/features/entries/components/EntriesScreen';

export default function NoteDetailRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = Array.isArray(params.id) ? params.id[0] : params.id;
  return <EntriesScreen feature="notes" selectedEntryId={entryId ?? ''} />;
}
