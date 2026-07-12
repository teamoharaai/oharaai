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

type ProjectTitleRowProps = {
  title: string;
  variant?: TypographyVariant;
  numberOfLines?: number;
  iconSize?: number;
  textFlex?: boolean;
  style?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ImageStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function ProjectTitleRow({
  title,
  variant = 'card-title',
  numberOfLines,
  iconSize = 18,
  textFlex = true,
  style,
  iconStyle,
  textStyle,
}: ProjectTitleRowProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', minWidth: 0 }, style]}>
      <BrandIcon
        name="project"
        size={iconSize}
        style={[{ flexShrink: 0, marginRight: 8 }, iconStyle]}
      />
      <Typography
        variant={variant}
        numberOfLines={numberOfLines}
        style={[textFlex ? { flex: 1, minWidth: 0 } : null, textStyle]}
      >
        {title}
      </Typography>
    </View>
  );
}
