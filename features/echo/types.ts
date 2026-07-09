import type { EchoBrt } from '@/types/brt';

export type { EchoBrt };

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
  folderName?: string;
  title?: string;
  content: string;
  mediaUrl?: string;
  aiInsightRequested: boolean;
  brt?: EchoBrt;
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
