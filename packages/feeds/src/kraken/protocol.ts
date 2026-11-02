// Mensajes de la WebSocket v2 pública de Kraken (wss://ws.kraken.com/v2).
// Referencia: https://docs.kraken.com/exchange/api-reference/spot-websocket

export const KRAKEN_WS_URL = 'wss://ws.kraken.com/v2';

export type KrakenChannel = 'ticker' | 'book' | 'trade' | 'ohlc' | 'instrument';

export interface KrakenSubscribeParams {
  channel: KrakenChannel;
  symbol?: string[];
  depth?: number;
  interval?: number;
  snapshot?: boolean;
}

export interface KrakenRequest {
  method: 'subscribe' | 'unsubscribe' | 'ping';
  params?: KrakenSubscribeParams;
  req_id?: number;
}

export interface KrakenTickerData {
  symbol: string;
  bid: number;
  bid_qty: number;
  ask: number;
  ask_qty: number;
  last: number;
  volume: number;
  vwap: number;
  low: number;
  high: number;
  change: number;
  change_pct: number;
}

export interface KrakenBookData {
  symbol: string;
  bids: { price: number; qty: number }[];
  asks: { price: number; qty: number }[];
  checksum: number;
  timestamp?: string;
}

export interface KrakenTradeData {
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  qty: number;
  ord_type: string;
  trade_id: number;
  timestamp: string;
}

export interface KrakenOhlcData {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
  vwap: number;
  interval_begin: string;
  interval: number;
  timestamp: string;
}

export interface KrakenInstrumentPair {
  symbol: string;
  base: string;
  quote: string;
  status: string;
  price_precision: number;
  qty_precision: number;
  price_increment?: number;
  qty_increment?: number;
}

export type KrakenMessage =
  | { channel: 'heartbeat' }
  | { channel: 'status'; type: string; data: { system: string; api_version: string }[] }
  | { channel: 'ticker'; type: 'snapshot' | 'update'; data: KrakenTickerData[] }
  | { channel: 'book'; type: 'snapshot' | 'update'; data: KrakenBookData[] }
  | { channel: 'trade'; type: 'snapshot' | 'update'; data: KrakenTradeData[] }
  | { channel: 'ohlc'; type: 'snapshot' | 'update'; data: KrakenOhlcData[] }
  | {
      channel: 'instrument';
      type: 'snapshot' | 'update';
      data: { assets: unknown[]; pairs: KrakenInstrumentPair[] };
    }
  | { method: 'subscribe' | 'unsubscribe' | 'pong'; success?: boolean; error?: string; req_id?: number };

export function parseKrakenMessage(raw: string): KrakenMessage | null {
  try {
    return JSON.parse(raw) as KrakenMessage;
  } catch {
    return null;
  }
}
