import type { GoalWithMeasurables } from '@/features/goals/types';

export type ProjectStatus = 'active' | 'complete' | 'archived';

export type Project = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

export type ProjectWithGoals = Project & {
  goals: GoalWithMeasurables[];
};
