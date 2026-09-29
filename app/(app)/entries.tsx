import { Redirect, useLocalSearchParams } from 'expo-router';

export default function EntriesRoute() {
  const params = useLocalSearchParams<{
    create?: string | string[];
    goalId?: string | string[];
    projectId?: string | string[];
    view?: string | string[];
  }>();
  const value = (candidate: string | string[] | undefined) => Array.isArray(candidate) ? candidate[0] : candidate;
  const reflection = value(params.view) === 'reflection' || value(params.create) === 'reflection';
  return <Redirect href={{
    pathname: reflection ? '/(app)/reflections' : '/(app)/notes',
    params: {
      ...(value(params.create) ? { create: reflection ? 'new' : 'note' } : {}),
      ...(value(params.goalId) ? { goalId: value(params.goalId) } : {}),
      ...(value(params.projectId) ? { projectId: value(params.projectId) } : {}),
    },
  } as never} />;
}
