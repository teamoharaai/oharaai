import type { GoalWithDetails } from '@/features/goals/types';
import type { GoalCategory } from '@/lib/goals/schema';
import type { EntryRecord } from '@/features/entries/types';
import type { Vault, VaultItem } from '@/types/vault';
import type { TaskOccurrence } from '@/features/tasks/types';

export type ProjectStatus = 'active' | 'complete' | 'archived';
export type ProjectMode = 'personal' | 'team' | 'guide';
export type ProjectRole = 'owner' | 'admin' | 'member' | 'guide';
export const PROJECT_MEMBER_LIMIT = 3;

export type Project = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  mode: ProjectMode;
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
  memberCount: number;
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
  actorId?: string | null;
  actorName?: string;
};

export type ProjectComment = {
  id: string;
  authorId: string;
  targetType: 'goal' | 'task' | 'milestone' | 'entry' | 'source';
  targetId: string;
  body: string;
  createdAt: string;
};

export type ProjectTaskPreview = {
  id: string;
  goalId: string;
  goalTitle: string;
  occurrence: TaskOccurrence | null;
  title: string;
  timing: 'overdue' | 'today' | 'upcoming' | 'anytime';
  assignedTo: string | null;
};

export type ProjectMember = {
  userId: string;
  role: ProjectRole;
  relationshipLabel: string | null;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: string;
};

export type ProjectInvitation = {
  id: string;
  invitedUserId: string | null;
  invitedEmail: string | null;
  role: Exclude<ProjectRole, 'owner'>;
  relationshipLabel: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
  expiresAt: string;
  createdAt: string;
};

export type IncomingProjectInvitation = {
  id: string;
  projectId: string;
  projectTitle: string;
  inviterName: string;
  role: Exclude<ProjectRole, 'owner'>;
  relationshipLabel: string | null;
  expiresAt: string;
  createdAt: string;
};

export type ProjectCollaboration = {
  role: ProjectRole;
  capabilities: string[];
  members: ProjectMember[];
  invitations: ProjectInvitation[];
};

export type ProjectGoalMomentum = {
  goalId: string;
  displayedValue: number | null;
  weeklyChange: number | null;
  status: string | null;
};

export type ProjectWorkspace = ProjectWithGoals & {
  activity: ProjectActivity[];
  entries: EntryRecord[];
  partialErrors: string[];
  taskPreviews: ProjectTaskPreview[];
  collaboration: ProjectCollaboration;
  comments: ProjectComment[];
  goalMomentum: ProjectGoalMomentum[];
  vault: Vault | null;
  vaultItems: ProjectVaultItem[];
};
