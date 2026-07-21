import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';
import { useThemeColors } from '@/store/uiStore';
import { Typography } from './Typography';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
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
      backgroundColor: colors.background.input,
      borderColor: colors.border.divider,
      textColor: colors.text.primary,
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
          borderRadius: compact ? 999 : 12,
          borderWidth: variant === 'ghost' ? 0 : 1,
          justifyContent: 'center',
          minHeight: 44,
          opacity: unavailable ? 0.45 : pressed ? 0.76 : 1,
          paddingHorizontal: compact ? 16 : 20,
          paddingVertical: compact ? 9 : 12,
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
