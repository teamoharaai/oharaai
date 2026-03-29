import type { Measurable } from '../types';

export function useMeasurables(_goalId: string): { measurables: Measurable[]; isLoading: boolean } {
  return { measurables: [], isLoading: false };
}
