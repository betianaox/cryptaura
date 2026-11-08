import type { MarketId, Ticker } from './types';

// Alertas de mercado. La misma función evalúa en la app (mientras está abierta)
// y en la Lambda `alerts` del backend (cada minuto, con la app cerrada).

export type AlertRule =
  | { kind: 'price-above'; value: number }
  | { kind: 'price-below'; value: number }
  /** Variación de 24 h, en valor absoluto, mayor o igual a `value` %. */
  | { kind: 'change-above'; value: number }
  /** Spread mayor o igual a `value` %. */
  | { kind: 'spread-above'; value: number };

export type AlertKind = AlertRule['kind'];

export interface Alert {
  id: string;
  market: MarketId;
  rule: AlertRule;
  enabled: boolean;
  createdAt: number;
  lastTriggeredAt?: number;
}

/** Después de dispararse, una alerta espera esto antes de volver a avisar. */
export const ALERT_COOLDOWN_MS = 15 * 60 * 1000;

export function tickerSpreadPct(ticker: Ticker): number {
  const mid = (ticker.ask + ticker.bid) / 2;
  return mid === 0 ? 0 : ((ticker.ask - ticker.bid) / mid) * 100;
}

/** ¿Se cumple la condición con este ticker? (sin mirar el tiempo de espera). */
export function ruleMatches(rule: AlertRule, ticker: Ticker): boolean {
  switch (rule.kind) {
    case 'price-above':
      return ticker.last >= rule.value;
    case 'price-below':
      return ticker.last <= rule.value;
    case 'change-above':
      return Math.abs(ticker.changePct24h) >= rule.value;
    case 'spread-above':
      return tickerSpreadPct(ticker) >= rule.value;
  }
}

/** ¿Hay que avisar ahora? Activa, del mismo par, condición cumplida y fuera del tiempo de espera. */
export function shouldTrigger(alert: Alert, ticker: Ticker, now: number): boolean {
  if (!alert.enabled || alert.market !== ticker.market) return false;
  if (alert.lastTriggeredAt !== undefined && now - alert.lastTriggeredAt < ALERT_COOLDOWN_MS) return false;
  return ruleMatches(alert.rule, ticker);
}
