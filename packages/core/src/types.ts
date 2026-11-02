// Modelo normalizado del mercado. Cada adaptador (packages/feeds) traduce los
// mensajes de su exchange a estos tipos, y las pantallas solo conocen estos.

export type ExchangeId = 'kraken' | 'coinbase' | 'binance';

/** Par normalizado, siempre `BASE/QUOTE` con los símbolos comunes: `BTC/USD`. */
export type MarketId = `${string}/${string}`;

export interface Instrument {
  exchange: ExchangeId;
  market: MarketId;
  /** Cómo lo escribe el exchange: `BTC/USD`, `BTC-USD`, `BTCUSDT`. */
  symbol: string;
  base: string;
  quote: string;
  /** Decimales del precio y de la cantidad. Hacen falta para el checksum del libro. */
  pricePrecision: number;
  qtyPrecision: number;
}

export interface Ticker {
  exchange: ExchangeId;
  market: MarketId;
  bid: number;
  ask: number;
  last: number;
  /** Variación absoluta y porcentual de 24 h. */
  change24h: number;
  changePct24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  /** Milisegundos desde epoch en que se recibió o se generó el dato. */
  ts: number;
}

export interface BookLevel {
  price: number;
  qty: number;
}

export interface OrderBook {
  exchange: ExchangeId;
  market: MarketId;
  /** De mayor a menor precio. */
  bids: BookLevel[];
  /** De menor a mayor precio. */
  asks: BookLevel[];
  ts: number;
}

export type TradeSide = 'buy' | 'sell';

export interface Trade {
  exchange: ExchangeId;
  market: MarketId;
  id: string;
  price: number;
  qty: number;
  side: TradeSide;
  ts: number;
}

export const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
export type Interval = (typeof INTERVALS)[number];

export const INTERVAL_MINUTES: Record<Interval, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '1h': 60,
  '4h': 240,
  '1d': 1440,
};

export interface Candle {
  /** Inicio de la vela, en ms desde epoch. */
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';
