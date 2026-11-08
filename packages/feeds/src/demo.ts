import {
  INTERVAL_MINUTES,
  parseMarketId,
  type BookLevel,
  type Candle,
  type ConnectionState,
  type Interval,
  type MarketId,
  type Ticker,
  type Trade,
} from '@cryptaura/core';

import type { BookUpdate, MarketFeed } from './feed';

// Fuente de demostración: un mercado simulado con caminatas aleatorias, con la
// misma interfaz que el cliente de Kraken. Sirve para probar la app sin red,
// para el emulador y para las capturas. La app la marca siempre como "Demo".

/** Precios de partida aproximados, en USD. */
const BASE_USD: Record<string, number> = {
  BTC: 68_000,
  ETH: 3_400,
  SOL: 160,
  XRP: 0.6,
  ADA: 0.45,
  DOGE: 0.15,
  LINK: 15,
  DOT: 6.5,
  AVAX: 30,
  LTC: 80,
  USDT: 1,
  USDC: 1,
};
const QUOTE_IN_USD: Record<string, number> = { USD: 1, EUR: 1.08, USDT: 1 };
const STABLE = new Set(['USDT', 'USDC']);

interface Sim {
  rng: () => number;
  price: number;
  open24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  /** Volatilidad por paso. */
  vol: number;
  tradeId: number;
}

/** Generador pseudoaleatorio con semilla: el mismo par arranca siempre igual. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Ruido aproximadamente normal (suma de uniformes). */
function noise(rng: () => number): number {
  return rng() + rng() + rng() - 1.5;
}

