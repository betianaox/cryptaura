import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cancelOrder,
  fillOpenOrders,
  newPaperAccount,
  placeOrder,
  type Alert,
  type AlertRule,
  type MarketId,
  type OrderInput,
  type OrderResult,
  type PaperAccount,
  type Ticker,
} from '@cryptaura/core';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Language } from '@/i18n';

// Estado de la app, guardado en el teléfono. No hay cuenta ni servidor: los
// favoritos, las alertas y el simulador viven acá. Cuando llegue el backend,
// las alertas se sincronizan con él para avisar con la app cerrada.

export type ThemePreference = 'system' | 'light' | 'dark';
export type DataSource = 'live' | 'demo';

export interface AlertEvent {
  id: string;
  alertId: string;
  market: MarketId;
  rule: AlertRule;
  price: number;
  at: number;
}

export interface Toast {
  id: string;
  title: string;
  body?: string;
}

interface State {
  theme: ThemePreference;
  language: Language | 'system';
  source: DataSource;
  favorites: MarketId[];
  alerts: Alert[];
  alertEvents: AlertEvent[];
  paper: PaperAccount;
  /** Aviso en pantalla (no se guarda). */
  toast: Toast | null;

  setTheme(theme: ThemePreference): void;
  setLanguage(language: Language | 'system'): void;
  setSource(source: DataSource): void;
  toggleFavorite(market: MarketId): void;
  addAlert(market: MarketId, rule: AlertRule): void;
  setAlertEnabled(id: string, enabled: boolean): void;
  removeAlert(id: string): void;
  recordTrigger(alert: Alert, ticker: Ticker): void;
  placeOrder(input: Omit<OrderInput, 'id'>, ticker: Ticker | undefined): OrderResult;
  cancelOrder(id: string): void;
  fillOrders(ticker: Ticker): void;
  resetPaper(): void;
  resetAll(): void;
  showToast(toast: Omit<Toast, 'id'>): void;
  hideToast(): void;
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const DEFAULTS = {
  theme: 'system' as ThemePreference,
  language: 'system' as const,
  source: 'live' as DataSource,
  favorites: ['BTC/USD', 'ETH/USD', 'SOL/USD'] as MarketId[],
  alerts: [] as Alert[],
  alertEvents: [] as AlertEvent[],
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      paper: newPaperAccount(),
      toast: null,

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setSource: (source) => set({ source }),
      toggleFavorite: (market) =>
        set((s) => ({
          favorites: s.favorites.includes(market)
            ? s.favorites.filter((m) => m !== market)
            : [...s.favorites, market],
        })),

      addAlert: (market, rule) =>
        set((s) => ({ alerts: [{ id: newId(), market, rule, enabled: true, createdAt: Date.now() }, ...s.alerts] })),
      setAlertEnabled: (id, enabled) =>
        set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, enabled } : a)) })),
      removeAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
      recordTrigger: (alert, ticker) =>
        set((s) => ({
          alerts: s.alerts.map((a) => (a.id === alert.id ? { ...a, lastTriggeredAt: Date.now() } : a)),
          alertEvents: [
            { id: newId(), alertId: alert.id, market: alert.market, rule: alert.rule, price: ticker.last, at: Date.now() },
            ...s.alertEvents,
          ].slice(0, 50),
        })),

      placeOrder: (input, ticker) => {
        const result = placeOrder(get().paper, { ...input, id: newId() }, ticker, Date.now());
        if (result.ok) set({ paper: result.account });
        return result;
      },
      cancelOrder: (id) => set((s) => ({ paper: cancelOrder(s.paper, id) })),
      fillOrders: (ticker) => {
        const before = get().paper;
        const after = fillOpenOrders(before, ticker, Date.now());
        if (after !== before && after.orders.some((o, i) => o !== before.orders[i])) set({ paper: after });
      },
      resetPaper: () => set({ paper: newPaperAccount() }),
      resetAll: () => set({ ...DEFAULTS, favorites: [], paper: newPaperAccount() }),

      showToast: (toast) => set({ toast: { ...toast, id: newId() } }),
      hideToast: () => set({ toast: null }),
    }),
    {
      name: 'cryptaura',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ theme, language, source, favorites, alerts, alertEvents, paper }) => ({
        theme,
        language,
        source,
        favorites,
        alerts,
        alertEvents,
        paper,
      }),
    },
  ),
);

/** Alias para leer ajustes: `useSettings((s) => s.theme)`. */
export const useSettings = useStore;
