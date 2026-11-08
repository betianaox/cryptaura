import { crc32 } from '@cryptaura/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { checksumNumber, KrakenBook } from './kraken/book';
import type { BookUpdate } from './feed';
import { KrakenFeed } from './kraken/client';
import { ReconnectingSocket, type SocketLike } from './reconnecting-socket';
import { fetchComparison, marketToBinanceSymbol, marketToCoinbaseSymbol } from './rest-tickers';

describe('formato del checksum de Kraken', () => {
  it('saca el punto y los ceros a la izquierda', () => {
    // Del ejemplo de la documentación: la mejor venta 45285.2 x 0.00100000
    // empieza el texto del checksum con "452852100000".
    expect(checksumNumber(45285.2, 1) + checksumNumber(0.001, 8)).toBe('452852100000');
  });

  it('respeta la precisión del instrumento', () => {
    expect(checksumNumber(1.5, 4)).toBe('15000');
    expect(checksumNumber(0.0001, 4)).toBe('1');
  });
});

describe('libro de órdenes', () => {
  const snapshot = () => {
    const book = new KrakenBook(3, 1, 2);
    book.applySnapshot(
      [
        { price: 100.0, qty: 1 },
        { price: 99.5, qty: 2 },
        { price: 99.0, qty: 3 },
      ],
      [
        { price: 100.5, qty: 1 },
        { price: 101.0, qty: 2 },
        { price: 101.5, qty: 3 },
      ],
    );
    return book;
  };

  it('ordena compras de mayor a menor y ventas de menor a mayor', () => {
    const book = snapshot();
    expect(book.bids().map((l) => l.price)).toEqual([100, 99.5, 99]);
    expect(book.asks().map((l) => l.price)).toEqual([100.5, 101, 101.5]);
  });

  it('borra un nivel cuando llega cantidad 0', () => {
    const book = snapshot();
    book.applyUpdate([{ price: 99.5, qty: 0 }], []);
    expect(book.bids().map((l) => l.price)).toEqual([100, 99]);
  });

  it('recorta a la profundidad suscrita después de cada mensaje', () => {
    const book = snapshot();
    // Entra una compra mejor: la peor (99.0) queda fuera de la profundidad 3.
    book.applyUpdate([{ price: 100.2, qty: 5 }], []);
    expect(book.bids().map((l) => l.price)).toEqual([100.2, 100, 99.5]);
  });

  it('calcula el checksum con las ventas primero y después las compras', () => {
    const book = snapshot();
    const expected = crc32(
      // ventas, de menor a mayor
      '1005100' +
        '1010200' +
        '1015300' +
        // compras, de mayor a menor
        '1000100' +
        '995200' +
        '990300',
    );
    expect(book.checksum()).toBe(expected);
    expect(book.verify(expected)).toBe(true);
    expect(book.verify(expected + 1)).toBe(false);
  });
});

describe('reconexión', () => {
  it('espera de forma exponencial, con tope y variación aleatoria', () => {
    const socket = new ReconnectingSocket({
      url: 'wss://test',
      onMessage: () => {},
      minDelayMs: 500,
      maxDelayMs: 4000,
      random: () => 1,
    });
    expect([0, 1, 2, 3, 4, 10].map((a) => socket.delayFor(a))).toEqual([500, 1000, 2000, 4000, 4000, 4000]);
  });
});

// ── Cliente de Kraken con un WebSocket falso ───────────────────────────────

