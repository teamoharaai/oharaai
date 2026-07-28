import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { brtDisplayLabel } from '../tokens';
import type { ConstellationBrtCategory } from '../types';

interface ConstellationBrtPickerProps {
  disabled?: boolean;
  onChange: (category: ConstellationBrtCategory) => void;
  value: ConstellationBrtCategory;
}

const CATEGORIES = [
  'bud',
  'rose',
  'thorn',
] as const satisfies readonly ConstellationBrtCategory[];

export function ConstellationBrtPicker({
  disabled = false,
  onChange,
  value,
}: ConstellationBrtPickerProps) {
  const colors = useThemeColors();

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {CATEGORIES.map((category) => {
        const selected = value === category;
        const color = colors.brt[category];
        return (
          <Pressable
            accessibilityLabel={`${brtDisplayLabel(category)} evidence category`}
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
                {brtDisplayLabel(category)}
              </Typography>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
