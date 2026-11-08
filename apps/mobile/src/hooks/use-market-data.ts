import type { Candle, ConnectionState, ExchangeId, Interval, MarketId, Ticker, Trade } from '@cryptaura/core';
import { fetchComparison, type BookUpdate } from '@cryptaura/feeds';
import { useEffect, useState } from 'react';

import { useFeed, useIsDemo } from '@/lib/feed';

import { useThrottledState } from './use-throttled';

// Hooks de datos en vivo. Cada uno se suscribe al montar la pantalla y se
// desuscribe al salir: solo se escucha lo que está a la vista. Si cambia la
// fuente (en vivo o demo), se vuelven a suscribir solos.

export function useConnectionState(): ConnectionState {
  const feed = useFeed();
  const [state, setState] = useState<ConnectionState>(feed.connectionState);
  useEffect(() => {
    setState(feed.connectionState);
    return feed.onConnectionState(setState);
  }, [feed]);
  return state;
}

/** Tickers de varios pares, redibujados 4 veces por segundo como mucho. */
export function useTickers(markets: MarketId[], hz = 4): Partial<Record<MarketId, Ticker>> {
  const feed = useFeed();
  const [tickers, write] = useThrottledState<Partial<Record<MarketId, Ticker>>>({}, hz);
  const key = markets.join(',');
  useEffect(() => {
    write({});
    if (markets.length === 0) return;
    return feed.subscribeTickers(markets, (t) => write((prev) => ({ ...prev, [t.market]: t })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, feed, write]);
  return tickers;
}

export function useTicker(market: MarketId): Ticker | undefined {
  return useTickers([market])[market];
}

/** Libro de órdenes en vivo, verificado con el checksum de Kraken. */
export function useOrderBook(market: MarketId, depth: 10 | 25 = 25): BookUpdate | null {
  const feed = useFeed();
  const [update, write] = useThrottledState<BookUpdate | null>(null, 6);
  useEffect(() => {
    write(null);
    return feed.subscribeBook(market, depth, write);
  }, [market, depth, feed, write]);
  return update;
}

/** Últimas operaciones, la más nueva primero. */
export function useTrades(market: MarketId, limit = 20): Trade[] {
  const feed = useFeed();
  const [trades, write] = useThrottledState<Trade[]>([], 5);
  useEffect(() => {
    write([]);
    return feed.subscribeTrades(market, (incoming) =>
      write((prev) => [...[...incoming].reverse(), ...prev].slice(0, limit)),
    );
  }, [market, limit, feed, write]);
  return trades;
}

export function useCandles(market: MarketId, interval: Interval): Candle[] {
  const feed = useFeed();
  const [candles, write] = useThrottledState<Candle[]>([], 2);
  useEffect(() => {
    write([]);
    return feed.subscribeCandles(market, interval, write);
  }, [market, interval, feed, write]);
  return candles;
}

export interface Comparison {
  tickers: Ticker[];
  unavailable: ExchangeId[];
}

/**
 * El mismo par en Coinbase y Binance, actualizado cada 15 segundos. En demo se
 * simulan a partir del precio de la fuente demo, con diferencias chicas.
 */
export function useComparison(market: MarketId, reference: Ticker | undefined): Comparison | null {
  const demo = useIsDemo();
  const [result, setResult] = useState<Comparison | null>(null);
  const hasReference = reference !== undefined;

  useEffect(() => {
    if (demo) return;
    let active = true;
    setResult(null);
    const load = () =>
      fetchComparison(market).then((r) => {
        if (active) setResult(r);
      });
    void load();
    const id = setInterval(load, 15_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [market, demo]);

  if (demo) {
    if (!hasReference) return null;
    const shift = (exchange: ExchangeId, pct: number): Ticker => ({
      ...reference,
      exchange,
      bid: reference.bid * (1 + pct),
      ask: reference.ask * (1 + pct),
      last: reference.last * (1 + pct),
    });
    return { tickers: [shift('coinbase', 0.0004), shift('binance', -0.0003)], unavailable: [] };
  }
  return result;
}
