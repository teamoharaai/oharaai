import type { ComponentProps } from 'react';
import {
  View,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Typography } from '@/components/ui/Typography';

type TypographyVariant = NonNullable<ComponentProps<typeof Typography>['variant']>;

type GoalTitleRowProps = {
  title: string;
  variant?: TypographyVariant;
  numberOfLines?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ImageStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function GoalTitleRow({
  title,
  variant = 'title',
  numberOfLines,
  iconSize = 18,
  style,
  iconStyle,
  textStyle,
}: GoalTitleRowProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-start', minWidth: 0 }, style]}>
      <BrandIcon
        name="goal-mark"
        size={iconSize}
        style={[{ flexShrink: 0, marginRight: 8, marginTop: 1 }, iconStyle]}
      />
      <Typography
        variant={variant}
        numberOfLines={numberOfLines}
        style={[{ flex: 1, minWidth: 0 }, textStyle]}
      >
        {title}
      </Typography>
    </View>
  );
}
