export function goalWorkspaceHref(goalId: string): string {
  return `/(app)/goals?goal=${encodeURIComponent(goalId)}`;
}

export function getGoalWorkspaceSelection(params: {
  goal?: string | string[];
  selected?: string | string[];
}): string | null {
  const canonical = Array.isArray(params.goal) ? params.goal[0] : params.goal;
  const legacy = Array.isArray(params.selected) ? params.selected[0] : params.selected;
  return canonical || legacy || null;
}
