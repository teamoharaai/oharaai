import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppleCalendarPreferences = {
  connected: boolean;
  selectedCalendarIds: string[];
};

const EMPTY: AppleCalendarPreferences = { connected: false, selectedCalendarIds: [] };

function key(userId: string): string {
  return `ohara.apple-calendar.v1.${userId}`;
}

export function normalizeAppleCalendarPreferences(value: unknown): AppleCalendarPreferences {
  if (!value || typeof value !== 'object') return EMPTY;
  const candidate = value as Partial<AppleCalendarPreferences>;
  return {
    connected: candidate.connected === true,
    selectedCalendarIds: Array.isArray(candidate.selectedCalendarIds)
      ? [...new Set(candidate.selectedCalendarIds.filter((id): id is string => typeof id === 'string' && id.length > 0))]
      : [],
  };
}

export async function loadAppleCalendarPreferences(userId: string): Promise<AppleCalendarPreferences> {
  const raw = await AsyncStorage.getItem(key(userId));
  if (!raw) return EMPTY;
  try {
    return normalizeAppleCalendarPreferences(JSON.parse(raw));
  } catch {
    return EMPTY;
  }
}

export async function saveAppleCalendarPreferences(userId: string, value: AppleCalendarPreferences): Promise<void> {
  await AsyncStorage.setItem(key(userId), JSON.stringify(normalizeAppleCalendarPreferences(value)));
}

export async function clearAppleCalendarPreferences(userId: string): Promise<void> {
  await AsyncStorage.removeItem(key(userId));
}
