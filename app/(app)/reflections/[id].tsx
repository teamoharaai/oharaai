import { useLocalSearchParams } from 'expo-router';
import { ReflectionsScreen } from '@/features/entries/components/ReflectionsScreen';

export default function ReflectionDetailRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = Array.isArray(params.id) ? params.id[0] : params.id;
  return <ReflectionsScreen selectedEntryId={entryId} />;
}
