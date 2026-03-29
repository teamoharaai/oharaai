import type { InsightRequest } from '../types';

export function useInsightRequest(_entryId: string): { request: InsightRequest | null; isLoading: boolean } {
  return { request: null, isLoading: false };
}
