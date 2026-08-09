import { Redirect, useLocalSearchParams } from 'expo-router';

export default function EchoRoute() {
  const params = useLocalSearchParams<{
    entryId?: string | string[];
    goalId?: string | string[];
  }>();
  const entryId = Array.isArray(params.entryId) ? params.entryId[0] : params.entryId;
  const goalId = Array.isArray(params.goalId) ? params.goalId[0] : params.goalId;
  return (
    <Redirect
      href={entryId
        ? (`/(app)/entries/${entryId}` as never)
        : goalId
          ? ({
              pathname: '/(app)/entries/reflection',
              params: { type: 'goal', goalId },
            } as never)
        : ('/(app)/entries' as never)}
    />
  );
}
