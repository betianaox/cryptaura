import type { Candle, ConnectionState, ExchangeId, Interval, MarketId, Ticker, Trade } from '@cryptaura/core';
import { fetchComparison, type BookUpdate } from '@cryptaura/feeds';
import { useEffect, useState } from 'react';

import { kraken } from '@/lib/feed';

import { useThrottledState } from './use-throttled';

// Hooks de datos en vivo. Cada uno se suscribe al montar la pantalla y se
// desuscribe al salir: solo se escucha lo que está a la vista.

export function useConnectionState(): ConnectionState {
  const [state, setState] = useState<ConnectionState>(kraken.connectionState);
  useEffect(() => kraken.onConnectionState(setState), []);
  return state;
}

/** Tickers de varios pares, redibujados 4 veces por segundo como mucho. */
export function useTickers(markets: MarketId[]): Record<string, Ticker> {
  const [tickers, write] = useThrottledState<Record<string, Ticker>>({}, 4);
  const key = markets.join(',');
  useEffect(
    () => kraken.subscribeTickers(markets, (t) => write((prev) => ({ ...prev, [t.market]: t }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, write],
  );
  return tickers;
}

/** Libro de órdenes en vivo, verificado con el checksum de Kraken. */
export function useOrderBook(market: MarketId, depth: 10 | 25 = 10): BookUpdate | null {
  const [update, write] = useThrottledState<BookUpdate | null>(null, 8);
  useEffect(() => kraken.subscribeBook(market, depth, write), [market, depth, write]);
  return update;
}

/** Últimas operaciones, la más nueva primero. */
export function useTrades(market: MarketId, limit = 30): Trade[] {
  const [trades, write] = useThrottledState<Trade[]>([], 6);
  useEffect(
    () =>
      kraken.subscribeTrades(market, (incoming) =>
        write((prev) => [...[...incoming].reverse(), ...prev].slice(0, limit)),
      ),
    [market, limit, write],
  );
  return trades;
}

export function useCandles(market: MarketId, interval: Interval): Candle[] {
  const [candles, write] = useThrottledState<Candle[]>([], 2);
  useEffect(() => {
    write([]);
    return kraken.subscribeCandles(market, interval, write);
  }, [market, interval, write]);
  return candles;
}

/** El mismo par en Coinbase y Binance, actualizado cada 15 segundos. */
export function useComparison(market: MarketId): { tickers: Ticker[]; unavailable: ExchangeId[] } | null {
  const [result, setResult] = useState<{ tickers: Ticker[]; unavailable: ExchangeId[] } | null>(null);
  useEffect(() => {
    let active = true;
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
  }, [market]);
  return result;
}
