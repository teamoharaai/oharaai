export type Classification = 'GROWTH' | 'REALITY' | 'OBSTACLE';

export interface StarlogEntry {
  id: string;
  userId: string;
  goalId: string | null;
  goalTitle?: string;
  content: string;
  mediaUrl?: string;
  aiInsightRequested: boolean;
  classification?: Classification;
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
