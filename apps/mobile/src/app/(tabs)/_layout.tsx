import { useTheme } from '@cryptaura/ui';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useI18n } from '@/i18n';
import { useStore } from '@/state/store';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useI18n();
  const openOrders = useStore((s) => s.paper.orders.filter((o) => o.status === 'open').length);
  const icon = (name: IconName) =>
    function TabIcon({ color, size }: { color: ColorValue; size: number }) {
      return <Ionicons name={name} color={color as string} size={size} />;
    };
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        sceneStyle: { backgroundColor: theme.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.markets, tabBarIcon: icon('stats-chart') }} />
      <Tabs.Screen name="overview" options={{ title: t.tabs.overview, tabBarIcon: icon('pulse') }} />
      <Tabs.Screen name="alerts" options={{ title: t.tabs.alerts, tabBarIcon: icon('notifications') }} />
      <Tabs.Screen
        name="simulator"
        options={{
          title: t.tabs.simulator,
          tabBarIcon: icon('wallet'),
          tabBarBadge: openOrders > 0 ? openOrders : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.accent, color: theme.onAccent },
        }}
      />
      <Tabs.Screen name="settings" options={{ title: t.tabs.settings, tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
