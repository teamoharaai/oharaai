import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ReflectionDetailRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = Array.isArray(params.id) ? params.id[0] : params.id;
  return <Redirect href={{ pathname: '/(app)/journal/[id]', params: { id: entryId ?? '' } } as never} />;
}
