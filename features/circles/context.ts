import type { ProjectSummary } from '@/features/projects/types';

type SharedProjectShape = Pick<ProjectSummary, 'memberCount' | 'mode' | 'status'>;

/**
 * Circles only surfaces collaborative Projects returned by the caller's
 * RLS-authorized Project query. Personal and archived work stays out of the
 * social context even if it was present in an older cached result.
 */
export function selectCirclesSharedProjects<T extends SharedProjectShape>(
  projects: readonly T[],
): T[] {
  return projects.filter((project) => (
    project.status !== 'archived'
    && project.mode !== 'personal'
    && project.memberCount > 1
  ));
}