class FakeSocket implements SocketLike {
  static last: FakeSocket | null = null;
  readyState = 0;
  sent: unknown[] = [];
  onopen: ((event: unknown) => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  constructor() {
    FakeSocket.last = this;
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = 3;
  }
  open() {
    this.readyState = 1;
    this.onopen?.({});
  }
  receive(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

describe('cliente de Kraken', () => {
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    vi.useFakeTimers();
    const feed = new KrakenFeed({ createSocket: () => new FakeSocket() });
    return feed;
  };

  it('normaliza el ticker y avisa solo a quien escucha ese par', () => {
    const feed = setup();
    const seen: string[] = [];
    feed.subscribeTickers(['BTC/USD'], (t) => seen.push(`${t.market}:${t.last}`));
    const socket = FakeSocket.last!;
    socket.open();
    socket.receive({
      channel: 'ticker',
      type: 'update',
      data: [
        {
          symbol: 'BTC/USD',
          bid: 1,
          bid_qty: 1,
          ask: 2,
          ask_qty: 1,
          last: 1.5,
          volume: 10,
          vwap: 1.5,
          low: 1,
          high: 2,
          change: 0.1,
          change_pct: 7.1,
        },
      ],
    });
    expect(seen).toEqual(['BTC/USD:1.5']);
    feed.stop();
  });

  it('vuelve a mandar las suscripciones al reconectar', () => {
    const feed = setup();
    feed.subscribeTickers(['ETH/USD'], () => {});
    const first = FakeSocket.last!;
    first.open();
    const subscribes = (s: FakeSocket) =>
      s.sent.filter((m) => (m as { method: string }).method === 'subscribe');
    expect(subscribes(first)).toHaveLength(1);

    first.readyState = 3;
    first.onclose?.({});
    vi.runOnlyPendingTimers();
    const second = FakeSocket.last!;
    expect(second).not.toBe(first);
    second.open();
    expect(subscribes(second)).toEqual([
      { method: 'subscribe', params: { channel: 'ticker', symbol: ['ETH/USD'] } },
    ]);
    feed.stop();
  });

  it('pide un snapshot nuevo cuando el checksum no coincide', () => {
    const feed = setup();
    const updates: BookUpdate[] = [];
    feed.subscribeBook('BTC/USD', 10, (u) => updates.push(u));
    const socket = FakeSocket.last!;
    socket.open();
    socket.receive({
      channel: 'instrument',
      type: 'snapshot',
      data: {
        assets: [],
        pairs: [
          {
            symbol: 'BTC/USD',
            base: 'BTC',
            quote: 'USD',
            status: 'online',
            price_precision: 1,
            qty_precision: 2,
            price_increment: 0.1,
            qty_increment: 0.01,
          },
        ],
      },
    });

    const bids = [{ price: 100, qty: 1 }];
    const asks = [{ price: 100.5, qty: 1 }];
    const good = crc32('1005100' + '1000100');
    socket.receive({
      channel: 'book',
      type: 'snapshot',
      data: [{ symbol: 'BTC/USD', bids, asks, checksum: good }],
    });
    expect(updates.at(-1)?.checksumOk).toBe(true);

    socket.sent = [];
    socket.receive({
      channel: 'book',
      type: 'update',
      data: [{ symbol: 'BTC/USD', bids: [{ price: 99.9, qty: 2 }], asks: [], checksum: 12345 }],
    });
    const methods = socket.sent.map((m) => (m as { method: string }).method);
    expect(methods).toEqual(['unsubscribe', 'subscribe']);
    expect(updates).toHaveLength(1);
    feed.stop();
  });
});

describe('comparación entre exchanges', () => {
  it('traduce el par a cada exchange', () => {
    expect(marketToCoinbaseSymbol('BTC/USD')).toBe('BTC-USD');
    expect(marketToBinanceSymbol('BTC/USD')).toBe('BTCUSDT');
    expect(marketToBinanceSymbol('ETH/EUR')).toBe('ETHEUR');
  });

  it('separa las fuentes que no responden sin cortar la comparación', async () => {
    const fakeFetch = async (url: string) => {
      if (url.includes('binance')) return { ok: false, status: 451, json: async () => ({}) };
      if (url.endsWith('/ticker'))
        return {
          ok: true,
          status: 200,
          json: async () => ({ bid: '99', ask: '101', price: '100', time: '2026-01-01T00:00:00Z' }),
        };
      return {
        ok: true,
        status: 200,
        json: async () => ({ open: '90', high: '110', low: '85', last: '100', volume: '5' }),
      };
    };
    const { tickers, unavailable } = await fetchComparison('BTC/USD', fakeFetch);
    expect(unavailable).toEqual(['binance']);
    expect(tickers[0]).toMatchObject({ exchange: 'coinbase', last: 100, bid: 99, ask: 101 });
    expect(tickers[0]!.changePct24h).toBeCloseTo((10 / 90) * 100, 6);
  });
});

describe('fuente demo', () => {
  afterEach(() => vi.useRealTimers());

  it('cumple la misma interfaz con datos coherentes', async () => {
    vi.useFakeTimers();
    const { DemoFeed } = await import('./demo');
    const feed = new DemoFeed({ tickMs: 100 });
    const tickers: number[] = [];
    let book: BookUpdate | null = null;
    let candles = 0;
    feed.subscribeTickers(['BTC/USD'], (t) => tickers.push(t.last));
    feed.subscribeBook('BTC/USD', 10, (u) => (book = u));
    feed.subscribeCandles('BTC/USD', '1h', (c) => (candles = c.length));
    vi.advanceTimersByTime(1000);
    expect(tickers.length).toBeGreaterThan(5);
    expect(candles).toBe(120);
    const b = (book as BookUpdate | null)!;
    expect(b.book.bids[0]!.price).toBeLessThan(b.book.asks[0]!.price);
    expect(b.book.bids.map((l) => l.price)).toEqual([...b.book.bids.map((l) => l.price)].sort((x, y) => y - x));
    expect(b.book.asks.map((l) => l.price)).toEqual([...b.book.asks.map((l) => l.price)].sort((x, y) => x - y));
    feed.stop();
  });
});
