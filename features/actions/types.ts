export type ActionLogStatus = 'pending' | 'complete' | 'skipped';

export interface ActionLog {
  id: string;
  goalId: string;
  userId: string;
  actionText: string;
  status: ActionLogStatus;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}
