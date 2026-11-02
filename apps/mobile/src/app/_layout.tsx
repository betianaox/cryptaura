import { useTheme } from '@cryptaura/ui';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Markets' }} />
        <Stack.Screen name="market/[slug]" options={{ title: '' }} />
        <Stack.Screen name="about" options={{ title: 'Data & disclaimer' }} />
      </Stack>
    </>
  );
}
