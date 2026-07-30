import { SegmentedControl } from '@/components/ui/SegmentedControl';

export type GoalCreationMode = 'manual' | 'ai';

export function GoalCreationModeToggle({
  compact = false,
  mode,
  onChange,
}: {
  compact?: boolean;
  mode: GoalCreationMode;
  onChange: (mode: GoalCreationMode) => void;
}) {
  return (
    <SegmentedControl
      accessibilityLabel="Goal creation mode"
      compact={compact}
      onChange={onChange}
      options={([
        ['manual', 'Build it myself'],
        ['ai', '✦ Chat with Echo'],
      ] as const).map(([value, label]) => ({ value, label }))}
      value={mode}
    />
  );
}
