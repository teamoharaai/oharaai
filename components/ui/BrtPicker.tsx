import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { BRT_CATEGORIES, brtCategoryLabel, type BrtCategory } from '@/lib/utils/resolveBrt';
import { useThemeColors } from '@/store/uiStore';

interface BrtPickerProps {
  disabled?: boolean;
  onChange: (category: BrtCategory) => void;
  value: BrtCategory;
}

// Single write target: this is the only BRT category selector in the app.
// Used by the Echo entry-settings edit form and the Constellation evidence
// panel, both of which PATCH echo_entries.brt_category through the same
// route (see lib/api/echo-entries.ts).
export function BrtPicker({ disabled = false, onChange, value }: BrtPickerProps) {
  const colors = useThemeColors();

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {BRT_CATEGORIES.map((category) => {
        const selected = value === category;
        const color = colors.brt[category];
        return (
          <Pressable
            accessibilityLabel={`${brtCategoryLabel(category)} category`}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected }}
            disabled={disabled}
            key={category}
            onPress={() => onChange(category)}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: selected
                ? colors.background.selectedRow
                : colors.background.input,
              borderColor: selected ? color : colors.border.input,
              borderRadius: 10,
              borderWidth: selected ? 2 : 1,
              flex: 1,
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
                {brtCategoryLabel(category)}
              </Typography>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
