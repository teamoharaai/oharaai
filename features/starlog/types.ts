export type Classification = 'GROWTH' | 'REALITY' | 'OBSTACLE';

export interface StarlogEntry {
  id: string;
  userId: string;
  goalId?: string;
  rawText: string;
  mediaUrl?: string;
  aiOptedIn: boolean;
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
