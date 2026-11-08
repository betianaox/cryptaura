import { useTheme } from '@cryptaura/ui';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppThemeProvider, ToastHost, Watchers } from '@/components/app-shell';
import { useI18n } from '@/i18n';

function RootStack() {
  const theme = useTheme();
  const { t } = useI18n();
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.background);
  }, [theme.background]);
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="market/[slug]" options={{ title: '' }} />
        <Stack.Screen name="alert/new" options={{ title: t.alerts.new, presentation: 'modal' }} />
        <Stack.Screen name="trade/[slug]" options={{ title: t.sim.trade, presentation: 'modal' }} />
        <Stack.Screen name="about" options={{ title: t.settings.data }} />
      </Stack>
      <Watchers />
      <ToastHost />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <RootStack />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
