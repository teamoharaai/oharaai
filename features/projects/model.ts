import type { GoalWithDetails } from '@/features/goals/types';
import type { Task } from '@/features/tasks/types';
import type { ProjectActivity, ProjectTaskPreview, ProjectVisualCategory, ProjectVaultItem } from './types';

export function deriveProjectVisualCategory(goals: readonly Pick<GoalWithDetails, 'category' | 'status'>[]): ProjectVisualCategory {
  const counts = new Map<string, number>();
  for (const goal of goals) {
    if (goal.status !== 'active') continue;
    counts.set(goal.category, (counts.get(goal.category) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length || (ranked[1] && ranked[0][1] === ranked[1][1])) return 'mixed';
  return ranked[0][0] as ProjectVisualCategory;
}

export function buildProjectVaultActivity(items: readonly ProjectVaultItem[]): ProjectActivity[] {
  return items.map((item) => ({
    id: `vault-${item.id}`,
    label: item.contentKind === 'sticky_note'
      ? `Sticky Note created — ${item.title || 'Untitled'}`
      : item.itemType === 'link' || item.itemType === 'document'
        ? `Source added — ${item.title || 'Untitled'}`
        : `Vault item added — ${item.title || 'Untitled'}`,
    occurredAt: item.createdAt,
    origin: item.origins.length
      ? `From: ${item.origins.map((origin) => origin.goalTitle).join(', ')}`
      : 'Project item',
  }));
}

export function mergeProjectActivity(groups: readonly ProjectActivity[][], limit = 30): ProjectActivity[] {
  const seen = new Set<string>();
  return groups.flat().filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, limit);
}

export function selectProjectTaskPreviews(
  groups: readonly { goalId: string; goalTitle: string; tasks: readonly Task[] }[],
  now = new Date(),
  limit = 5,
): ProjectTaskPreview[] {
  const today = now.toISOString().slice(0, 10);
  const rank = { overdue: 0, today: 1, upcoming: 2, anytime: 3 } as const;
  return groups.flatMap(({ goalId, goalTitle, tasks }) => tasks.flatMap((task): ProjectTaskPreview[] => {
    if (task.status !== 'active') return [];
    const pending = task.occurrences
      .filter((occurrence) => occurrence.status === 'pending')
      .sort((a, b) => (a.scheduledLocalDate ?? '9999').localeCompare(b.scheduledLocalDate ?? '9999'))[0] ?? null;
    const date = pending?.scheduledLocalDate ?? task.dueDate;
    const timing: ProjectTaskPreview['timing'] = !date ? 'anytime' : date < today ? 'overdue' : date === today ? 'today' : 'upcoming';
    return [{ id: task.id, goalId, goalTitle, occurrence: pending, title: task.title, timing, assignedTo: task.assignedTo ?? null }];
  })).sort((a, b) => rank[a.timing] - rank[b.timing]
    || (a.occurrence?.scheduledLocalDate ?? '9999').localeCompare(b.occurrence?.scheduledLocalDate ?? '9999'))
    .slice(0, limit);
}
