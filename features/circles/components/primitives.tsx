import { useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Avatar } from '@/components/ui/Avatar';
import { Typography } from '@/components/ui/Typography';
import { FONT, RADIUS, SPACE, TYPE } from '@/constants/design';
import { CATEGORY_ACCENT_THEME } from '@/constants/themes';
import type { GoalCreationCategory } from '@/lib/goals/schema';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import type { CirclesAuthor } from '../types';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const CATEGORY_ICON: Record<GoalCreationCategory, IoniconName> = {
  health: 'walk-outline',
  finance: 'wallet-outline',
  career: 'briefcase-outline',
  creative: 'color-palette-outline',
  education: 'book-outline',
  relationships: 'heart-outline',
  growth: 'leaf-outline',
};

export function useDarkMode(): boolean {
  return useUIStore((state) => state.themeMode) === 'dark';
}

/** Category tint that stays quiet on dark surfaces instead of glowing pastel. */
export function useCategoryTone(category: GoalCreationCategory) {
  const dark = useDarkMode();
  const theme = CATEGORY_ACCENT_THEME[category];
  return {
    fg: dark ? theme.color : theme.mid,
    bg: dark ? `${theme.color}24` : theme.tint,
  };
}

/**
 * Avatar for a Circles author (friend or self). Identity comes from the hydrated
 * `author` DTO — the shared `Avatar` renders the photo or initials fallback.
 */
export function PersonAvatar({
  person,
  size,
}: {
  person: Pick<CirclesAuthor, 'displayName' | 'username' | 'avatarUrl'>;
  size: number;
}) {
  return (
    <Avatar
      avatarUrl={person.avatarUrl}
      displayName={person.displayName || person.username || 'Someone'}
      size={size}
    />
  );
}

export function CategoryGlyph({
  category,
  size = 44,
}: {
  category: GoalCreationCategory;
  size?: number;
}) {
  const tone = useCategoryTone(category);
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: tone.bg,
        borderRadius: size >= 44 ? RADIUS.md : RADIUS.sm,
        height: size,
        justifyContent: 'center',
        width: size,
      }}
    >
      <Ionicons color={tone.fg} name={CATEGORY_ICON[category]} size={Math.round(size * 0.45)} />
    </View>
  );
}

export function ProgressTrack({
  value,
  color,
  style,
}: {
  value: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={[{ backgroundColor: colors.background.input, borderRadius: RADIUS.round, height: 4, overflow: 'hidden' }, style]}
    >
      <View
        style={{
          backgroundColor: color ?? colors.accent.primary,
          borderRadius: RADIUS.round,
          height: '100%',
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
        }}
      />
    </View>
  );
}

/** Card heading row shared by the Circles context cards. */
export function ContextCardHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.lg, marginBottom: SPACE.xl }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Typography accessibilityRole="header" variant="title">{title}</Typography>
        <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: 2 }}>
          {subtitle}
        </Typography>
      </View>
      {actionLabel && onAction ? (
        <QuietAction label={actionLabel} onPress={onAction} trailingIcon="arrow-forward" accent />
      ) : null}
    </View>
  );
}

/** Low-emphasis text + icon action (View all, Attach image, Encourage...). */
export function QuietAction({
  accent = false,
  active = false,
  activeColor,
  icon,
  label,
  onPress,
  trailingIcon,
  accessibilityLabel,
}: {
  accent?: boolean;
  active?: boolean;
  activeColor?: string;
  icon?: IoniconName;
  label: string;
  onPress: () => void;
  trailingIcon?: IoniconName;
  accessibilityLabel?: string;
}) {
  const colors = useThemeColors();
  const [hovered, setHovered] = useState(false);
  const tint = active
    ? activeColor ?? colors.text.accent
    : accent
      ? colors.text.accent
      : hovered
        ? colors.text.primary
        : colors.text.secondary;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={6}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: hovered ? colors.background.subtle : 'transparent',
        borderRadius: RADIUS.sm,
        flexDirection: 'row',
        gap: SPACE.sm,
        minHeight: 36,
        opacity: pressed ? 0.65 : 1,
        paddingHorizontal: SPACE.md,
      })}
    >
      {icon ? <Ionicons color={tint} name={icon} size={18} /> : null}
      <Text style={{ ...TYPE.bodySmall, color: tint, fontFamily: FONT.ui.medium }}>{label}</Text>
      {trailingIcon ? <Ionicons color={tint} name={trailingIcon} size={14} /> : null}
    </Pressable>
  );
}

/** Row container with the shared hover/pressed treatment. */
export function PressableRow({
  children,
  onPress,
  accessibilityLabel,
  selected = false,
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  selected?: boolean;
}) {
  const colors = useThemeColors();
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected
          ? colors.background.selectedRow
          : hovered || pressed
            ? colors.background.subtle
            : 'transparent',
        borderRadius: RADIUS.md,
        flexDirection: 'row',
        gap: SPACE.lg,
        marginHorizontal: -SPACE.md,
        minHeight: 56,
        paddingHorizontal: SPACE.md,
        paddingVertical: SPACE.md,
      })}
    >
      {children}
    </Pressable>
  );
}

/**
 * Image placeholder scene — the prototype has no uploads, so photos render as a
 * calm category-toned landscape instead of a stock image.
 */
export function ImagePlaceholder({
  tone,
  caption,
  height = 220,
}: {
  tone: GoalCreationCategory;
  caption?: string;
  height?: number;
}) {
  const dark = useDarkMode();
  const colors = useThemeColors();
  const theme = CATEGORY_ACCENT_THEME[tone];
  const gradientId = `sky-${tone}-${dark ? 'd' : 'l'}`;
  return (
    <View
      accessibilityLabel={caption ? `Image: ${caption}` : 'Image'}
      accessibilityRole="image"
      style={{ borderRadius: RADIUS.md, height, overflow: 'hidden', width: '100%' }}
    >
      <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 220" width="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={dark ? '#242426' : theme.tint} />
            <Stop offset="1" stopColor={dark ? '#1C1C1E' : '#FFFFFF'} />
          </LinearGradient>
        </Defs>
        <Rect fill={`url(#${gradientId})`} height="220" width="400" />
        <Circle cx="286" cy="92" fill={theme.color} opacity={dark ? 0.55 : 0.42} r="30" />
        <Path d="M0 170 L90 104 L150 140 L230 78 L330 150 L400 118 L400 220 L0 220 Z" fill={theme.color} opacity={dark ? 0.3 : 0.22} />
        <Path d="M0 196 L70 150 L160 182 L250 132 L340 180 L400 160 L400 220 L0 220 Z" fill={theme.mid} opacity={dark ? 0.5 : 0.34} />
      </Svg>
      {caption ? (
        <View
          style={{
            backgroundColor: dark ? 'rgba(17,17,17,0.72)' : 'rgba(255,255,255,0.82)',
            borderRadius: RADIUS.round,
            bottom: SPACE.lg,
            left: SPACE.lg,
            maxWidth: '85%',
            paddingHorizontal: SPACE.lg,
            paddingVertical: SPACE.xs,
            position: 'absolute',
          }}
        >
          <Typography numberOfLines={1} variant="meta" style={{ color: colors.text.secondary }}>{caption}</Typography>
        </View>
      ) : null}
    </View>
  );
}
