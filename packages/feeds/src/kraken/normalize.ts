import {
  marketId,
  type Candle,
  type Instrument,
  type MarketId,
  type Ticker,
  type Trade,
} from '@cryptaura/core';

import type { KrakenInstrumentPair, KrakenOhlcData, KrakenTickerData, KrakenTradeData } from './protocol';

/** En la v2, Kraken ya escribe los pares como `BTC/USD`. */
export function krakenSymbolToMarket(symbol: string): MarketId {
  const [base, quote] = symbol.split('/');
  return marketId(base ?? symbol, quote ?? '');
}

export function marketToKrakenSymbol(market: MarketId): string {
  return market;
}

export function tickerFromKraken(data: KrakenTickerData, ts = Date.now()): Ticker {
  return {
    exchange: 'kraken',
    market: krakenSymbolToMarket(data.symbol),
    bid: data.bid,
    ask: data.ask,
    last: data.last,
    change24h: data.change,
    changePct24h: data.change_pct,
    volume24h: data.volume,
    high24h: data.high,
    low24h: data.low,
    ts,
  };
}

export function tradeFromKraken(data: KrakenTradeData): Trade {
  return {
    exchange: 'kraken',
    market: krakenSymbolToMarket(data.symbol),
    id: String(data.trade_id),
    price: data.price,
    qty: data.qty,
    side: data.side,
    ts: Date.parse(data.timestamp),
  };
}

export function candleFromKraken(data: KrakenOhlcData): Candle {
  return {
    ts: Date.parse(data.interval_begin),
    open: data.open,
    high: data.high,
    low: data.low,
    close: data.close,
    volume: data.volume,
  };
}

export function instrumentFromKraken(pair: KrakenInstrumentPair): Instrument {
  const market = krakenSymbolToMarket(pair.symbol);
  const [base, quote] = market.split('/') as [string, string];
  return {
    exchange: 'kraken',
    market,
    symbol: pair.symbol,
    base,
    quote,
    pricePrecision: pair.price_precision,
    qtyPrecision: pair.qty_precision,
  };
}
