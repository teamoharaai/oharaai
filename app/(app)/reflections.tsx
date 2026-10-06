import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ReflectionsRoute() {
  const params = useLocalSearchParams<{ create?: string | string[]; goalId?: string | string[]; projectId?: string | string[] }>();
  const value = (candidate: string | string[] | undefined) => Array.isArray(candidate) ? candidate[0] : candidate;
  return <Redirect href={{ pathname: '/(app)/journal', params: {
    ...(value(params.create) ? { create: value(params.create) } : {}),
    ...(value(params.goalId) ? { goalId: value(params.goalId) } : {}),
    ...(value(params.projectId) ? { projectId: value(params.projectId) } : {}),
  } } as never} />;
}
