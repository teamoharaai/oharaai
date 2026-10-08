import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { ProviderCalendar } from '../providers/types';

export function AppleCalendarSettingsModal({
  calendars,
  onClose,
  onDisconnect,
  onSave,
  selectedCalendarIds,
  visible,
}: {
  calendars: ProviderCalendar[];
  onClose: () => void;
  onDisconnect: () => Promise<void>;
  onSave: (ids: string[]) => Promise<void>;
  selectedCalendarIds: string[];
  visible: boolean;
}) {
  const colors = useThemeColors();
  const [draft, setDraft] = useState<string[]>(selectedCalendarIds);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (visible) setDraft(selectedCalendarIds); }, [selectedCalendarIds, visible]);

  function toggle(id: string) {
    setDraft((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  return (
    <Modal visible={visible} onClose={onClose} showCloseButton={false} contentStyle={{ maxWidth: 480 }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Typography accessibilityRole="header" variant="title">Apple Calendar</Typography>
          <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: SPACE.xs }}>Calendars to show in OHARA</Typography>
        </View>
        <Pressable accessibilityLabel="Close Apple Calendar settings" accessibilityRole="button" disabled={busy} onPress={onClose} style={{ padding: SPACE.sm }}>
          <Ionicons color={colors.text.secondary} name="close" size={22} />
        </Pressable>
      </View>

      <ScrollView style={{ maxHeight: 330, marginTop: SPACE.xl }}>
        <View style={{ gap: SPACE.sm }}>
          {calendars.map((calendar) => {
            const selected = draft.includes(calendar.id);
            return (
              <Pressable
                accessibilityLabel={`${calendar.title}${calendar.sourceTitle ? `, ${calendar.sourceTitle}` : ''}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                key={calendar.id}
                onPress={() => toggle(calendar.id)}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: selected ? colors.background.selectedRow : colors.background.subtle,
                  borderColor: selected ? colors.border.accent : colors.border.subtle,
                  borderRadius: RADIUS.md,
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: SPACE.md,
                  minHeight: 52,
                  opacity: pressed ? 0.7 : 1,
                  paddingHorizontal: SPACE.lg,
                })}
              >
                <Ionicons color={selected ? colors.text.accent : colors.text.muted} name={selected ? 'checkbox' : 'square-outline'} size={20} />
                <View style={{ flex: 1 }}>
                  <Typography variant="emphasis-sm">{calendar.title}</Typography>
                  {calendar.sourceTitle ? <Typography variant="meta" style={{ color: colors.text.muted, marginTop: 2 }}>{calendar.sourceTitle}</Typography> : null}
                </View>
              </Pressable>
            );
          })}
          {!calendars.length ? <Typography variant="body">No EventKit calendars are currently available.</Typography> : null}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: SPACE.md, justifyContent: 'space-between', marginTop: SPACE['2xl'] }}>
        <Button
          disabled={busy}
          onPress={() => void (async () => { setBusy(true); try { await onDisconnect(); onClose(); } finally { setBusy(false); } })()}
          size="compact"
          variant="outline"
        >
          Disconnect
        </Button>
        <Button
          loading={busy}
          onPress={() => void (async () => { setBusy(true); try { await onSave(draft); onClose(); } finally { setBusy(false); } })()}
          size="compact"
        >
          Save
        </Button>
      </View>
      <Typography variant="meta" style={{ color: colors.text.muted, marginTop: SPACE.lg }}>
        Disconnecting stops reads and clears this device&apos;s selection. It never deletes Apple Calendar events or OHARA items.
      </Typography>
    </Modal>
  );
}
