import type { GoalWithDetails } from '@/features/goals/types';
import type { GoalCategory } from '@/lib/goals/schema';
import type { EntryRecord } from '@/features/entries/types';
import type { Vault, VaultItem } from '@/types/vault';

export type ProjectStatus = 'active' | 'complete' | 'archived';

export type Project = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  period_key: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectWithGoals = Project & {
  goals: GoalWithDetails[];
};

export type ProjectVisualCategory = GoalCategory | 'mixed';

export type ProjectSummary = Project & {
  activeGoalCount: number;
  goalNames: string[];
  lastActivityAt: string;
  vaultItemCount: number;
  visualCategory: ProjectVisualCategory;
};

export type ProjectVaultItem = VaultItem & {
  directProjectItem: boolean;
  origins: Array<{ goalId: string; goalTitle: string }>;
};

export type ProjectActivity = {
  id: string;
  label: string;
  occurredAt: string;
  origin?: string;
};

export type ProjectWorkspace = ProjectWithGoals & {
  activity: ProjectActivity[];
  entries: EntryRecord[];
  partialErrors: string[];
  vault: Vault | null;
  vaultItems: ProjectVaultItem[];
};
