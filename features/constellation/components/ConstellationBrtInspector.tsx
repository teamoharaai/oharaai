import { View } from 'react-native';
import { BrtPicker } from '@/components/ui/BrtPicker';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { brtCategoryLabel } from '@/lib/utils/resolveBrt';
import { useThemeColors } from '@/store/uiStore';
import type { useBrtInspector } from '../hooks/useBrtInspector';
import type { ConstellationVirtualBrtClusterDTO } from '../types';
import { ConstellationInspectorSurface } from './ConstellationInspectorSurface';
import { ConstellationLoadingMark } from './ConstellationLoadingMark';

type BrtInspectorController = ReturnType<typeof useBrtInspector>;

function formattedDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : '';
}

export function ConstellationBrtInspector({
  inspector,
  node,
  onClose,
  onEntriesChanged,
  onReadEntry,
}: {
  inspector: BrtInspectorController;
  node: ConstellationVirtualBrtClusterDTO;
  onClose: () => void;
  onEntriesChanged: () => void;
  onReadEntry: (entryId: string) => void;
}) {
  const colors = useThemeColors();
  const label = brtCategoryLabel(node.brtCategory);

  return (
    <ConstellationInspectorSurface
      accessibilityLabel={`Reflection inspector for ${label}`}
      closeDisabled={inspector.savingEntryId !== null}
      onClose={onClose}
      selectionKey={node.selectionKey}
    >
      <View style={{ gap: 7 }}>
        <Typography
          variant="section-eyebrow"
          style={{ color: colors.text.accent }}
        >
          {`REFLECTIONS · ${label.toUpperCase()}`}
        </Typography>
        <Typography accessibilityRole="header" variant="heading">
          {label}
        </Typography>
        <Typography variant="description">
          {`Every entry currently labeled ${label}. Reclassifying an entry updates it everywhere in Ohara.`}
        </Typography>
      </View>

      {inspector.error ? (
        <View
          accessibilityRole="alert"
          style={{
            backgroundColor: colors.feedback.danger.bg,
            borderColor: colors.feedback.danger.border,
            borderRadius: 10,
            borderWidth: 1,
            gap: 6,
            padding: 12,
          }}
        >
          <Typography
            variant="caption"
            style={{ color: colors.feedback.danger.text }}
          >
            {inspector.error}
          </Typography>
          {inspector.status === 'error' && inspector.retryable ? (
            <Button onPress={() => void inspector.retry()} size="compact">
              Retry
            </Button>
          ) : null}
        </View>
      ) : null}

      {inspector.status === 'loading' ? (
        <View
          accessibilityLabel={`Loading ${label} entries`}
          accessibilityRole="progressbar"
          style={{ alignItems: 'center', gap: 9, paddingVertical: 28 }}
        >
          <ConstellationLoadingMark color={colors.accent.primary} />
          <Typography variant="caption">Loading entries…</Typography>
        </View>
      ) : inspector.dto ? (
        <View style={{ gap: 10 }}>
          <Typography variant="section-eyebrow">
            {`${label} entries · ${inspector.dto.entries.length}`}
          </Typography>
          {inspector.dto.entries.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.background.subtle,
                borderRadius: 10,
                padding: 14,
              }}
            >
              <Typography variant="description">
                {`No entries are labeled ${label} yet.`}
              </Typography>
            </View>
          ) : inspector.dto.entries.map((entry) => {
            const saving = inspector.savingEntryId === entry.id;
            return (
              <View
                key={entry.id}
                style={{
                  backgroundColor: colors.background.input,
                  borderColor: colors.border.input,
                  borderRadius: 12,
                  borderWidth: 1,
                  gap: 10,
                  padding: 12,
                }}
              >
                <View style={{ gap: 3 }}>
                  <Typography numberOfLines={2} variant="label">
                    {entry.title?.trim() || 'Untitled Entry'}
                  </Typography>
                  <Typography variant="caption">
                    {formattedDate(entry.createdAt)}
                  </Typography>
                </View>
                <Typography numberOfLines={4} variant="caption">
                  {entry.excerpt || 'This entry has no preview text.'}
                </Typography>
                <View style={{ gap: 6 }}>
                  <Typography variant="field-label">
                    Classify entry
                  </Typography>
                  <BrtPicker
                    disabled={inspector.savingEntryId !== null}
                    includeUnlinked
                    onChange={(category) => {
                      if (category === node.brtCategory) return;
                      void inspector.reclassify(entry.id, category).then(
                        (saved) => {
                          if (saved) onEntriesChanged();
                        },
                      );
                    }}
                    value={node.brtCategory}
                  />
                </View>
                <Button
                  disabled={saving}
                  onPress={() => onReadEntry(entry.id)}
                  size="compact"
                  variant="secondary"
                >
                  {saving ? 'Saving…' : 'Read entry'}
                </Button>
              </View>
            );
          })}
        </View>
      ) : null}
    </ConstellationInspectorSurface>
  );
}
