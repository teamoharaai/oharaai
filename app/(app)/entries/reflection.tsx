import { useLocalSearchParams } from 'expo-router';
import { GuidedReflection } from '@/features/entries/components/GuidedReflection';
import type { ReflectionType } from '@/features/entries/types';

const REFLECTION_TYPES: ReflectionType[] = ['week', 'goal', 'milestone', 'open'];

export default function GuidedReflectionRoute() {
  const params = useLocalSearchParams<{
    type?: string | string[];
    goalId?: string | string[];
  }>();
  const typeParam = Array.isArray(params.type) ? params.type[0] : params.type;
  const goalId = Array.isArray(params.goalId) ? params.goalId[0] : params.goalId;
  const type = REFLECTION_TYPES.includes(typeParam as ReflectionType)
    ? typeParam as ReflectionType
    : 'open';
  return <GuidedReflection initialGoalId={goalId} initialType={type} />;
}
