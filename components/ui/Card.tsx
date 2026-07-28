import {
  Platform,
  View,
  type FlexStyle,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { Typography } from './Typography';

export type CardPadding = 'none' | 'compact' | 'default' | 'spacious';

const CARD_PADDING: Record<CardPadding, number> = {
  none: 0,
  compact: 16,
  default: 20,
  spacious: 24,
};

export interface CardProps extends Omit<ViewProps, 'style'> {
  children: ReactNode;
  elevated?: boolean;
  padding?: CardPadding;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  elevated = false,
  padding = 'default',
  style,
  ...rest
}: CardProps) {
  const colors = useThemeColors();
  const themeMode = useUIStore((state) => state.themeMode);
  const hasShadow = elevated && themeMode === 'light';
  const shadowStyle: ViewStyle = Platform.OS === 'web'
    ? {
        boxShadow: hasShadow
          ? `0 2px 12px ${colors.text.primary}0A`
          : undefined,
      }
    : {
        elevation: hasShadow ? 1 : 0,
        shadowColor: colors.text.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: hasShadow ? 0.04 : 0,
        shadowRadius: hasShadow ? 12 : 0,
      };

  return (
    <View
      style={[
        {
          backgroundColor: colors.background.card,
          borderColor: colors.border.divider,
          borderRadius: 16,
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
