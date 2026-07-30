import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { EntriesTab } from '@/store/uiStore';

const OPTIONS = [
  { value: 'notes', label: 'Notes' },
  { value: 'reflections', label: 'Reflections' },
] as const;

export function EntriesSegmentedControl({
  compact,
  value,
  onChange,
}: {
  compact?: boolean;
  value: EntriesTab;
  onChange: (value: EntriesTab) => void;
}) {
  return (
    <SegmentedControl
      accessibilityLabel="Entries section"
      compact={compact}
      onChange={onChange}
      options={OPTIONS}
      value={value}
    />
  );
}
