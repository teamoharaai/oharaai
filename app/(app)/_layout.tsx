import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { FEATURES } from '@/constants/features';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.4, color: '#FAFAFA' }}>{label}</Text>
  );
}

// Change 2: Badge style ready for when counts are wired — no tabBarBadge values yet
const badgeStyle = {
  backgroundColor: '#6FDFB8',
  color: '#0A0A0F',
  fontSize: 10,
  minWidth: 16,
  height: 16,
  borderRadius: 8,
  lineHeight: 16,
};

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0A0F',
          borderTopColor: '#1E1E2E',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#FAFAFA',
        tabBarInactiveTintColor: '#8888A0',
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
