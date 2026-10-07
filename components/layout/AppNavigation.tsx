import { useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandIcon, type BrandIconName } from '@/components/ui/BrandIcon';
import { FEATURES } from '@/constants/features';
import { CONTROL, FONT, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { AvatarMenu } from './AvatarMenu';
import { GlobalCreateControl } from './GlobalCreateControl';

type NavItem = {
  label: string;
  href: string;
  matches: readonly string[];
  enabled: boolean;
  icon: BrandIconName;
};

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Home', href: '/(app)/dashboard', matches: ['/dashboard'], enabled: true, icon: 'home' },
  { label: 'Circles', href: '/(app)/circles', matches: ['/circles'], enabled: FEATURES.CIRCLES_ENABLED, icon: 'circles' },
  { label: 'Goals', href: '/(app)/goals', matches: ['/goals'], enabled: true, icon: 'goals' },
  { label: 'Projects', href: '/(app)/projects', matches: ['/projects'], enabled: true, icon: 'project' },
  { label: 'Notes', href: '/(app)/notes', matches: ['/notes', '/entries'], enabled: FEATURES.ECHO_ENABLED, icon: 'notes' },
  { label: 'Journal', href: '/(app)/journal', matches: ['/journal', '/reflections'], enabled: FEATURES.ECHO_ENABLED, icon: 'reflections' },
  { label: 'Momentum', href: '/(app)/momentum', matches: ['/momentum'], enabled: true, icon: 'momentum' },
  {
    label: 'Roots',
    href: '/(app)/constellation',
    matches: ['/constellation'],
    enabled: FEATURES.CONSTELLATION_ENABLED,
    icon: 'constellation',
  },
];

const DESKTOP_NAVIGATION_MIN_WIDTH = 1220;

function CalendarControl({ pathname }: { pathname: string }) {
  const colors = useThemeColors();
  const [hovered, setHovered] = useState(false);
  const active = pathname === '/calendar' || pathname.startsWith('/calendar/');
  return (
    <View style={{ position: 'relative' }}>
      <Pressable
        accessibilityHint="Opens your OHARA calendar"
        accessibilityLabel="Calendar"
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={() => router.push('/calendar')}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: active || hovered ? colors.background.selectedRow : colors.background.card,
          borderColor: active ? colors.border.accent : colors.border.subtle,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          height: CONTROL.iconSize,
          justifyContent: 'center',
          opacity: pressed ? 0.68 : 1,
          width: CONTROL.iconSize,
        })}
      >
        <BrandIcon color={active ? colors.text.accent : colors.text.secondary} name="calendar" size={20} />
      </Pressable>
      {hovered ? (
        <View style={{ backgroundColor: colors.text.primary, borderRadius: RADIUS.sm, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, position: 'absolute', right: 0, top: CONTROL.iconSize + SPACE.xs, zIndex: 30 }}>
          <Text style={{ ...TYPE.meta, color: colors.background.card }}>Calendar</Text>
        </View>
      ) : null}
    </View>
  );
}

function isActiveRoute(pathname: string, item: NavItem): boolean {
  return item.matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}

function NavigationItem({
  compact,
  item,
  pathname,
}: {
  compact: boolean;
  item: NavItem;
  pathname: string;
}) {
  const colors = useThemeColors();
  const [hovered, setHovered] = useState(false);
  const active = isActiveRoute(pathname, item);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !item.enabled, selected: active }}
      disabled={!item.enabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => router.push(item.href as Parameters<typeof router.push>[0])}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: hovered || pressed ? colors.background.hoverAccent : 'transparent',
        borderBottomColor: active ? colors.accent.primary : 'transparent',
        borderBottomWidth: 2,
        borderRadius: compact ? RADIUS.sm : 0,
        flexDirection: compact ? 'column' : 'row',
        gap: compact ? 2 : SPACE.sm,
        justifyContent: 'center',
        minHeight: compact ? 50 : CONTROL.iconSize,
        minWidth: compact ? 68 : undefined,
        opacity: item.enabled ? 1 : 0.4,
        paddingHorizontal: compact ? SPACE.md : SPACE.lg,
      })}
    >
      {
        <BrandIcon
          color={active || hovered ? colors.text.accent : colors.text.secondary}
          name={item.icon}
          size={18}
        />
      }
      <Text
        numberOfLines={1}
        style={{
          ...(compact ? TYPE.meta : TYPE.control),
          color: active || hovered ? colors.text.accent : colors.text.primary,
          fontFamily: FONT.editorial.medium,
          letterSpacing: compact ? 0 : -0.1,
        }}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

export function AppNavigation({
  onNewEntry,
  onNewProject,
}: {
  onNewEntry?: () => void;
  onNewProject?: () => void;
}) {
  const colors = useThemeColors();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desktop = width >= DESKTOP_NAVIGATION_MIN_WIDTH;

  const createEntry = onNewEntry ?? (() => router.push({
    pathname: '/notes',
    params: { create: 'note' },
  }));
  const createProject = onNewProject ?? (() => router.push('/projects/create'));

  return (
    <View
      style={{
        backgroundColor: colors.background.sidebar,
        borderBottomColor: colors.border.divider,
        borderBottomWidth: 1,
        paddingTop: insets.top,
        zIndex: 20,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          minHeight: desktop ? 70 : 58,
          paddingHorizontal: desktop ? SPACE['3xl'] : SPACE.xl,
        }}
      >
        <Pressable
          accessibilityLabel="Go to Home"
          accessibilityRole="button"
          onPress={() => router.push('/(app)/dashboard')}
          style={({ pressed }) => ({
            alignItems: 'center',
            flexDirection: 'row',
            minHeight: CONTROL.iconSize,
            opacity: pressed ? 0.68 : 1,
          })}
        >
          <BrandIcon color={colors.accent.primary} name="ohara" size={desktop ? 34 : 30} />
          <Text
            style={{
              color: colors.text.primary,
              fontFamily: FONT.editorial.medium,
              fontSize: desktop ? 19 : 17,
              letterSpacing: desktop ? 3.8 : 3.2,
              marginLeft: SPACE.lg,
            }}
          >
            OHARA
          </Text>
        </Pressable>

        {desktop ? (
          <View
            accessibilityLabel="Primary navigation"
            style={{
              alignItems: 'center',
              flex: 1,
              flexDirection: 'row',
              gap: SPACE.xs,
              marginLeft: SPACE['3xl'],
            }}
          >
            {NAV_ITEMS.map((item) => (
              <NavigationItem compact={false} item={item} key={item.label} pathname={pathname} />
            ))}
          </View>
        ) : <View style={{ flex: 1 }} />}

        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
          <GlobalCreateControl
            iconOnly
            inline
            onNewEntry={createEntry}
            onNewProject={createProject}
          />
          <CalendarControl pathname={pathname} />
          <AvatarMenu />
        </View>
      </View>

      {!desktop ? (
        <ScrollView
          accessibilityLabel="Primary navigation"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-around' }}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ borderTopColor: colors.border.subtle, borderTopWidth: 1 }}
        >
          {NAV_ITEMS.map((item) => (
            <NavigationItem compact item={item} key={item.label} pathname={pathname} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
