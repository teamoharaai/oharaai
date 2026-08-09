import { Platform, type ViewStyle } from 'react-native';
import type { ThemeColors } from './colors';

export const SPACE = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  '5xl': 40,
  '6xl': 48,
  '7xl': 64,
} as const;

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  round: 999,
} as const;

export const CONTROL = {
  compactHeight: 40,
  defaultHeight: 46,
  iconSize: 44,
} as const;

export const LAYOUT = {
  compactGutter: 16,
  standardGutter: 24,
  desktopGutter: 36,
  wideGutter: 48,
  contentMaxWidth: 1440,
  readingMaxWidth: 880,
  sidebarCollapsedWidth: 76,
  sidebarExpandedWidth: 236,
} as const;

export type ElevationLevel = 'none' | 'sm' | 'md' | 'lg';

export function elevationStyle(
  level: ElevationLevel,
  colors: ThemeColors,
  darkMode: boolean,
): ViewStyle {
  if (level === 'none') return {};

  const values = {
    sm: { y: 2, blur: 12, opacity: darkMode ? 0.18 : 0.045, elevation: 1 },
    md: { y: 8, blur: 24, opacity: darkMode ? 0.24 : 0.075, elevation: 5 },
    lg: { y: 20, blur: 48, opacity: darkMode ? 0.34 : 0.14, elevation: 12 },
  }[level];

  if (Platform.OS === 'web') {
    return {
      boxShadow: `0 ${values.y}px ${values.blur}px ${colors.effects.shadow}${darkMode ? '52' : '1F'}`,
    };
  }

  return {
    elevation: values.elevation,
    shadowColor: colors.effects.shadow,
    shadowOffset: { width: 0, height: values.y },
    shadowOpacity: values.opacity,
    shadowRadius: values.blur / 2,
  };
}
