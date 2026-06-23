import { useLocalSearchParams } from 'expo-router';
import { EchoDetailScreen } from '@/features/echo/components/EchoDetailScreen';

export default function EchoEntryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = Array.isArray(id) ? id[0] : (id ?? '');

  return <EchoDetailScreen entryId={entryId} />;
}
