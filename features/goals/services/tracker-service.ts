import type { Tracker, TrackerLog } from '../types';

export async function fetchTrackers(_goalId: string): Promise<Tracker[]> {
  // Tracker persistence currently lives in goal-service so goal cache updates
  // remain atomic. This boundary is reserved for a future extracted service.
  return [];
}

export async function logTracker(
  _trackerId: string,
  _value: number,
  _note?: string,
): Promise<TrackerLog | null> {
  // Logging currently flows through the authenticated goal API.
  return null;
}
