import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { calendarLinkIdentity, type CalendarExternalLink } from '../external-links';
import { appleEventKitProvider } from '../providers/apple-eventkit';
import type { ProviderCalendar } from '../providers/types';
import {
  fetchCalendarExternalLink,
  finalizeCalendarExternalLink,
  markCalendarExternalLink,
  newCalendarExportOperationKey,
  reserveCalendarExternalLink,
} from '../services/calendar-link-service';
import type { CalendarItem } from '../types';
import { calendarTimeLabel } from './CalendarItemRow';

export function CalendarExportModal({ calendars, item, onClose, visible }: {
  calendars: ProviderCalendar[];
  item: CalendarItem | null;
  onClose: () => void;
  visible: boolean;
}) {
  const colors = useThemeColors();
  const writable = useMemo(() => calendars.filter((calendar) => calendar.allowsModifications), [calendars]);
  const [calendarId, setCalendarId] = useState<string>('');
  const [link, setLink] = useState<CalendarExternalLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !item) return;
    setLink(null);
    setCalendarId(writable.find((calendar) => calendar.isPrimary)?.id ?? writable[0]?.id ?? '');
    setMessage(null);
    const identity = calendarLinkIdentity(item);
    if (!identity) return;
    void (async () => {
      setBusy(true);
      try {
        const existing = await fetchCalendarExternalLink(identity.entityType, identity.entityId);
        if (existing?.syncState === 'active' && existing.externalEventId) {
          const event = await appleEventKitProvider.getEvent(existing.externalEventId);
          if (!event) {
            setLink(await markCalendarExternalLink(existing.id, 'missing'));
            setMessage('The linked Apple event is no longer available. You can add it again.');
            return;
          }
        }
        setLink(existing);
      } catch {
        setMessage('Calendar link status could not be checked.');
      } finally {
        setBusy(false);
      }
    })();
  }, [item, visible, writable]);

  if (!item) return null;
  const active = link?.syncState === 'active' && !!link.externalEventId;

  async function add() {
    const identity = calendarLinkIdentity(item!);
    if (!identity || !calendarId) return;
    const operationKey = newCalendarExportOperationKey();
    let eventId: string | null = null;
    let reserved: CalendarExternalLink | null = null;
    setBusy(true);
    setMessage(null);
    try {
      reserved = await reserveCalendarExternalLink(identity.entityType, identity.entityId, calendarId, operationKey);
      if (reserved.syncState === 'active') {
        setLink(reserved);
        setMessage('Already added to Apple Calendar.');
        return;
      }
      if (reserved.reservationKey !== operationKey) {
        setLink(reserved);
        setMessage('This item is already being added. Try again in a few minutes if it does not finish.');
        return;
      }
      eventId = await appleEventKitProvider.createEvent({
        allDay: item!.allDay,
        calendarId,
        endAt: item!.endAt,
        notes: `OHARA${item!.contextTitle ? ` · ${item!.contextTitle}` : ''}\nOHARA_LINK:${identity.entityType}:${identity.entityId}`,
        startAt: item!.startAt,
        title: item!.title,
      });
      const finalized = await finalizeCalendarExternalLink(reserved.id, operationKey, calendarId, eventId);
      setLink(finalized);
      setMessage('Added to Apple Calendar. OHARA remains the source of truth.');
    } catch {
      if (eventId) await appleEventKitProvider.deleteEvent(eventId).catch(() => undefined);
      if (reserved?.reservationKey === operationKey) await markCalendarExternalLink(reserved.id, 'failed').catch(() => undefined);
      setMessage('Apple Calendar could not add this item. No OHARA data changed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} onClose={onClose} showCloseButton={false} contentStyle={{ maxWidth: 480 }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Typography accessibilityRole="header" variant="title">Add to Apple Calendar</Typography>
        <Pressable accessibilityLabel="Close Add to Calendar" accessibilityRole="button" disabled={busy} onPress={onClose} style={{ padding: SPACE.sm }}>
          <Ionicons color={colors.text.secondary} name="close" size={22} />
        </Pressable>
      </View>
      <View style={{ backgroundColor: colors.background.subtle, borderRadius: RADIUS.md, marginTop: SPACE.xl, padding: SPACE.lg }}>
        <Typography variant="emphasis-sm">{item.title}</Typography>
        <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: SPACE.xs }}>
          {[calendarTimeLabel(item), item.contextTitle].filter(Boolean).join(' · ')}
        </Typography>
      </View>

      {active ? (
        <View style={{ gap: SPACE.md, marginTop: SPACE.xl }}>
          <Typography variant="body">Already added to Apple Calendar.</Typography>
          <Button onPress={() => void appleEventKitProvider.openEvent(link!.externalEventId!)} variant="secondary">View or update event</Button>
          <Button
            loading={busy}
            onPress={() => void (async () => { setBusy(true); try { setLink(await markCalendarExternalLink(link!.id, 'unlinked')); setMessage('Link removed. The Apple event was preserved.'); } finally { setBusy(false); } })()}
            variant="outline"
          >
            Remove link
          </Button>
        </View>
      ) : (
        <View style={{ gap: SPACE.sm, marginTop: SPACE.xl }}>
          <Typography variant="eyebrow">Destination calendar</Typography>
          {writable.map((calendar) => {
            const selected = calendar.id === calendarId;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={calendar.id}
                onPress={() => setCalendarId(calendar.id)}
                style={{ alignItems: 'center', backgroundColor: selected ? colors.background.selectedRow : colors.background.subtle, borderRadius: RADIUS.md, flexDirection: 'row', gap: SPACE.md, minHeight: 46, paddingHorizontal: SPACE.lg }}
              >
                <Ionicons color={selected ? colors.text.accent : colors.text.muted} name={selected ? 'radio-button-on' : 'radio-button-off'} size={18} />
                <Typography variant="body-small">{calendar.title}</Typography>
              </Pressable>
            );
          })}
          {!writable.length ? <Typography variant="body">No writable Apple calendars are available.</Typography> : null}
          <Button disabled={!calendarId} loading={busy} onPress={() => void add()} style={{ marginTop: SPACE.md }}>Add</Button>
        </View>
      )}
      {message ? <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: SPACE.lg }}>{message}</Typography> : null}
    </Modal>
  );
}
