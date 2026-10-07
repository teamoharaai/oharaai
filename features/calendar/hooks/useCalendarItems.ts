import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { CalendarItem, CalendarRange } from '../types';
import { appleEventKitProvider } from '../providers/apple-eventkit';
import type { CalendarAccessState } from '../providers/types';
import { fetchCalendarItems } from '../services/calendar-service';

export function useCalendarItems(range: CalendarRange) {
  const [oharaItems, setOharaItems] = useState<CalendarItem[]>([]);
  const [externalItems, setExternalItems] = useState<CalendarItem[]>([]);
  const [accessState, setAccessState] = useState<CalendarAccessState>('unavailable');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rangeKey = `${range.startDate}:${range.endDate}:${range.timezone}`;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [oharaResult, accessResult] = await Promise.allSettled([
      fetchCalendarItems(range),
      appleEventKitProvider.getAccessState(),
    ]);
    if (oharaResult.status === 'fulfilled') setOharaItems(oharaResult.value);
    else setError('OHARA calendar items are temporarily unavailable.');

    const nextAccess = accessResult.status === 'fulfilled' ? accessResult.value : 'unavailable';
    setAccessState(nextAccess);
    if (nextAccess === 'granted') {
      try {
        setExternalItems(await appleEventKitProvider.listEvents(range));
      } catch {
        // Provider failure is isolated; canonical OHARA items remain usable.
        setExternalItems([]);
        setError((current) => current ?? 'Apple Calendar is temporarily unavailable.');
      }
    } else {
      setExternalItems([]);
    }
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  useEffect(() => { void load(); }, [load]);

  const connect = useCallback(async () => {
    const next = await appleEventKitProvider.requestAccess();
    setAccessState(next);
    if (next === 'granted') await load();
    return next;
  }, [load]);

  return {
    accessState,
    canConnectApple: Platform.OS === 'ios',
    connect,
    error,
    externalItems,
    isLoading,
    items: useMemo(() => [...oharaItems, ...externalItems], [externalItems, oharaItems]),
    oharaItems,
    refresh: load,
  };
}
