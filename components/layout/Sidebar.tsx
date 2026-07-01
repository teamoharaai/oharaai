import { View, Text, TouchableOpacity } from 'react-native';
import { router, usePathname } from 'expo-router';
import { FEATURES } from '@/constants/features';
import { AvatarMenu } from './AvatarMenu';

type NavItem = {
  label: string;
  href: string;
  match: string;
  enabled: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Goals',         href: '/(app)/dashboard',     match: '/dashboard',     enabled: true },
  { label: 'Echo',          href: '/(app)/echo',          match: '/echo',          enabled: FEATURES.ECHO_ENABLED },
  { label: 'Constellation', href: '/(app)/constellation', match: '/constellation', enabled: FEATURES.CONSTELLATION_ENABLED },
  { label: 'Explore',       href: '/(app)/explore',       match: '/explore',       enabled: FEATURES.DISCOVERY_ENABLED },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <View
      style={{
        width: 220,
        backgroundColor: '#3D5247',
        flexDirection: 'column',
        alignSelf: 'stretch',
      }}
    >
      {/* Logo */}
      <View style={{ paddingTop: 32, paddingHorizontal: 24, paddingBottom: 8 }}>
        <Text
          style={{
            color: '#E8EDE9',
            fontWeight: '600',
            fontSize: 12,
            letterSpacing: 4,
          }}
        >
          OHARA
        </Text>
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
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                marginHorizontal: 12,
                marginBottom: 4,
                backgroundColor: isActive ? '#2E4238' : 'transparent',
                opacity: item.enabled ? 1 : 0.4,
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color: isActive ? '#E8EDE9' : '#A8C4AE',
                  fontSize: 14,
                  fontWeight: '500',
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Bottom: avatar menu (Profile / Settings / Log out) */}
      <View style={{ paddingBottom: 32, paddingHorizontal: 12 }}>
        <AvatarMenu />
      </View>
    </View>
  );
}
