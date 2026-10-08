import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuthStore } from '@/features/auth/store';
import type { CalendarItem, CalendarRange } from '../types';
import {
  clearAppleCalendarPreferences,
  loadAppleCalendarPreferences,
  saveAppleCalendarPreferences,
} from '../providers/apple-preferences';
import { appleEventKitProvider } from '../providers/apple-eventkit';
import type { CalendarAccessState, ProviderCalendar } from '../providers/types';
import { fetchCalendarItems } from '../services/calendar-service';

export function useCalendarItems(range: CalendarRange) {
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const [oharaItems, setOharaItems] = useState<CalendarItem[]>([]);
  const [externalItems, setExternalItems] = useState<CalendarItem[]>([]);
  const [accessState, setAccessState] = useState<CalendarAccessState>('unavailable');
  const [providerConnected, setProviderConnected] = useState(false);
  const [calendars, setCalendars] = useState<ProviderCalendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [isOharaLoading, setIsOharaLoading] = useState(true);
  const [isProviderLoading, setIsProviderLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rangeKey = `${range.startDate}:${range.endDate}:${range.timezone}`;
  const selectedKey = selectedCalendarIds.join(':');
  const rangeRef = useRef(range);
  const lastExternalReadKeyRef = useRef<string | null>(null);
  rangeRef.current = range;

  const loadOhara = useCallback(async () => {
    setIsOharaLoading(true);
    try {
      setOharaItems(await fetchCalendarItems(rangeRef.current));
      setError((current) => current === 'OHARA calendar items are temporarily unavailable.' ? null : current);
    } catch {
      setError('OHARA calendar items are temporarily unavailable.');
    } finally {
      setIsOharaLoading(false);
    }
  }, []);

  const loadExternalEvents = useCallback(async (
    availableCalendars: ProviderCalendar[],
    selectedIds: string[],
    force = false,
  ) => {
    const currentRange = rangeRef.current;
    const readKey = `${currentRange.startDate}:${currentRange.endDate}:${currentRange.timezone}:${[...selectedIds].sort().join(',')}`;
    if (!force && lastExternalReadKeyRef.current === readKey) return;
    lastExternalReadKeyRef.current = readKey;
    const selected = availableCalendars.filter((calendar) => selectedIds.includes(calendar.id));
    if (!selected.length) {
      setExternalItems([]);
      return;
    }
    setIsProviderLoading(true);
    try {
      setExternalItems(await appleEventKitProvider.listEvents(rangeRef.current, selected));
      setError((current) => current === 'Apple Calendar is temporarily unavailable.' ? null : current);
    } catch {
      setExternalItems([]);
      setError((current) => current ?? 'Apple Calendar is temporarily unavailable.');
    } finally {
      setIsProviderLoading(false);
    }
  }, []);

  const refreshProvider = useCallback(async () => {
    if (!userId || Platform.OS !== 'ios') {
      setAccessState('unavailable');
      setProviderConnected(false);
      setCalendars([]);
      setSelectedCalendarIds([]);
      setExternalItems([]);
      return;
    }

    let nextAccess: CalendarAccessState;
    try {
      nextAccess = await appleEventKitProvider.getAccessState();
    } catch {
      nextAccess = 'unavailable';
    }
    setAccessState(nextAccess);
    const preferences = await loadAppleCalendarPreferences(userId);
    if (nextAccess !== 'granted' || !preferences.connected) {
      if (preferences.connected && nextAccess !== 'undetermined') {
        await clearAppleCalendarPreferences(userId);
      }
      setProviderConnected(false);
      setCalendars([]);
      setSelectedCalendarIds([]);
      setExternalItems([]);
      return;
    }

    setIsProviderLoading(true);
    try {
      const nextCalendars = await appleEventKitProvider.listCalendars();
      const validIds = preferences.selectedCalendarIds.filter((id) => nextCalendars.some((calendar) => calendar.id === id));
      if (validIds.length !== preferences.selectedCalendarIds.length) {
        await saveAppleCalendarPreferences(userId, { connected: true, selectedCalendarIds: validIds });
      }
      setProviderConnected(true);
      setCalendars(nextCalendars);
      setSelectedCalendarIds(validIds);
      await loadExternalEvents(nextCalendars, validIds, true);
    } catch {
      setExternalItems([]);
      setError((current) => current ?? 'Apple Calendar is temporarily unavailable.');
    } finally {
      setIsProviderLoading(false);
    }
  }, [loadExternalEvents, userId]);

  useEffect(() => { void loadOhara(); }, [loadOhara, rangeKey]);
  useEffect(() => { void refreshProvider(); }, [refreshProvider]);

  useEffect(() => {
    if (!providerConnected || accessState !== 'granted') return;
    void loadExternalEvents(calendars, selectedCalendarIds);
  // Calendar enumeration is intentionally excluded: a visible-range change
  // re-reads events from the already-enumerated selection, not every calendar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessState, providerConnected, rangeKey, selectedKey]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshProvider();
    });
    return () => subscription.remove();
  }, [refreshProvider]);

  const connect = useCallback(async () => {
    if (!userId) return 'unavailable' as CalendarAccessState;
    const next = await appleEventKitProvider.requestAccess();
    setAccessState(next);
    if (next !== 'granted') {
      setProviderConnected(false);
      setExternalItems([]);
      return next;
    }
    const nextCalendars = await appleEventKitProvider.listCalendars();
    const primary = nextCalendars.find((calendar) => calendar.isPrimary)?.id;
    const initialSelection = primary ? [primary] : [];
    await saveAppleCalendarPreferences(userId, { connected: true, selectedCalendarIds: initialSelection });
    setProviderConnected(true);
    setCalendars(nextCalendars);
    setSelectedCalendarIds(initialSelection);
    await loadExternalEvents(nextCalendars, initialSelection);
    return next;
  }, [loadExternalEvents, userId]);

  const saveSelection = useCallback(async (ids: string[]) => {
    if (!userId) return;
    const validIds = [...new Set(ids)].filter((id) => calendars.some((calendar) => calendar.id === id));
    await saveAppleCalendarPreferences(userId, { connected: true, selectedCalendarIds: validIds });
    setSelectedCalendarIds(validIds);
    await loadExternalEvents(calendars, validIds);
  }, [calendars, loadExternalEvents, userId]);

  const disconnect = useCallback(async () => {
    if (userId) await clearAppleCalendarPreferences(userId);
    setProviderConnected(false);
    setSelectedCalendarIds([]);
    setExternalItems([]);
    lastExternalReadKeyRef.current = null;
  }, [userId]);

  const refresh = useCallback(async () => {
    await Promise.all([loadOhara(), refreshProvider()]);
  }, [loadOhara, refreshProvider]);

  return {
    accessState,
    calendars,
    canConnectApple: Platform.OS === 'ios',
    connect,
    disconnect,
    error,
    externalItems,
    isLoading: isOharaLoading || isProviderLoading,
    items: useMemo(() => [...oharaItems, ...externalItems], [externalItems, oharaItems]),
    oharaItems,
    providerConnected,
    refresh,
    saveSelection,
    selectedCalendarIds,
  };
}
