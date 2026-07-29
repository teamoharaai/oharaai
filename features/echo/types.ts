import type { EchoBrt } from '@/types/brt';
import type { BrtCategory } from '@/lib/utils/resolveBrt';

export type { EchoBrt };
export type { BrtCategory };

export type EchoEmotion = {
  valence: number;
  energy: 'low' | 'medium' | 'high';
  clarity: 'low' | 'high';
  primary: string;
};

export interface EchoEntry {
  id: string;
  userId: string;
  goalId: string | null;
  goalTitle?: string;
  folderId?: string;
  folderName?: string;
  title?: string;
  content: string;
  mediaUrl?: string;
  aiInsightRequested: boolean;
  brt?: EchoBrt;
  brtCategory?: BrtCategory;
  emotion?: EchoEmotion;
  modelVersion?: string;
  visibility: 'private' | 'shared';
  confidence?: number;
  themes?: string[];
  aiResponse?: string;
  processedAt?: Date;
  createdAt: Date;
  embedding?: number[] | null;
  embedding_text?: string | null;
  embedding_model?: string | null;
}

export interface InsightRequest {
  entryId: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
}

export type EchoGoalOption = {
  id: string;
  title: string;
  projectId: string | null;
  projectTitle: string | null;
};

export type EchoContainerOption =
  | {
      type: 'goal';
      id: string;
      label: string;
      title: string;
      projectId: string | null;
      projectTitle: string | null;
    }
  | {
      type: 'folder';
      id: string;
      label: string;
      name: string;
      isGeneral: boolean;
    };
