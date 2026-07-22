import { useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import { router, usePathname } from 'expo-router';
import { BrandIcon, type BrandIconName } from '@/components/ui/BrandIcon';
import { FEATURES } from '@/constants/features';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { AvatarMenu } from './AvatarMenu';

type NavItem = {
  label: string;
  href: string;
  match: string;
  enabled: boolean;
  icon?: BrandIconName;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Journey',       href: '/(app)/dashboard',     match: '/dashboard',     enabled: true, icon: 'goals' },
  { label: 'Echo',          href: '/(app)/echo',          match: '/echo',          enabled: FEATURES.ECHO_ENABLED, icon: 'echo' },
  { label: 'Constellation', href: '/(app)/constellation', match: '/constellation', enabled: FEATURES.CONSTELLATION_ENABLED },
  { label: 'Explore',       href: '/(app)/explore',       match: '/explore',       enabled: FEATURES.DISCOVERY_ENABLED },
];

const SIDEBAR_WIDTH = {
  collapsed: 76,
  expanded: 220,
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
  const themeMode = useUIStore((state) => state.themeMode);
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
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
          paddingTop: collapsed ? 32 : 24,
          paddingHorizontal: collapsed ? 0 : 16,
          paddingBottom: collapsed ? 8 : 12,
        }}
      >
        {collapsed ? (
          <Pressable
            onPress={toggleSidebarCollapsed}
            accessibilityLabel="Expand sidebar"
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
              tintColor={themeMode === 'light' ? colors.text.primary : undefined}
            />
          </Pressable>
        ) : (
          <View style={{ flexDirection: 'column', alignItems: 'stretch', flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 0 }}>
              <BrandIcon
                name="ohara"
                size={BRAND_SIZE.expandedLogo}
                style={{ marginRight: 10 }}
                tintColor={themeMode === 'light' ? colors.text.primary : undefined}
              />
              <Text
                style={{
                  color: colors.text.primary,
                  fontFamily: 'Inter-SemiBold',
                  fontSize: BRAND_SIZE.expandedText,
                  letterSpacing: 4,
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
                alignSelf: 'flex-end',
                justifyContent: 'center',
                marginTop: 8,
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
            pathname.startsWith(item.match + '/') ||
            (item.href === '/(app)/dashboard' && pathname.startsWith('/goals/'));
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
                borderRadius: 12,
                marginHorizontal: 12,
                marginBottom: 4,
                backgroundColor: isActive
                  ? colors.background.selectedRow
                  : hoveredItem === item.label || pressed
                    ? colors.background.subtle
                    : 'transparent',
                opacity: item.enabled ? 1 : 0.4,
              })}
            >
              {item.icon && (
                <BrandIcon
                  name={item.icon}
                  size={collapsed ? NAV_ICON_SIZE.collapsed : NAV_ICON_SIZE.expanded}
                  tintColor={
                    themeMode === 'light'
                      ? isActive
                        ? colors.text.accent
                        : colors.text.secondary
                      : undefined
                  }
                  style={{
                    marginRight: collapsed ? 0 : 10,
                    opacity: isActive ? 1 : item.enabled ? 0.72 : 0.4,
                  }}
                />
              )}
              {(!collapsed || !item.icon) && (
                <Text
                  style={{
                    color: isActive ? colors.text.accent : colors.text.secondary,
                    fontSize: 14,
                    fontFamily: 'Inter-Medium',
                  }}
                >
                  {collapsed ? item.label.charAt(0) : item.label}
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
