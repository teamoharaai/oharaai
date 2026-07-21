import {
  Image,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

export type BrandIconName =
  | 'ohara'
  | 'goals'
  | 'echo'
  | 'goal-mark'
  | 'today'
  | 'echo-add-entry'
  | 'project'
  | 'theme-mode';

const BRAND_ICON_SOURCES: Record<BrandIconName, ImageSourcePropType> = {
  ohara: require('../../assets/brand/ohara-logo.png') as ImageSourcePropType,
  goals: require('../../assets/brand/goals-logo.png') as ImageSourcePropType,
  echo: require('../../assets/brand/echo-logo.png') as ImageSourcePropType,
  'goal-mark': require('../../assets/brand/goal-mark.png') as ImageSourcePropType,
  today: require('../../assets/brand/today-logo.png') as ImageSourcePropType,
  'echo-add-entry': require('../../assets/brand/echo-add-entry.png') as ImageSourcePropType,
  project: require('../../assets/brand/project-logo.png') as ImageSourcePropType,
  'theme-mode': require('../../assets/brand/theme-mode.png') as ImageSourcePropType,
};

type BrandIconProps = {
  name: BrandIconName;
  size?: number;
  style?: StyleProp<ImageStyle>;
  tintColor?: string;
};

export function BrandIcon({ name, size = 20, style, tintColor }: BrandIconProps) {
  return (
    <Image
      source={BRAND_ICON_SOURCES[name]}
      resizeMode="contain"
      accessible={false}
      style={[{ height: size, tintColor, width: size }, style]}
    />
  );
}
