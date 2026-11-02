import { describe, expect, it } from 'vitest';

import {
  bookImbalance,
  crc32,
  crossExchangeGap,
  cumulativeDepth,
  marketId,
  marketToSlug,
  slugToMarket,
  spread,
  type OrderBook,
  type Ticker,
} from './index';

describe('crc32', () => {
  it('da el valor de control estándar', () => {
    // Valor de verificación clásico de CRC-32/IEEE.
    expect(crc32('123456789')).toBe(0xcbf43926);
  });

  it('es 0 para un texto vacío', () => {
    expect(crc32('')).toBe(0);
  });
});

describe('pares', () => {
  it('normaliza los códigos propios de cada exchange', () => {
    expect(marketId('XBT', 'ZUSD')).toBe('BTC/USD');
    expect(marketId('xdg', 'eur')).toBe('DOGE/EUR');
  });

  it('pasa el par a la URL y vuelve', () => {
    expect(marketToSlug('ETH/USD')).toBe('ETH-USD');
    expect(slugToMarket('ETH-USD')).toBe('ETH/USD');
  });
});

const book: OrderBook = {
  exchange: 'kraken',
  market: 'BTC/USD',
  bids: [
    { price: 100, qty: 3 },
    { price: 99, qty: 1 },
  ],
  asks: [
    { price: 101, qty: 1 },
    { price: 102, qty: 1 },
  ],
  ts: 0,
};

describe('estadísticas del libro', () => {
  it('calcula el spread absoluto y porcentual', () => {
    const s = spread(book)!;
    expect(s.absolute).toBe(1);
    expect(s.pct).toBeCloseTo((1 / 100.5) * 100, 6);
  });

  it('calcula el desequilibrio entre -1 y 1', () => {
    // 4 de compra contra 2 de venta → (4 - 2) / 6
    expect(bookImbalance(book)).toBeCloseTo(1 / 3, 6);
  });

  it('acumula la profundidad nivel por nivel', () => {
    expect(cumulativeDepth(book.bids)).toEqual([
      { price: 100, total: 3 },
      { price: 99, total: 4 },
    ]);
  });
});

describe('comparación entre exchanges', () => {
  const t = (exchange: Ticker['exchange'], bid: number, ask: number, last: number): Ticker => ({
    exchange,
    market: 'BTC/USD',
    bid,
    ask,
    last,
    change24h: 0,
    changePct24h: 0,
    volume24h: 0,
    high24h: 0,
    low24h: 0,
    ts: 0,
  });

  it('encuentra la mejor compra, la mejor venta y la diferencia', () => {
    const gap = crossExchangeGap([t('kraken', 100, 101, 100.5), t('coinbase', 102, 103, 102.5)])!;
    expect(gap.bestBid).toEqual({ exchange: 'coinbase', price: 102 });
    expect(gap.bestAsk).toEqual({ exchange: 'kraken', price: 101 });
    expect(gap.gapPct).toBeCloseTo((2 / 100.5) * 100, 6);
  });

  it('necesita al menos dos fuentes', () => {
    expect(crossExchangeGap([t('kraken', 1, 2, 1.5)])).toBeNull();
  });
});
