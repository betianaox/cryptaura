import {
  bookImbalance,
  crossExchangeGap,
  formatPct,
  formatPrice,
  spread,
  type OrderBook,
  type Ticker,
} from '@cryptaura/core';

import { fill } from '@/i18n';
import type { Dictionary } from '@/i18n/en';

// Resumen del mercado armado con reglas a partir de los datos en vivo.
//
// Es el reemplazo honesto mientras no está el backend con Gemini: describe lo
// que muestran los números (variación, rango, libro, spread, diferencia entre
// exchanges) y nunca recomienda qué hacer. El resumen con IA va a recibir
// exactamente estos mismos datos ya calculados.

export function pairBrief(
  t: Dictionary,
  locale: string,
  ticker: Ticker,
  book: OrderBook | null,
  others: Ticker[],
): string[] {
  const b = t.brief;
  const pct = (v: number) => formatPct(Math.abs(v), locale).replace('+', '');
  const price = formatPrice(ticker.last, locale);
  const lines: string[] = [];

  const change = ticker.changePct24h;
  if (Math.abs(change) < 0.3) lines.push(fill(b.flat, { m: ticker.market, price }));
  else lines.push(fill(change > 0 ? b.up : b.down, { m: ticker.market, pct: pct(change), price }));

  const range = ticker.high24h - ticker.low24h;
  if (range > 0) {
    const position = (ticker.last - ticker.low24h) / range;
    if (position > 0.85) lines.push(b.nearHigh);
    else if (position < 0.15) lines.push(b.nearLow);
    else
      lines.push(
        fill(b.midRange, { low: formatPrice(ticker.low24h, locale), high: formatPrice(ticker.high24h, locale) }),
      );
  }

  if (book) {
    const imbalance = bookImbalance(book, 10);
    if (imbalance > 0.15) lines.push(fill(b.buyers, { pct: pct(imbalance * 100) }));
    else if (imbalance < -0.15) lines.push(fill(b.sellers, { pct: pct(-imbalance * 100) }));
    else lines.push(b.balanced);

    const s = spread(book);
    if (s) lines.push(fill(s.pct > 0.1 ? b.wide : b.tight, { pct: `${s.pct.toFixed(3)}%` }));
  }

  const gap = crossExchangeGap([ticker, ...others]);
  if (gap && gap.gapPct >= 0.05) lines.push(fill(b.gap, { pct: `${gap.gapPct.toFixed(2)}%` }));

  return lines;
}

/** Resumen del día con todos los pares seguidos. */
export function marketBrief(t: Dictionary, locale: string, tickers: Ticker[]): string | null {
  if (tickers.length === 0) return null;
  const moving = tickers.filter((tk) => !tk.market.startsWith('USDT') && !tk.market.startsWith('USDC'));
  const up = moving.filter((tk) => tk.changePct24h > 0).length;
  const down = moving.length - up;
  const top = [...moving].sort((a, b) => Math.abs(b.changePct24h) - Math.abs(a.changePct24h))[0];
  if (!top) return null;
  const params = { up, down, total: moving.length, top: top.market, pct: formatPct(top.changePct24h, locale) };
  return fill(up >= down ? t.brief.marketUp : t.brief.marketDown, params);
}
