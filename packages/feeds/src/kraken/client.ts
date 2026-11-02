import {
  INTERVAL_MINUTES,
  type Candle,
  type ConnectionState,
  type Instrument,
  type Interval,
  type MarketId,
  type OrderBook,
  type Ticker,
  type Trade,
} from '@cryptaura/core';

import { ReconnectingSocket, type SocketFactory } from '../reconnecting-socket';
import { KrakenBook } from './book';
import {
  candleFromKraken,
  instrumentFromKraken,
  krakenSymbolToMarket,
  marketToKrakenSymbol,
  tickerFromKraken,
  tradeFromKraken,
} from './normalize';
import {
  KRAKEN_WS_URL,
  parseKrakenMessage,
  type KrakenMessage,
  type KrakenSubscribeParams,
} from './protocol';

export interface BookUpdate {
  book: OrderBook;
  /** null mientras no se conoce la precisión del instrumento para verificar. */
  checksumOk: boolean | null;
  /** Cuántas veces se pidió un snapshot nuevo por checksum incorrecto. */
  resyncs: number;
}

interface Subscription {
  params: KrakenSubscribeParams;
  listeners: Set<(value: never) => void>;
}

interface BookState {
  depth: number;
  book: KrakenBook | null;
  pending: { bids: { price: number; qty: number }[]; asks: { price: number; qty: number }[] } | null;
  resyncs: number;
}

const MAX_CANDLES = 720;

/**
 * Cliente de la WebSocket pública de Kraken.
 *
 * - Una sola conexión para toda la app; cada pantalla se suscribe a lo que
 *   muestra y devuelve una función para desuscribirse.
 * - Varias pantallas pueden escuchar el mismo canal: se suscribe una vez y se
 *   desuscribe cuando se va el último que escucha.
 * - Al reconectar se vuelven a mandar todas las suscripciones activas.
 */
export class KrakenFeed {
  private readonly socket: ReconnectingSocket;
  private readonly subs = new Map<string, Subscription>();
  private readonly books = new Map<string, BookState>();
  private readonly candles = new Map<string, Candle[]>();
  private readonly instruments = new Map<string, Instrument>();
  private instrumentWaiters: ((list: Instrument[]) => void)[] = [];
  private instrumentsRequested = false;

  constructor(options: { url?: string; createSocket?: SocketFactory } = {}) {
    this.socket = new ReconnectingSocket({
      url: options.url ?? KRAKEN_WS_URL,
      createSocket: options.createSocket,
      onOpen: () => this.resubscribeAll(),
      onMessage: (raw) => this.handle(raw),
    });
  }

  get connectionState(): ConnectionState {
    return this.socket.connectionState;
  }

  onConnectionState(listener: (state: ConnectionState) => void): () => void {
    return this.socket.onStateChange(listener);
  }

  stop(): void {
    this.socket.stop();
  }

  /** Todos los pares de Kraken con su precisión. Se piden una sola vez. */
  loadInstruments(): Promise<Instrument[]> {
    if (this.instruments.size > 0) return Promise.resolve([...this.instruments.values()]);
    const promise = new Promise<Instrument[]>((resolve) => this.instrumentWaiters.push(resolve));
    if (!this.instrumentsRequested) {
      this.instrumentsRequested = true;
      this.add('instrument', { channel: 'instrument', snapshot: true }, () => {});
    }
    return promise;
  }

  subscribeTickers(markets: MarketId[], listener: (ticker: Ticker) => void): () => void {
    const offs = markets.map((market) =>
      this.add(`ticker:${market}`, { channel: 'ticker', symbol: [marketToKrakenSymbol(market)] }, listener),
    );
    return () => offs.forEach((off) => off());
  }

  subscribeBook(market: MarketId, depth: 10 | 25 | 100, listener: (update: BookUpdate) => void): () => void {
    const key = `book:${market}`;
    if (!this.books.has(key)) this.books.set(key, { depth, book: null, pending: null, resyncs: 0 });
    void this.loadInstruments();
    const off = this.add(
      key,
      { channel: 'book', symbol: [marketToKrakenSymbol(market)], depth, snapshot: true },
      listener,
    );
    return () => {
      off();
      if (!this.subs.has(key)) this.books.delete(key);
    };
  }

  subscribeTrades(market: MarketId, listener: (trades: Trade[]) => void): () => void {
    return this.add(
      `trade:${market}`,
      { channel: 'trade', symbol: [marketToKrakenSymbol(market)], snapshot: true },
      listener,
    );
  }

  subscribeCandles(market: MarketId, interval: Interval, listener: (candles: Candle[]) => void): () => void {
    const key = `ohlc:${market}:${interval}`;
    const off = this.add(
      key,
      {
        channel: 'ohlc',
        symbol: [marketToKrakenSymbol(market)],
        interval: INTERVAL_MINUTES[interval],
        snapshot: true,
      },
      listener,
    );
    return () => {
      off();
      if (!this.subs.has(key)) this.candles.delete(key);
    };
  }

  // ── Suscripciones ──────────────────────────────────────────────────────────

  private add<T>(key: string, params: KrakenSubscribeParams, listener: (value: T) => void): () => void {
    let sub = this.subs.get(key);
    if (!sub) {
      sub = { params, listeners: new Set() };
      this.subs.set(key, sub);
      this.socket.start();
      this.socket.send({ method: 'subscribe', params });
    }
    sub.listeners.add(listener as (value: never) => void);

    return () => {
      const current = this.subs.get(key);
      if (!current) return;
      current.listeners.delete(listener as (value: never) => void);
      if (current.listeners.size === 0 && key !== 'instrument') {
        this.subs.delete(key);
        this.socket.send({ method: 'unsubscribe', params: unsubscribeParams(params) });
      }
    };
  }

