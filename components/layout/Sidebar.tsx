import { View, Text, TouchableOpacity } from 'react-native';
import { router, usePathname } from 'expo-router';
import { BrandIcon, type BrandIconName } from '@/components/ui/BrandIcon';
import { FEATURES } from '@/constants/features';
import { LIGHT_THEME } from '@/constants/colors';
import { useUIStore } from '@/store/uiStore';
import { AvatarMenu } from './AvatarMenu';

type NavItem = {
  label: string;
  href: string;
  match: string;
  enabled: boolean;
  icon?: BrandIconName;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Goals',         href: '/(app)/dashboard',     match: '/dashboard',     enabled: true, icon: 'goals' },
  { label: 'Echo',          href: '/(app)/echo',          match: '/echo',          enabled: FEATURES.ECHO_ENABLED, icon: 'echo' },
  { label: 'Constellation', href: '/(app)/constellation', match: '/constellation', enabled: FEATURES.CONSTELLATION_ENABLED },
  { label: 'Explore',       href: '/(app)/explore',       match: '/explore',       enabled: FEATURES.DISCOVERY_ENABLED },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((state) => state.toggleSidebarCollapsed);

  return (
    <View
      style={{
        width: collapsed ? 76 : 220,
        backgroundColor: '#1E3226',
        flexDirection: 'column',
        alignSelf: 'stretch',
      }}
    >
      {/* Logo + collapse toggle */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          paddingTop: 32,
          paddingHorizontal: collapsed ? 0 : 24,
          paddingBottom: 8,
        }}
      >
        {collapsed ? (
          <TouchableOpacity
            onPress={toggleSidebarCollapsed}
            accessibilityLabel="Expand sidebar"
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <BrandIcon name="ohara" size={38} />
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 0 }}>
            <BrandIcon name="ohara" size={32} style={{ marginRight: 10 }} />
            <Text
              style={{
                color: '#EDE7DA',
                fontFamily: 'Inter-SemiBold',
                fontSize: 12,
                letterSpacing: 4,
              }}
            >
              OHARA
            </Text>
          </View>
        )}
        {!collapsed && (
          <TouchableOpacity
            onPress={toggleSidebarCollapsed}
            accessibilityLabel="Collapse sidebar"
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: LIGHT_THEME.border.toggleGlyph, fontSize: 13, lineHeight: 13 }}>‹</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Nav items */}
      <View style={{ paddingTop: 16 }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.match || pathname.startsWith(item.match + '/');
          return (
            <TouchableOpacity
              key={item.label}
              onPress={() => {
                if (item.enabled) {
                  router.push(item.href as Parameters<typeof router.push>[0]);
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                paddingHorizontal: collapsed ? 0 : 16,
                paddingVertical: 12,
                borderRadius: 12,
                marginHorizontal: 12,
                marginBottom: 4,
                backgroundColor: isActive ? '#2A4436' : 'transparent',
                opacity: item.enabled ? 1 : 0.4,
              }}
              activeOpacity={0.7}
            >
              {item.icon && (
                <BrandIcon
                  name={item.icon}
                  size={collapsed ? 24 : 20}
                  style={{
                    marginRight: collapsed ? 0 : 10,
                  }}
                />
              )}
              {(!collapsed || !item.icon) && (
                <Text
                  style={{
                    color: isActive ? '#EDE7DA' : '#8FA294',
                    fontSize: 14,
                    fontFamily: 'Inter-Medium',
                  }}
                >
                  {collapsed ? item.label.charAt(0) : item.label}
                </Text>
              )}
            </TouchableOpacity>
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
