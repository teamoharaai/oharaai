import { router, useLocalSearchParams } from 'expo-router';
import { EntryDetailScreen } from '@/features/entries/components/EntryDetailScreen';
import { goalWorkspaceHref } from '@/features/goals/navigation';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function NoteDetailRoute() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    goalId?: string | string[];
    projectId?: string | string[];
  }>();
  const entryId = firstParam(params.id);
  const goalId = firstParam(params.goalId);
  const projectId = firstParam(params.projectId);
  return (
    <EntryDetailScreen
      entryId={entryId ?? ''}
      onBack={() => {
        if (goalId) {
          router.replace(goalWorkspaceHref(goalId, undefined, { projectId }) as never);
          return;
        }
        if (projectId) {
          router.replace(`/(app)/projects/${projectId}` as never);
          return;
        }
        router.replace('/(app)/notes' as never);
      }}
    />
  );
}
