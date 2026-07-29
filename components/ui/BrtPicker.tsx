import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { BRT_CATEGORIES, brtCategoryLabel, type BrtCategory } from '@/lib/utils/resolveBrt';
import { useThemeColors } from '@/store/uiStore';

interface BrtPickerProps {
  disabled?: boolean;
  includeUnlinked?: boolean;
  onChange: (category: BrtCategory | null) => void;
  value: BrtCategory | null;
}

// Single write target: this is the only BRT category selector in the app.
// Used by the Echo entry-settings edit form and the Constellation evidence
// panel, both of which PATCH echo_entries.brt_category through the same
// route (see lib/api/echo-entries.ts).
export function BrtPicker({
  disabled = false,
  includeUnlinked = false,
  onChange,
  value,
}: BrtPickerProps) {
  const colors = useThemeColors();
  const categories: readonly (BrtCategory | null)[] = includeUnlinked
    ? [null, ...BRT_CATEGORIES]
    : BRT_CATEGORIES;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {categories.map((category) => {
        const selected = value === category;
        const color = category ? colors.brt[category] : colors.text.muted;
        const label = category ? brtCategoryLabel(category) : 'Unlinked';
        return (
          <Pressable
            accessibilityLabel={`${label} category`}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected }}
            disabled={disabled}
            key={category ?? 'unlinked'}
            onPress={() => onChange(category)}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: selected
                ? colors.background.selectedRow
                : colors.background.input,
              borderColor: selected ? color : colors.border.input,
              borderRadius: 10,
              borderWidth: selected ? 2 : 1,
              flexGrow: 1,
              flexBasis: includeUnlinked ? '45%' : 0,
              justifyContent: 'center',
              minHeight: 44,
              opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
              paddingHorizontal: 8,
            })}
          >
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                gap: 7,
              }}
            >
              <View
                style={{
                  backgroundColor: color,
                  borderRadius: 999,
                  height: 8,
                  width: 8,
                }}
              />
              <Typography
                variant="label"
                style={{ color: selected ? color : colors.text.primary }}
              >
                {label}
              </Typography>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
