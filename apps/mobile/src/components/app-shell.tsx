import { describeRule } from '@/lib/describe';
import { shouldTrigger, type MarketId } from '@cryptaura/core';
import { ConnectionBadge, Pill, ThemeContext, Txt, darkTheme, lightTheme, radius, spacing, useTheme } from '@cryptaura/ui';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConnectionState, useTickers } from '@/hooks/use-market-data';
import { fill, useI18n } from '@/i18n';
import { useIsDemo } from '@/lib/feed';
import { useStore } from '@/state/store';

/** Tema según Ajustes: sistema, claro u oscuro. */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const preference = useStore((s) => s.theme);
  const scheme = useColorScheme();
  const theme =
    preference === 'light' || (preference === 'system' && scheme === 'light') ? lightTheme : darkTheme;
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Estado de la conexión, traducido, o "Demo" si la fuente es la simulada. */
export function LiveBadge() {
  const { t } = useI18n();
  const state = useConnectionState();
  const demo = useIsDemo();
  if (demo) return <Pill label={t.common.demoData} />;
  const label = {
    idle: t.common.offline,
    connecting: t.common.connecting,
    open: t.common.live,
    reconnecting: t.common.reconnecting,
    closed: t.common.offline,
  }[state];
  return <ConnectionBadge state={state} label={label} />;
}

/**
 * Vigila en segundo plano, mientras la app está abierta:
 * - las alertas activas, para avisar cuando se cumplen;
 * - las órdenes límite del simulador, para ejecutarlas.
 * Con el backend, las alertas también se evalúan con la app cerrada.
 */
export function Watchers() {
  const alerts = useStore((s) => s.alerts);
  const orders = useStore((s) => s.paper.orders);
  const recordTrigger = useStore((s) => s.recordTrigger);
  const fillOrders = useStore((s) => s.fillOrders);
  const showToast = useStore((s) => s.showToast);
  const { t, locale } = useI18n();

  const markets = useMemo(() => {
    const set = new Set<MarketId>();
    alerts.filter((a) => a.enabled).forEach((a) => set.add(a.market));
    orders.filter((o) => o.status === 'open').forEach((o) => set.add(o.market));
    return [...set].sort();
  }, [alerts, orders]);

  const tickers = useTickers(markets, 1);

  useEffect(() => {
    const now = Date.now();
    for (const ticker of Object.values(tickers)) {
      if (!ticker) continue;
      fillOrders(ticker);
      for (const alert of useStore.getState().alerts) {
        if (!shouldTrigger(alert, ticker, now)) continue;
        recordTrigger(alert, ticker);
        showToast({
          title: fill(t.alerts.triggered, { m: alert.market, rule: describeRule(t, alert.rule, locale) }),
        });
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }
  }, [tickers, fillOrders, recordTrigger, showToast, t, locale]);

  return null;
}

/** Aviso que aparece arriba unos segundos. */
export function ToastHost() {
  const toast = useStore((s) => s.toast);
  const hide = useStore((s) => s.hideToast);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const id = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => hide());
    }, 3500);
    return () => clearTimeout(id);
  }, [toast, anim, hide]);

  if (!toast) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.toastWrap,
        { top: insets.top + spacing.sm, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] },
      ]}
    >
      <Pressable onPress={hide} accessibilityRole="alert" style={[styles.toast, { backgroundColor: theme.surfaceAlt, borderColor: theme.accent }]}>
        <View style={[styles.toastDot, { backgroundColor: theme.accent }]} />
        <View style={{ flex: 1 }}>
          <Txt variant="label">{toast.title}</Txt>
          {toast.body ? <Txt variant="small">{toast.body}</Txt> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, zIndex: 100 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  toastDot: { width: 8, height: 8, borderRadius: 4 },
});
