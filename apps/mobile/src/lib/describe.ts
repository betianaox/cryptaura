import { formatPrice, type AlertRule } from '@cryptaura/core';

import { fill } from '@/i18n';
import type { Dictionary } from '@/i18n/en';

/** "Precio ≥ 70.000,00", "Movimiento 24 h ≥ 5%". */
export function describeRule(t: Dictionary, rule: AlertRule, locale: string): string {
  const value = rule.kind === 'price-above' || rule.kind === 'price-below' ? formatPrice(rule.value, locale) : String(rule.value);
  return fill(t.alerts.describe[rule.kind], { v: value });
}

export function timeAgo(ts: number, locale: string): string {
  const diff = Date.now() - ts;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const min = Math.round(diff / 60_000);
  if (min < 60) return rtf.format(-min, 'minute');
  const h = Math.round(min / 60);
  if (h < 24) return rtf.format(-h, 'hour');
  return rtf.format(-Math.round(h / 24), 'day');
}
