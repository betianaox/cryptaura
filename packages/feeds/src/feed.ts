import type { Candle, ConnectionState, Interval, MarketId, OrderBook, Ticker, Trade } from '@cryptaura/core';

export interface BookUpdate {
  book: OrderBook;
  /** null mientras no se conoce la precisión del instrumento para verificar. */
  checksumOk: boolean | null;
  /** Cuántas veces se pidió un snapshot nuevo por checksum incorrecto. */
  resyncs: number;
}

/**
 * Lo que la app necesita de una fuente de datos en vivo. Lo cumplen el
 * cliente de Kraken y la fuente de demostración, así que las pantallas no
 * saben de cuál de las dos leen.
 */
export interface MarketFeed {
  readonly connectionState: ConnectionState;
  onConnectionState(listener: (state: ConnectionState) => void): () => void;
  subscribeTickers(markets: MarketId[], listener: (ticker: Ticker) => void): () => void;
  subscribeBook(market: MarketId, depth: 10 | 25 | 100, listener: (update: BookUpdate) => void): () => void;
  subscribeTrades(market: MarketId, listener: (trades: Trade[]) => void): () => void;
  subscribeCandles(market: MarketId, interval: Interval, listener: (candles: Candle[]) => void): () => void;
  stop(): void;
}
