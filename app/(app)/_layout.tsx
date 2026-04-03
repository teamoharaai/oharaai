import { Platform, View, useWindowDimensions } from 'react-native';
import { Text } from 'react-native';
import { Stack, Tabs } from 'expo-router';
import { FEATURES } from '@/constants/features';
import { Sidebar } from '@/components/layout/Sidebar';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.4, color: '#4A7C5F' }}>{label}</Text>
  );
}

const badgeStyle = {
  backgroundColor: '#4A7C5F',
  color: '#FFFFFF',
  fontSize: 10,
  minWidth: 16,
  height: 16,
  borderRadius: 8,
  lineHeight: 16,
};

export default function AppLayout() {
  const { width } = useWindowDimensions();
  const showSidebar = Platform.OS === 'web' && width >= 768;

  if (showSidebar) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Sidebar />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="starlog" />
            <Stack.Screen name="explore" />
          </Stack>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#F5F1EA',
          borderTopColor: 'rgba(0,0,0,0.06)',
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: '#4A7C5F',
        tabBarInactiveTintColor: '#9CAF9F',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Goals',
          tabBarIcon: ({ focused }) => <TabIcon label="◎" focused={focused} />,
          tabBarBadgeStyle: badgeStyle,
        }}
      />
      {FEATURES.STARLOG_ENABLED ? (
        <Tabs.Screen
          name="starlog"
          options={{
            title: 'Starlog',
            tabBarIcon: ({ focused }) => <TabIcon label="✦" focused={focused} />,
            tabBarBadgeStyle: badgeStyle,
          }}
        />
      ) : null}
      {FEATURES.DISCOVERY_ENABLED ? (
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ focused }) => <TabIcon label="◈" focused={focused} />,
            tabBarBadgeStyle: badgeStyle,
          }}
        />
      ) : null}
    </Tabs>
  );
}
