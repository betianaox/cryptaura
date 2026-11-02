// Formato de números para mostrar. Siempre con Intl para respetar el idioma.

/** Precio con una cantidad de decimales razonable según su tamaño. */
export function formatPrice(value: number, locale = 'en-US', decimals?: number): string {
  const digits = decimals ?? (value >= 1000 ? 2 : value >= 1 ? 4 : 6);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPct(value: number, locale = 'en-US'): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat(locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}%`;
}

/** Volumen compacto: 1.2K, 3.4M. */
export function formatCompact(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatQty(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: value >= 1 ? 4 : 8 }).format(value);
}
