import { marketId, parseMarketId, type ExchangeId, type MarketId, type Ticker } from '@cryptaura/core';

// Tickers por REST de las fuentes secundarias, para comparar un par entre
// exchanges. Las pantallas en vivo usan la WebSocket de Kraken; esto alcanza
// para la comparación y para la Lambda de alertas, que corre cada minuto.

type Fetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export class FeedUnavailableError extends Error {
  constructor(
    readonly exchange: ExchangeId,
    readonly status: number,
  ) {
    super(`${exchange}: HTTP ${status}`);
  }
}

async function getJson<T>(fetchFn: Fetch, exchange: ExchangeId, url: string): Promise<T> {
  const response = await fetchFn(url);
  // 451: Binance no atiende desde algunos países. La app lo muestra como "no disponible".
  if (!response.ok) throw new FeedUnavailableError(exchange, response.status);
  return (await response.json()) as T;
}

// ── Binance (URLs solo de datos de mercado, sin clave) ─────────────────────

export const BINANCE_REST_URL = 'https://data-api.binance.vision';

/**
 * Binance lista casi todo contra USDT y no contra USD. Para comparar, USD se
 * toma como USDT; la pantalla lo aclara.
 */
export function marketToBinanceSymbol(market: MarketId): string {
  const { base, quote } = parseMarketId(market);
  return `${base}${quote === 'USD' ? 'USDT' : quote}`;
}

interface Binance24h {
  lastPrice: string;
  bidPrice: string;
  askPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  highPrice: string;
  lowPrice: string;
  closeTime: number;
}

export async function fetchBinanceTicker(market: MarketId, fetchFn: Fetch = fetch): Promise<Ticker> {
  const symbol = marketToBinanceSymbol(market);
  const d = await getJson<Binance24h>(
    fetchFn,
    'binance',
    `${BINANCE_REST_URL}/api/v3/ticker/24hr?symbol=${symbol}`,
  );
  return {
    exchange: 'binance',
    market,
    bid: Number(d.bidPrice),
    ask: Number(d.askPrice),
    last: Number(d.lastPrice),
    change24h: Number(d.priceChange),
    changePct24h: Number(d.priceChangePercent),
    volume24h: Number(d.volume),
    high24h: Number(d.highPrice),
    low24h: Number(d.lowPrice),
    ts: d.closeTime,
  };
}

// ── Coinbase (API pública de Coinbase Exchange) ────────────────────────────

export const COINBASE_REST_URL = 'https://api.exchange.coinbase.com';

export function marketToCoinbaseSymbol(market: MarketId): string {
  const { base, quote } = parseMarketId(market);
  return `${base}-${quote}`;
}

export function coinbaseSymbolToMarket(symbol: string): MarketId {
  const [base, quote] = symbol.split('-');
  return marketId(base ?? symbol, quote ?? '');
}

interface CoinbaseTicker {
  bid: string;
  ask: string;
  price: string;
  time: string;
}

interface CoinbaseStats {
  open: string;
  high: string;
  low: string;
  last: string;
  volume: string;
}

export async function fetchCoinbaseTicker(market: MarketId, fetchFn: Fetch = fetch): Promise<Ticker> {
  const product = marketToCoinbaseSymbol(market);
  const [t, s] = await Promise.all([
    getJson<CoinbaseTicker>(fetchFn, 'coinbase', `${COINBASE_REST_URL}/products/${product}/ticker`),
    getJson<CoinbaseStats>(fetchFn, 'coinbase', `${COINBASE_REST_URL}/products/${product}/stats`),
  ]);
  const last = Number(t.price);
  const open = Number(s.open);
  return {
    exchange: 'coinbase',
    market,
    bid: Number(t.bid),
    ask: Number(t.ask),
    last,
    change24h: last - open,
    changePct24h: open === 0 ? 0 : ((last - open) / open) * 100,
    volume24h: Number(s.volume),
    high24h: Number(s.high),
    low24h: Number(s.low),
    ts: Date.parse(t.time),
  };
}

/**
 * El mismo par en las fuentes secundarias. Las que fallan (par inexistente,
 * país sin servicio) se devuelven aparte en vez de cortar la comparación.
 */
export async function fetchComparison(
  market: MarketId,
  fetchFn: Fetch = fetch,
): Promise<{ tickers: Ticker[]; unavailable: ExchangeId[] }> {
  const sources: [ExchangeId, Promise<Ticker>][] = [
    ['coinbase', fetchCoinbaseTicker(market, fetchFn)],
    ['binance', fetchBinanceTicker(market, fetchFn)],
  ];
  const results = await Promise.allSettled(sources.map(([, p]) => p));
  const tickers: Ticker[] = [];
  const unavailable: ExchangeId[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') tickers.push(r.value);
    else unavailable.push(sources[i]![0]);
  });
  return { tickers, unavailable };
}
