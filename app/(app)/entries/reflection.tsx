import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyReflectionRoute() {
  const params = useLocalSearchParams<{ goalId?: string | string[] }>();
  const goalId = Array.isArray(params.goalId) ? params.goalId[0] : params.goalId;
  return (
    <Redirect
      href={{
        pathname: '/(app)/journal',
        params: { create: 'new', ...(goalId ? { goalId } : {}) },
      } as never}
    />
  );
}
