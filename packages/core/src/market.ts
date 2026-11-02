import type { MarketId } from './types';

/**
 * Algunos exchanges usan códigos propios para el mismo activo. El modelo común
 * usa siempre el más conocido.
 */
const ASSET_ALIASES: Record<string, string> = {
  XBT: 'BTC',
  XXBT: 'BTC',
  XDG: 'DOGE',
  XXDG: 'DOGE',
  XETH: 'ETH',
  ZUSD: 'USD',
  ZEUR: 'EUR',
};

export function normalizeAsset(code: string): string {
  const upper = code.trim().toUpperCase();
  return ASSET_ALIASES[upper] ?? upper;
}

export function marketId(base: string, quote: string): MarketId {
  return `${normalizeAsset(base)}/${normalizeAsset(quote)}`;
}

export function parseMarketId(id: string): { base: string; quote: string } {
  const [base, quote] = id.split('/');
  if (!base || !quote) throw new Error(`Par inválido: ${id}`);
  return { base, quote };
}

/** Para usar el par en una URL: `BTC/USD` ↔ `BTC-USD`. */
export function marketToSlug(market: MarketId): string {
  return market.replace('/', '-');
}

export function slugToMarket(slug: string): MarketId {
  const [base, quote] = slug.split('-');
  return marketId(base ?? '', quote ?? '');
}
