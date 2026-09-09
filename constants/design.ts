import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import type { ThemeColors } from './colors';

/**
 * Canonical application typography.
 *
 * Inter is bundled at the app root and is the single cross-platform UI family.
 * Lora is reserved for the OHARA wordmark and intentionally reflective/editorial
 * moments; it should not be used as a second general-purpose interface family.
 */
export const FONT = {
  ui: {
    regular: 'Inter-Regular',
    italic: 'Inter-Italic',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  editorial: {
    regular: 'Lora-Regular',
    italic: 'Lora-Italic',
    medium: 'Lora-Medium',
    semibold: 'Lora-SemiBold',
  },
} as const;

/** Semantic type roles used by shared primitives and non-Typography text inputs. */
export const TYPE = {
  meta: {
    fontFamily: FONT.ui.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  caption: {
    fontFamily: FONT.ui.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  bodySmall: {
    fontFamily: FONT.ui.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  body: {
    fontFamily: FONT.ui.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyLarge: {
    fontFamily: FONT.ui.regular,
    fontSize: 17,
    lineHeight: 26,
  },
  control: {
    fontFamily: FONT.ui.medium,
    fontSize: 15,
    lineHeight: 20,
  },
  cardTitle: {
    fontFamily: FONT.ui.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  sectionTitle: {
    fontFamily: FONT.ui.semibold,
    fontSize: 20,
    lineHeight: 26,
  },
  pageTitle: {
    fontFamily: FONT.ui.semibold,
    fontSize: 28,
    lineHeight: 34,
  },
  overline: {
    fontFamily: FONT.ui.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  editorBody: {
    fontFamily: FONT.ui.regular,
    fontSize: 17,
    lineHeight: 27,
  },
  chartLabel: {
    fontFamily: FONT.ui.medium,
    fontSize: 11,
    lineHeight: 15,
  },
} as const satisfies Record<string, TextStyle>;

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
  compactHeight: 42,
  defaultHeight: 48,
  iconSize: 44,
} as const;

export const LAYOUT = {
  compactGutter: 16,
  standardGutter: 24,
  desktopGutter: 36,
  wideGutter: 48,
  contentMaxWidth: 1440,
  readingMaxWidth: 880,
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
