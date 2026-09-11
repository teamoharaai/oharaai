import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { DatePicker, formatCalendarDate, parseCalendarDate } from '@/components/ui/DatePicker';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';

interface ExtendDeadlineModalProps {
  currentDeadline: Date | null;
  onClose: () => void;
  onSave: (deadline: Date) => Promise<boolean>;
  visible: boolean;
}

function tomorrow(): Date {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() + 1);
  return value;
}

export function ExtendDeadlineModal({
  currentDeadline,
  onClose,
  onSave,
  visible,
}: ExtendDeadlineModalProps) {
  const colors = useThemeColors();
  const minimumDate = useMemo(() => formatCalendarDate(tomorrow()), [visible]);
  const [deadline, setDeadline] = useState(minimumDate);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const initial = currentDeadline && currentDeadline >= tomorrow()
      ? formatCalendarDate(currentDeadline)
      : minimumDate;
    setDeadline(initial);
    setError(null);
  }, [currentDeadline, minimumDate, visible]);

  async function save() {
    const parsed = parseCalendarDate(deadline);
    if (!parsed) {
      setError('Choose a valid future deadline.');
      return;
    }
    parsed.setHours(12, 0, 0, 0);
    setSaving(true);
    setError(null);
    const saved = await onSave(parsed);
    setSaving(false);
    if (!saved) {
      setError('Could not extend this Goal. Please try again.');
      return;
    }
    onClose();
  }

  return (
    <Modal
      closeDisabled={saving}
      closeOnBackdropPress={!saving}
      contentStyle={{
        backgroundColor: colors.background.card,
        borderRadius: RADIUS.xl,
        maxWidth: 440,
        padding: SPACE['3xl'],
      }}
      onClose={onClose}
      visible={visible}
    >
      <Typography variant="heading">Extend this Goal</Typography>
      <Typography variant="body-small" style={{ marginBottom: SPACE.xl, marginTop: SPACE.sm }}>
        Keep the same Goal and its full history while choosing a new deadline.
      </Typography>
      <DatePicker
        accessibilityLabel="New Goal deadline"
        error={error}
        minimumDate={minimumDate}
        onChange={(value) => {
          setDeadline(value);
          if (error) setError(null);
        }}
        value={deadline}
      />
      {error ? (
        <Typography variant="caption" style={{ color: colors.feedback.danger.text, marginTop: SPACE.sm }}>
          {error}
        </Typography>
      ) : null}
      <View style={{ flexDirection: 'row', gap: SPACE.md, justifyContent: 'flex-end', marginTop: SPACE['2xl'] }}>
        <Button disabled={saving} onPress={onClose} size="compact" variant="outline">Cancel</Button>
        <Button disabled={saving} loading={saving} onPress={save} size="compact">Extend Goal</Button>
      </View>
    </Modal>
  );
}
