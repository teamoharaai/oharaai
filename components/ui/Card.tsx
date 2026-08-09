import {
  View,
  type FlexStyle,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';
import { elevationStyle, RADIUS, type ElevationLevel } from '@/constants/design';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { Typography } from './Typography';

export type CardPadding = 'none' | 'compact' | 'default' | 'spacious';
export type CardVariant = 'standard' | 'inset' | 'elevated' | 'glass' | 'inspector';

const CARD_PADDING: Record<CardPadding, number> = {
  none: 0,
  compact: 16,
  default: 20,
  spacious: 24,
};

export interface CardProps extends Omit<ViewProps, 'style'> {
  children: ReactNode;
  elevated?: boolean;
  elevation?: ElevationLevel;
  padding?: CardPadding;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
}

export function Card({
  children,
  elevated = false,
  elevation,
  padding = 'default',
  style,
  variant = 'standard',
  ...rest
}: CardProps) {
  const colors = useThemeColors();
  const themeMode = useUIStore((state) => state.themeMode);
  const darkMode = themeMode === 'dark';
  const resolvedElevation = elevation ?? (elevated || variant === 'elevated' ? 'sm' : 'none');
  const shadowStyle = elevationStyle(resolvedElevation, colors, darkMode);
  const appearance = {
    standard: { backgroundColor: colors.background.card, borderColor: colors.border.warmSubtle },
    inset: { backgroundColor: colors.background.subtle, borderColor: colors.border.subtle },
    elevated: { backgroundColor: colors.background.card, borderColor: colors.border.subtle },
    glass: {
      backgroundColor: darkMode ? 'rgba(17,26,31,0.88)' : 'rgba(255,255,255,0.84)',
      borderColor: darkMode ? 'rgba(255,255,255,0.09)' : 'rgba(36,35,31,0.08)',
    },
    inspector: { backgroundColor: colors.background.card, borderColor: colors.border.subtle },
  }[variant];

  return (
    <View
      style={[
        {
          backgroundColor: appearance.backgroundColor,
          borderColor: appearance.borderColor,
          borderRadius: variant === 'inspector' ? RADIUS.xl : RADIUS.lg,
          borderWidth: 1,
          padding: CARD_PADDING[padding],
        },
        shadowStyle,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

interface CardHeaderProps extends Omit<ViewProps, 'style'> {
  children: ReactNode;
  align?: FlexStyle['alignItems'];
  justify?: FlexStyle['justifyContent'];
  style?: StyleProp<ViewStyle>;
}

export function CardHeader({
  children,
  align = 'center',
  justify = 'space-between',
  style,
  ...rest
}: CardHeaderProps) {
  return (
    <View
      style={[{ alignItems: align, flexDirection: 'row', justifyContent: justify }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

interface CardSectionProps extends Omit<ViewProps, 'style'> {
  children: ReactNode;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
}

export function CardSection({ children, spacing = 12, style, ...rest }: CardSectionProps) {
  return (
    <View style={[{ gap: spacing }, style]} {...rest}>
      {children}
    </View>
  );
}

interface CardDividerProps extends Omit<ViewProps, 'style'> {
  spacing?: number;
  style?: StyleProp<ViewStyle>;
}

export function CardDivider({ spacing = 16, style, ...rest }: CardDividerProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        {
          backgroundColor: colors.border.divider,
          height: 1,
          marginVertical: spacing,
        },
        style,
      ]}
      {...rest}
    />
  );
}

interface CardTextProps extends Omit<TextProps, 'style'> {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}

export function CardTitle({ children, style, ...rest }: CardTextProps) {
  return (
    <Typography variant="title" style={style} {...rest}>
      {children}
    </Typography>
  );
}

export function CardSubtitle({ children, style, ...rest }: CardTextProps) {
  return (
    <Typography variant="subtitle" style={style} {...rest}>
      {children}
    </Typography>
  );
}

export function CardMetadata({ children, style, ...rest }: CardTextProps) {
  return (
    <Typography variant="caption" style={style} {...rest}>
      {children}
    </Typography>
  );
}
