import type { GoalTheme } from '@/constants/themes';
import type {
  GoalCategory,
  GoalDbStatus,
  GoalMeasurableFrequency,
  GoalMeasurableType,
  GoalSmartData,
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
  isPublic: boolean;
  progress: number;
  status: GoalStatus;
  aiGenerated: boolean;
  smartData: GoalSmartData | null;
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
}

export interface ActivityEntry {
  id: string;
  goalId?: string;
  text: string;
  aiResponse?: string;
  mediaUrl?: string;
  classification?: string;
  type: 'journal' | 'milestone' | 'measurable';
  createdAt: Date;
}
