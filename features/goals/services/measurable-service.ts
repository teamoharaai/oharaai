import type { Measurable, MeasurableLog } from '../types';

export async function fetchMeasurables(_goalId: string): Promise<Measurable[]> {
  // TODO: implement Supabase query
  return [];
}

export async function logMeasurable(_measurableId: string, _value: number, _note?: string): Promise<MeasurableLog | null> {
  // TODO: implement Supabase insert
  return null;
}
