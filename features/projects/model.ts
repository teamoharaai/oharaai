import type { GoalWithDetails } from '@/features/goals/types';
import type { ProjectActivity, ProjectVisualCategory, ProjectVaultItem } from './types';

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