export class DemoFeed implements MarketFeed {
  readonly connectionState: ConnectionState = 'open';
  private readonly sims = new Map<MarketId, Sim>();
  private readonly tickers = new Map<MarketId, Set<(t: Ticker) => void>>();
  private readonly books = new Map<MarketId, Set<(u: BookUpdate) => void>>();
  private readonly trades = new Map<MarketId, Set<(t: Trade[]) => void>>();
  private readonly candles = new Map<string, { market: MarketId; interval: Interval; list: Candle[]; listeners: Set<(c: Candle[]) => void> }>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly options: { tickMs?: number; now?: () => number } = {},
  ) {}

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  onConnectionState(listener: (state: ConnectionState) => void): () => void {
    listener('open');
    return () => {};
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  subscribeTickers(markets: MarketId[], listener: (ticker: Ticker) => void): () => void {
    for (const m of markets) {
      add(this.tickers, m, listener);
      listener(this.ticker(m));
    }
    this.ensureTimer();
    return () => markets.forEach((m) => remove(this.tickers, m, listener));
  }

  subscribeBook(market: MarketId, depth: 10 | 25 | 100, listener: (update: BookUpdate) => void): () => void {
    add(this.books, market, listener);
    listener(this.book(market, depth));
    this.ensureTimer();
    return () => remove(this.books, market, listener);
  }

  subscribeTrades(market: MarketId, listener: (trades: Trade[]) => void): () => void {
    add(this.trades, market, listener);
    listener(Array.from({ length: 20 }, () => this.trade(market)).reverse());
    this.ensureTimer();
    return () => remove(this.trades, market, listener);
  }

  subscribeCandles(market: MarketId, interval: Interval, listener: (candles: Candle[]) => void): () => void {
    const key = `${market}:${interval}`;
    let entry = this.candles.get(key);
    if (!entry) {
      entry = { market, interval, list: this.history(market, interval), listeners: new Set() };
      this.candles.set(key, entry);
    }
    entry.listeners.add(listener);
    listener(entry.list);
    this.ensureTimer();
    return () => {
      entry!.listeners.delete(listener);
      if (entry!.listeners.size === 0) this.candles.delete(key);
    };
  }

  // ── Simulación ───────────────────────────────────────────────────────────

  private sim(market: MarketId): Sim {
    let sim = this.sims.get(market);
    if (sim) return sim;
    const { base, quote } = parseMarketId(market);
    const rng = mulberry32(hash(market));
    const usd = BASE_USD[base] ?? 10;
    const price = (usd / (QUOTE_IN_USD[quote] ?? 1)) * (1 + noise(rng) * 0.02);
    const drift = noise(rng) * (STABLE.has(base) ? 0.002 : 0.06);
    const open24h = price / (1 + drift);
    sim = {
      rng,
      price,
      open24h,
      high24h: Math.max(price, open24h) * (1 + rng() * 0.01),
      low24h: Math.min(price, open24h) * (1 - rng() * 0.01),
      volume24h: (2_000_000 + rng() * 40_000_000) / usd,
      vol: STABLE.has(base) ? 0.00005 : 0.0012,
      tradeId: Math.floor(rng() * 1e6),
    };
    this.sims.set(market, sim);
    return sim;
  }

  private step(market: MarketId): void {
    const sim = this.sim(market);
    sim.price *= 1 + noise(sim.rng) * sim.vol;
    sim.high24h = Math.max(sim.high24h, sim.price);
    sim.low24h = Math.min(sim.low24h, sim.price);
    sim.volume24h += sim.rng() * (sim.volume24h / 20_000);
  }

  private spreadOf(sim: Sim): number {
    return sim.price * (sim.vol < 0.001 ? 0.0001 : 0.0002);
  }

  private ticker(market: MarketId): Ticker {
    const sim = this.sim(market);
    const half = this.spreadOf(sim) / 2;
    return {
      exchange: 'kraken',
      market,
      bid: sim.price - half,
      ask: sim.price + half,
      last: sim.price,
      change24h: sim.price - sim.open24h,
      changePct24h: ((sim.price - sim.open24h) / sim.open24h) * 100,
      volume24h: sim.volume24h,
      high24h: sim.high24h,
      low24h: sim.low24h,
      ts: this.now(),
    };
  }

  private book(market: MarketId, depth: number): BookUpdate {
    const sim = this.sim(market);
    const half = this.spreadOf(sim) / 2;
    const tick = sim.price * 0.00008;
    const levels = (dir: 1 | -1): BookLevel[] => {
      // Distancias acumuladas: cada nivel queda siempre más lejos que el anterior.
      let offset = half;
      return Array.from({ length: Math.min(depth, 25) }, (_, i) => {
        if (i > 0) offset += tick * (0.6 + sim.rng() * 0.8);
        return {
          price: sim.price + dir * offset,
          qty: (0.05 + sim.rng() * 2.5 * (1 + i / 8)) * (1000 / Math.max(sim.price, 1)) ** 0.5,
        };
      });
    };
    return {
      book: { exchange: 'kraken', market, bids: levels(-1), asks: levels(1), ts: this.now() },
      checksumOk: true,
      resyncs: 0,
    };
  }

  private trade(market: MarketId): Trade {
    const sim = this.sim(market);
    const side = sim.rng() < 0.5 ? 'buy' : 'sell';
    const half = this.spreadOf(sim) / 2;
    sim.tradeId += 1;
    return {
      exchange: 'kraken',
      market,
      id: `demo-${sim.tradeId}`,
      price: side === 'buy' ? sim.price + half : sim.price - half,
      qty: sim.rng() ** 2 * (5000 / Math.max(sim.price, 1)),
      side,
      ts: this.now(),
    };
  }

  /** Velas hacia atrás que terminan en el precio actual. */
  private history(market: MarketId, interval: Interval): Candle[] {
    const sim = this.sim(market);
    const ms = INTERVAL_MINUTES[interval] * 60_000;
    const end = Math.floor(this.now() / ms) * ms;
    const scale = sim.vol * Math.sqrt(INTERVAL_MINUTES[interval] * 60);
    const out: Candle[] = [];
    let close = sim.price;
    for (let i = 0; i < 120; i++) {
      const open = close / (1 + noise(sim.rng) * scale);
      const high = Math.max(open, close) * (1 + sim.rng() * scale * 0.6);
      const low = Math.min(open, close) * (1 - sim.rng() * scale * 0.6);
      out.push({ ts: end - i * ms, open, high, low, close, volume: sim.rng() * sim.volume24h * (ms / 86_400_000) * 2 });
      close = open;
    }
    return out.reverse();
  }

  private ensureTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.options.tickMs ?? 700);
  }

  private tick(): void {
    const active = new Set<MarketId>([
      ...this.tickers.keys(),
      ...this.books.keys(),
      ...this.trades.keys(),
      ...[...this.candles.values()].map((c) => c.market),
    ]);
    if (active.size === 0) return this.stop();
    for (const market of active) {
      this.step(market);
      const sim = this.sim(market);
      this.tickers.get(market)?.forEach((l) => l(this.ticker(market)));
      this.books.get(market)?.forEach((l) => l(this.book(market, 25)));
      const tradeListeners = this.trades.get(market);
      if (tradeListeners && sim.rng() < 0.7) {
        const batch = Array.from({ length: 1 + Math.floor(sim.rng() * 3) }, () => this.trade(market));
        tradeListeners.forEach((l) => l(batch));
      }
    }
    for (const entry of this.candles.values()) {
      const sim = this.sim(entry.market);
      const ms = INTERVAL_MINUTES[entry.interval] * 60_000;
      const start = Math.floor(this.now() / ms) * ms;
      const last = entry.list[entry.list.length - 1];
      if (!last || last.ts < start) {
        entry.list = [...entry.list.slice(-119), { ts: start, open: sim.price, high: sim.price, low: sim.price, close: sim.price, volume: 0 }];
      } else {
        const updated = { ...last, close: sim.price, high: Math.max(last.high, sim.price), low: Math.min(last.low, sim.price), volume: last.volume + sim.rng() };
        entry.list = [...entry.list.slice(0, -1), updated];
      }
      entry.listeners.forEach((l) => l(entry.list));
    }
  }
}

function add<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
  let set = map.get(key);
  if (!set) map.set(key, (set = new Set()));
  set.add(value);
}

function remove<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
  const set = map.get(key);
  if (!set) return;
  set.delete(value);
  if (set.size === 0) map.delete(key);
}
