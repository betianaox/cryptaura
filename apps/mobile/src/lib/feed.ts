import type { MarketId } from '@cryptaura/core';
import { KrakenFeed } from '@cryptaura/feeds';

/** Una sola conexión a Kraken para toda la app. Se abre con la primera suscripción. */
export const kraken = new KrakenFeed();

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
