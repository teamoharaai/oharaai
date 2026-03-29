import type { GoalTheme } from '@/constants/themes';

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';
export type MeasurableType = 'counter' | 'habit' | 'checklist';
export type MeasurableFrequency = 'daily' | 'weekly' | 'monthly' | 'once';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: string;
  colorTheme: GoalTheme;
  deadline?: Date;
  isPublic: boolean;
  progress: number;
  status: GoalStatus;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Measurable {
  id: string;
  goalId: string;
  title: string;
  type: MeasurableType;
  targetValue?: number;
  targetUnit?: string;
  frequency?: MeasurableFrequency;
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
