import { useState } from 'react';
import { Pressable, View, Text, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { BrandIcon, type BrandIconName } from '@/components/ui/BrandIcon';
import { FEATURES } from '@/constants/features';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { AvatarMenu } from './AvatarMenu';
import { LAYOUT, RADIUS, SPACE } from '@/constants/design';

type NavItem = {
  label: string;
  href: string;
  match: string;
  enabled: boolean;
  icon: BrandIconName;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Home',          href: '/(app)/dashboard',     match: '/dashboard',     enabled: true, icon: 'home' },
  { label: 'Goals',         href: '/(app)/goals',         match: '/goals',         enabled: true, icon: 'goals' },
  { label: 'Echo',          href: '/(app)/echo',          match: '/entries',       enabled: FEATURES.ECHO_ENABLED, icon: 'echo' },
  { label: 'Momentum',      href: '/(app)/momentum',      match: '/momentum',      enabled: true, icon: 'momentum' },
  { label: 'Constellation', href: '/(app)/constellation', match: '/constellation', enabled: FEATURES.CONSTELLATION_ENABLED, icon: 'constellation' },
];

const SIDEBAR_WIDTH = {
  collapsed: LAYOUT.sidebarCollapsedWidth,
  expanded: 168,
} as const;

const BRAND_SIZE = {
  collapsedLogo: 38,
  collapsedLogoTarget: 44,
  expandedLogo: 64,
  expandedText: 24,
} as const;

const NAV_ICON_SIZE = {
  collapsed: 24,
  expanded: 20,
} as const;

export function Sidebar() {
  const colors = useThemeColors();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const storedCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const compactViewport = width < 720;
  const collapsed = compactViewport || storedCollapsed;
  const toggleSidebarCollapsed = useUIStore((state) => state.toggleSidebarCollapsed);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <View
      style={{
        width: collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded,
        backgroundColor: colors.background.sidebar,
        borderRightColor: colors.border.divider,
        borderRightWidth: 1,
        flexDirection: 'column',
        alignSelf: 'stretch',
      }}
    >
      {/* Logo + collapse toggle */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: collapsed ? SPACE['4xl'] : SPACE['3xl'],
          paddingHorizontal: collapsed ? 0 : SPACE.xl,
          paddingBottom: collapsed ? SPACE.md : SPACE.xl,
        }}
      >
        {collapsed ? (
          <Pressable
            disabled={compactViewport}
            onPress={compactViewport ? undefined : toggleSidebarCollapsed}
            accessibilityLabel={compactViewport ? 'Ohara' : 'Expand sidebar'}
            accessibilityRole="button"
            style={({ pressed }) => ({
              width: BRAND_SIZE.collapsedLogoTarget,
              height: BRAND_SIZE.collapsedLogoTarget,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <BrandIcon
              name="ohara"
              size={BRAND_SIZE.collapsedLogo}
              tintColor={colors.accent.primary}
            />
          </Pressable>
        ) : (
          <View style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
            <View style={{ alignItems: 'center' }}>
              <BrandIcon
                name="ohara"
                size={52}
                tintColor={colors.accent.primary}
              />
              <Text
                style={{
                  color: colors.text.primary,
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 15,
                  letterSpacing: 4.5,
                  marginTop: SPACE.md,
                }}
              >
                OHARA
              </Text>
            </View>
            <Pressable
              onPress={toggleSidebarCollapsed}
              accessibilityLabel="Collapse sidebar"
              accessibilityRole="button"
              style={({ pressed }) => ({
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: colors.background.input,
                alignItems: 'center',
                position: 'absolute',
                right: 0,
                top: 0,
                justifyContent: 'center',
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <Text style={{ color: colors.text.accent, fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 13 }}>‹</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Nav items */}
      <View style={{ paddingTop: 16 }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.match ||
            pathname.startsWith(item.match + '/');
          const isHovered = hoveredItem === item.label;
          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: !item.enabled, selected: isActive }}
              disabled={!item.enabled}
              onHoverIn={() => setHoveredItem(item.label)}
              onHoverOut={() => setHoveredItem(null)}
              onPress={() => {
                if (item.enabled) {
                  router.push(item.href as Parameters<typeof router.push>[0]);
                }
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                paddingHorizontal: collapsed ? 0 : 16,
                paddingVertical: 12,
                borderRadius: RADIUS.md,
                marginHorizontal: SPACE.lg,
                marginBottom: SPACE.sm,
                minHeight: 48,
                backgroundColor: isActive
                  ? colors.background.selectedRow
                  : isHovered || pressed
                    ? colors.background.hoverAccent
                    : 'transparent',
                opacity: item.enabled ? 1 : 0.4,
              })}
            >
              <BrandIcon
                name={item.icon}
                size={collapsed ? NAV_ICON_SIZE.collapsed : NAV_ICON_SIZE.expanded}
                color={isActive || isHovered ? colors.text.accent : colors.text.secondary}
                style={{
                  marginRight: collapsed ? 0 : 10,
                  opacity: isActive || isHovered ? 1 : item.enabled ? 0.72 : 0.4,
                }}
              />
              {!collapsed && (
                <Text
                  style={{
                    color: isActive || isHovered ? colors.text.accent : colors.text.secondary,
                  fontSize: 14,
                  fontFamily: 'Inter-Medium',
                  letterSpacing: -0.1,
                  }}
                >
                  {item.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Bottom: avatar menu (Profile / Settings / Log out) */}
      <View
        style={{
          paddingBottom: 32,
          paddingHorizontal: 12,
          alignItems: collapsed ? 'center' : 'stretch',
        }}
      >
        <AvatarMenu />
      </View>
    </View>
  );
}
