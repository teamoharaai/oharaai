export type EchoBrt = {
  bud: string[];
  rose: string[];
  thorn: string[];
};

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
}

export interface InsightRequest {
  entryId: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
}