  private resubscribeAll(): void {
    for (const state of this.books.values()) {
      state.book = null;
      state.pending = null;
    }
    for (const sub of this.subs.values()) this.socket.send({ method: 'subscribe', params: sub.params });
  }

  private emit(key: string, value: unknown): void {
    const sub = this.subs.get(key);
    if (!sub) return;
    for (const listener of sub.listeners) (listener as (v: unknown) => void)(value);
  }

  // ── Mensajes ───────────────────────────────────────────────────────────────

  private handle(raw: string): void {
    const msg = parseKrakenMessage(raw);
    if (!msg || !('channel' in msg)) return;
    switch (msg.channel) {
      case 'ticker':
        for (const data of msg.data) {
          const ticker = tickerFromKraken(data);
          this.emit(`ticker:${ticker.market}`, ticker);
        }
        break;
      case 'trade': {
        const trades = msg.data.map(tradeFromKraken);
        const market = trades[0]?.market;
        if (market) this.emit(`trade:${market}`, trades);
        break;
      }
      case 'ohlc':
        this.handleCandles(msg.type, msg.data);
        break;
      case 'book':
        for (const data of msg.data) this.handleBook(msg.type, data);
        break;
      case 'instrument':
        this.handleInstruments(msg.data.pairs);
        break;
      default:
        break;
    }
  }

  private handleInstruments(pairs: { symbol: string }[]): void {
    for (const pair of pairs as Parameters<typeof instrumentFromKraken>[0][]) {
      const instrument = instrumentFromKraken(pair);
      this.instruments.set(instrument.market, instrument);
    }
    const list = [...this.instruments.values()];
    const waiters = this.instrumentWaiters;
    this.instrumentWaiters = [];
    waiters.forEach((resolve) => resolve(list));
    // Con la precisión ya conocida, se arman los libros que esperaban.
    for (const [key, state] of this.books) {
      if (!state.book && state.pending) {
        const market = key.slice('book:'.length) as MarketId;
        const instrument = this.instruments.get(market);
        if (!instrument) continue;
        state.book = new KrakenBook(state.depth, instrument.pricePrecision, instrument.qtyPrecision);
        state.book.applySnapshot(state.pending.bids, state.pending.asks);
        state.pending = null;
      }
    }
  }

  private handleBook(
    type: 'snapshot' | 'update',
    data: Extract<KrakenMessage, { channel: 'book' }>['data'][number],
  ): void {
    const market = krakenSymbolToMarket(data.symbol);
    const key = `book:${market}`;
    const state = this.books.get(key);
    if (!state) return;
    const instrument = this.instruments.get(market);

    if (!instrument) {
      // Sin precisión todavía no se puede verificar: se guarda el libro crudo.
      if (type === 'snapshot') state.pending = { bids: data.bids, asks: data.asks };
      else if (state.pending) {
        const temp = new KrakenBook(state.depth, 8, 8);
        temp.applySnapshot(state.pending.bids, state.pending.asks);
        temp.applyUpdate(data.bids, data.asks);
        state.pending = { bids: temp.bids(), asks: temp.asks() };
      }
      if (state.pending)
        this.emitBook(key, market, state.pending.bids, state.pending.asks, null, state.resyncs);
      return;
    }

    if (type === 'snapshot' || !state.book) {
      state.book = new KrakenBook(state.depth, instrument.pricePrecision, instrument.qtyPrecision);
      state.book.applySnapshot(data.bids, data.asks);
    } else {
      state.book.applyUpdate(data.bids, data.asks);
    }

    const ok = state.book.verify(data.checksum);
    if (!ok) {
      // Libro corrupto: se pide de nuevo desde cero.
      state.resyncs += 1;
      state.book = null;
      const sub = this.subs.get(key);
      if (sub) {
        this.socket.send({ method: 'unsubscribe', params: unsubscribeParams(sub.params) });
        this.socket.send({ method: 'subscribe', params: sub.params });
      }
      return;
    }
    this.emitBook(key, market, state.book.bids(), state.book.asks(), true, state.resyncs);
  }

  private emitBook(
    key: string,
    market: MarketId,
    bids: OrderBook['bids'],
    asks: OrderBook['asks'],
    checksumOk: boolean | null,
    resyncs: number,
  ): void {
    const update: BookUpdate = {
      book: { exchange: 'kraken', market, bids, asks, ts: Date.now() },
      checksumOk,
      resyncs,
    };
    this.emit(key, update);
  }

  private handleCandles(
    type: 'snapshot' | 'update',
    data: Extract<KrakenMessage, { channel: 'ohlc' }>['data'],
  ): void {
    const first = data[0];
    if (!first) return;
    const market = krakenSymbolToMarket(first.symbol);
    const interval = (Object.keys(INTERVAL_MINUTES) as Interval[]).find(
      (i) => INTERVAL_MINUTES[i] === first.interval,
    );
    if (!interval) return;
    const key = `ohlc:${market}:${interval}`;
    const incoming = data.map(candleFromKraken);
    const list = type === 'snapshot' ? [] : [...(this.candles.get(key) ?? [])];
    for (const candle of incoming) {
      const last = list[list.length - 1];
      if (last && last.ts === candle.ts) list[list.length - 1] = candle;
      else if (!last || candle.ts > last.ts) list.push(candle);
    }
    const trimmed = list.slice(-MAX_CANDLES);
    this.candles.set(key, trimmed);
    this.emit(key, trimmed);
  }
}

function unsubscribeParams(params: KrakenSubscribeParams): KrakenSubscribeParams {
  const { snapshot: _snapshot, ...rest } = params;
  return rest;
}
