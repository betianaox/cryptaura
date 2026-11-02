import type { ExchangeId, OrderBook, Ticker } from './types';

/** Precio medio entre la mejor compra y la mejor venta. */
export function midPrice(book: OrderBook): number | null {
  const bid = book.bids[0]?.price;
  const ask = book.asks[0]?.price;
  if (bid === undefined || ask === undefined) return null;
  return (bid + ask) / 2;
}

export function spread(book: OrderBook): { absolute: number; pct: number } | null {
  const bid = book.bids[0]?.price;
  const ask = book.asks[0]?.price;
  if (bid === undefined || ask === undefined) return null;
  const absolute = ask - bid;
  return { absolute, pct: (absolute / ((ask + bid) / 2)) * 100 };
}

/**
 * Desequilibrio del libro en los primeros `levels` niveles, entre -1 y 1.
 * Positivo: hay más cantidad del lado comprador; negativo, del vendedor.
 */
export function bookImbalance(book: OrderBook, levels = 10): number {
  const sum = (side: OrderBook['bids']) => side.slice(0, levels).reduce((acc, l) => acc + l.qty, 0);
  const bids = sum(book.bids);
  const asks = sum(book.asks);
  const total = bids + asks;
  return total === 0 ? 0 : (bids - asks) / total;
}

/** Cantidad acumulada nivel por nivel, para el gráfico de profundidad. */
export function cumulativeDepth(levels: OrderBook['bids']): { price: number; total: number }[] {
  let total = 0;
  return levels.map((level) => {
    total += level.qty;
    return { price: level.price, total };
  });
}

export interface CrossExchangeGap {
  /** Dónde está la compra más alta y la venta más baja. */
  bestBid: { exchange: ExchangeId; price: number };
  bestAsk: { exchange: ExchangeId; price: number };
  /** Diferencia entre el precio más alto y el más bajo (último precio), en %. */
  gapPct: number;
}

/** Compara el mismo par en varios exchanges. Necesita al menos dos. */
export function crossExchangeGap(tickers: Ticker[]): CrossExchangeGap | null {
  if (tickers.length < 2) return null;
  const bestBid = tickers.reduce((a, b) => (b.bid > a.bid ? b : a));
  const bestAsk = tickers.reduce((a, b) => (b.ask < a.ask ? b : a));
  const lasts = tickers.map((t) => t.last);
  const max = Math.max(...lasts);
  const min = Math.min(...lasts);
  return {
    bestBid: { exchange: bestBid.exchange, price: bestBid.bid },
    bestAsk: { exchange: bestAsk.exchange, price: bestAsk.ask },
    gapPct: min === 0 ? 0 : ((max - min) / min) * 100,
  };
}
