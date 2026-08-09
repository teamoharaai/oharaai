import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';
import { CONTROL, RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { Typography } from './Typography';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'compact' | 'default';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  children: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  variant?: ButtonVariant;
}

export function Button({
  children,
  disabled = false,
  loading = false,
  size = 'default',
  style,
  textStyle,
  variant = 'primary',
  ...rest
}: ButtonProps) {
  const colors = useThemeColors();
  const unavailable = disabled || loading;
  const compact = size === 'compact';

  const appearance = {
    primary: {
      backgroundColor: colors.accent.primary,
      borderColor: colors.accent.primary,
      textColor: colors.text.onAccent,
    },
    secondary: {
      backgroundColor: colors.background.selectedRow,
      borderColor: colors.border.subtle,
      textColor: colors.text.accent,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: colors.border.input,
      textColor: colors.text.accent,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: colors.text.accent,
    },
    danger: {
      backgroundColor: colors.feedback.danger.bg,
      borderColor: colors.feedback.danger.border,
      textColor: colors.feedback.danger.text,
    },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: unavailable }}
      disabled={unavailable}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          backgroundColor: appearance.backgroundColor,
          borderColor: appearance.borderColor,
          borderRadius: compact ? RADIUS.round : RADIUS.md,
          borderWidth: variant === 'ghost' ? 0 : 1,
          justifyContent: 'center',
          minHeight: compact ? CONTROL.compactHeight : CONTROL.defaultHeight,
          opacity: unavailable ? 0.45 : pressed ? 0.72 : 1,
          paddingHorizontal: compact ? SPACE.xl : SPACE['2xl'],
          paddingVertical: compact ? SPACE.md : SPACE.lg,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={appearance.textColor} size="small" />
      ) : (
        <Typography
          variant="emphasis-sm"
          style={[{ color: appearance.textColor }, textStyle]}
        >
          {children}
        </Typography>
      )}
    </Pressable>
  );
}
