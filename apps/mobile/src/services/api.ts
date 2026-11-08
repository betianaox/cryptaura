// Cliente del backend de Cryptaura (fase 2 y 3 del documento de arquitectura).
//
// TODAVÍA NO HAY BACKEND: estas funciones devuelven datos de ejemplo fijos, con
// la misma forma que va a tener la API real, y la app los marca como "Datos de
// ejemplo". Cuando exista el backend, solo cambia el cuerpo de cada función
// (un fetch a API Gateway); las pantallas no se tocan.

export interface FearGreed {
  value: number;
  /** Los últimos 7 días, del más viejo al más nuevo. */
  history: number[];
}

export interface Overview {
  fearGreed: FearGreed;
  totalMarketCapUsd: number;
  marketCapChange24hPct: number;
  btcDominancePct: number;
  ethDominancePct: number;
  stablecoinsUsd: number;
  stablecoinsChange7dPct: number;
  asOf: number;
  /** true mientras los datos sean de ejemplo. */
  sample: boolean;
}

export interface Headline {
  id: string;
  title: string;
  source: string;
  publishedAt: number;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET /overview — en el backend: CoinGecko, alternative.me y DefiLlama, con caché. */
export async function getOverview(): Promise<Overview> {
  await delay(350);
  return {
    fearGreed: { value: 64, history: [48, 52, 55, 51, 58, 61, 64] },
    totalMarketCapUsd: 2.41e12,
    marketCapChange24hPct: 1.8,
    btcDominancePct: 56.4,
    ethDominancePct: 13.1,
    stablecoinsUsd: 1.68e11,
    stablecoinsChange7dPct: 0.9,
    asOf: Date.now(),
    sample: true,
  };
}

/**
 * GET /headlines — en el backend: titulares de RSS de medios cripto, con link a
 * la nota original. Hoy son textos de ejemplo genéricos, sin medio ni link,
 * para no atribuirle a nadie una noticia inventada.
 */
export async function getHeadlines(lang: 'en' | 'es' | 'pt'): Promise<Headline[]> {
  await delay(250);
  const now = Date.now();
  const h = 3_600_000;
  const titles = {
    en: [
      'Sample headline: market volumes ease after a volatile week',
      'Sample headline: stablecoin supply keeps growing',
      'Sample headline: what an order book can tell you about liquidity',
      'Sample headline: exchanges report steady spot activity',
    ],
    es: [
      'Titular de ejemplo: los volúmenes bajan después de una semana volátil',
      'Titular de ejemplo: la oferta de stablecoins sigue creciendo',
      'Titular de ejemplo: qué dice un libro de órdenes sobre la liquidez',
      'Titular de ejemplo: los exchanges informan actividad spot estable',
    ],
    pt: [
      'Manchete de exemplo: volumes diminuem após uma semana volátil',
      'Manchete de exemplo: a oferta de stablecoins continua crescendo',
      'Manchete de exemplo: o que um livro de ofertas diz sobre liquidez',
      'Manchete de exemplo: exchanges relatam atividade spot estável',
    ],
  }[lang];
  return titles.map((title, i) => ({ id: `sample-${i}`, title, source: 'Cryptaura', publishedAt: now - (i + 1) * 2.5 * h }));
}
