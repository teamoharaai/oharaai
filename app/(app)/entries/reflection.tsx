import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyReflectionRoute() {
  const params = useLocalSearchParams<{ goalId?: string | string[] }>();
  const goalId = Array.isArray(params.goalId) ? params.goalId[0] : params.goalId;
  return (
    <Redirect
      href={{
        pathname: '/(app)/entries',
        params: { create: 'reflection', ...(goalId ? { goalId } : {}) },
      } as never}
    />
  );
}
