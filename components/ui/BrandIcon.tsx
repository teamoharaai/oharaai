import type { ComponentType } from 'react';
import {
  Image,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  ConstellationLogo,
  HomeLogo,
  MomentumLogo,
  type BrandLogoProps,
} from './brand-icons';
import { useThemeColors } from '@/store/uiStore';

export type BrandIconName =
  | 'ohara'
  | 'home'
  | 'goals'
  | 'echo'
  | 'goal-mark'
  | 'today'
  | 'echo-add-entry'
  | 'momentum'
  | 'constellation'
  | 'project'
  | 'theme-mode';

const BRAND_ICON_SOURCES: Partial<Record<BrandIconName, ImageSourcePropType>> = {
  ohara: require('../../assets/brand/ohara-logo.png') as ImageSourcePropType,
  goals: require('../../assets/brand/today-logo.png') as ImageSourcePropType,
  echo: require('../../assets/brand/echo-logo.png') as ImageSourcePropType,
  'goal-mark': require('../../assets/brand/goal-mark.png') as ImageSourcePropType,
  today: require('../../assets/brand/today-logo.png') as ImageSourcePropType,
  'echo-add-entry': require('../../assets/brand/echo-add-entry.png') as ImageSourcePropType,
  project: require('../../assets/brand/project-logo.png') as ImageSourcePropType,
  'theme-mode': require('../../assets/brand/theme-mode.png') as ImageSourcePropType,
};

const BRAND_ICON_VECTORS: Partial<Record<BrandIconName, ComponentType<BrandLogoProps>>> = {
  constellation: ConstellationLogo,
  home: HomeLogo,
  momentum: MomentumLogo,
};

type BrandIconProps = {
  name: BrandIconName;
  size?: number;
  style?: StyleProp<ImageStyle>;
  color?: string;
  /** @deprecated Prefer `color`; retained while existing call sites migrate. */
  tintColor?: string;
};

export function BrandIcon({ color, name, size = 20, style, tintColor }: BrandIconProps) {
  const colors = useThemeColors();
  const resolvedColor = color ?? tintColor ?? colors.accent.primary;
  const VectorIcon = BRAND_ICON_VECTORS[name];

  if (VectorIcon) {
    return (
      <VectorIcon
        color={resolvedColor}
        size={size}
        style={style as StyleProp<ViewStyle>}
      />
    );
  }

  const source = BRAND_ICON_SOURCES[name];
  if (!source) return null;

  return (
    <Image
      source={source}
      resizeMode="contain"
      accessible={false}
      tintColor={resolvedColor}
      style={[{ height: size, width: size }, style]}
    />
  );
}
