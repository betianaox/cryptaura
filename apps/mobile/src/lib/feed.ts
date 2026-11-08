import type { MarketId } from '@cryptaura/core';
import { DemoFeed, KrakenFeed, type MarketFeed } from '@cryptaura/feeds';

import { useSettings } from '@/state/store';

/**
 * Las dos fuentes posibles. Se crean una sola vez y cada una abre su conexión
 * (o su simulación) recién con la primera suscripción.
 */
const feeds: Record<'live' | 'demo', MarketFeed> = {
  live: new KrakenFeed(),
  demo: new DemoFeed(),
};

/** La fuente elegida en Ajustes. Cambiarla hace que las pantallas se vuelvan a suscribir. */
export function useFeed(): MarketFeed {
  const source = useSettings((s) => s.source);
  return feeds[source];
}

export function useIsDemo(): boolean {
  return useSettings((s) => s.source) === 'demo';
}

/**
 * Pares de la lista inicial. Más adelante salen del backend (los de mayor
 * volumen en Kraken, con metadatos de CoinGecko).
 */
export const DEFAULT_MARKETS: MarketId[] = [
  'BTC/USD',
  'ETH/USD',
  'SOL/USD',
  'XRP/USD',
  'ADA/USD',
  'DOGE/USD',
  'LINK/USD',
  'DOT/USD',
  'AVAX/USD',
  'LTC/USD',
  'BTC/EUR',
  'ETH/EUR',
  'USDT/USD',
  'USDC/USD',
];

/** Nombres para mostrar. Después vienen de CoinGecko por el backend. */
export const ASSET_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  XRP: 'XRP',
  ADA: 'Cardano',
  DOGE: 'Dogecoin',
  LINK: 'Chainlink',
  DOT: 'Polkadot',
  AVAX: 'Avalanche',
  LTC: 'Litecoin',
  USDT: 'Tether',
  USDC: 'USD Coin',
};
