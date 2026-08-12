import { Redirect, type Href, useLocalSearchParams } from 'expo-router';

import { goalWorkspaceHref } from '@/features/goals/navigation';

/**
 * Compatibility route for bookmarks and older links. Goal reading and editing now
 * live together in the canonical master-detail workspace at `/goals`.
 */
export default function LegacyGoalDetailRedirect() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const goalId = Array.isArray(id) ? id[0] : id;

  return (
    <Redirect
      href={(goalId ? goalWorkspaceHref(goalId) : '/(app)/goals') as Href}
    />
  );
}
