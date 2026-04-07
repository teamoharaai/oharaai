import type { GoalTheme } from '@/constants/themes';
import type {
  GoalCategory,
  GoalDbStatus,
  GoalMeasurableFrequency,
  GoalMeasurableType,
  GoalSmartData,
  GoalVisibility,
} from '@/lib/goals/schema';

export type GoalStatus = GoalDbStatus;
export type MeasurableType = GoalMeasurableType;
export type MeasurableFrequency = GoalMeasurableFrequency;

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  colorTheme: GoalTheme;
  deadline: Date | null;
  visibility: GoalVisibility;
  progress: number;
  status: GoalStatus;
  aiGenerated: boolean;
  smartData: GoalSmartData | null;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Measurable {
  id: string;
  goalId: string;
  title: string;
  type: MeasurableType;
  targetValue: number | null;
  targetUnit: string | null;
  frequency: MeasurableFrequency | null;
  currentValue: number;
  isAiSuggested: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeasurableLog {
  id: string;
  measurableId: string;
  value: number;
  note?: string;
  loggedAt: Date;
}

export interface GoalWithMeasurables extends Goal {
  measurables: Measurable[];
  vaultItemCount: number;
  echoLinkCount: number;
  latestBrtTags: string[] | null;
}

export interface MeasurableInput {
  title: string;
  type: MeasurableType;
  targetValue?: number | null;
  targetUnit?: string | null;
  frequency?: MeasurableFrequency | null;
  sortOrder?: number;
}

export interface MeasurableUpdates {
  title?: string;
  targetValue?: number | null;
  targetUnit?: string | null;
  frequency?: MeasurableFrequency | null;
  currentValue?: number;
}

export interface ActivityEntry {
  id: string;
  goalId?: string;
  text: string;
  aiResponse?: string;
  mediaUrl?: string;
  brt?: {
    bud: string[];
    rose: string[];
    thorn: string[];
  };
  type: 'journal' | 'milestone' | 'measurable';
  createdAt: Date;
}

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
