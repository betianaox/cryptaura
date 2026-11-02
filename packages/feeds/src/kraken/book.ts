import { crc32, type BookLevel } from '@cryptaura/core';

/**
 * Libro de órdenes L2 de Kraken (WebSocket v2, canal `book`).
 *
 * Reglas del protocolo:
 * - Primero llega un snapshot; después, actualizaciones por nivel de precio.
 * - Una actualización con `qty: 0` borra ese nivel.
 * - Después de cada mensaje se recorta el libro a la profundidad suscrita:
 *   Kraken no manda `qty: 0` para los niveles que quedan fuera de esa profundidad.
 * - Cada mensaje trae un checksum CRC32 de los 10 mejores niveles de cada lado.
 *   Si el calculado no coincide, el libro local está corrupto y hay que pedir
 *   un snapshot nuevo.
 */
export class KrakenBook {
  /** Precio → cantidad. Se ordena al leer, no al escribir. */
  private readonly bidMap = new Map<number, number>();
  private readonly askMap = new Map<number, number>();

  constructor(
    readonly depth: number,
    readonly pricePrecision: number,
    readonly qtyPrecision: number,
  ) {}

  applySnapshot(bids: BookLevel[], asks: BookLevel[]): void {
    this.bidMap.clear();
    this.askMap.clear();
    this.applyUpdate(bids, asks);
  }

  applyUpdate(bids: BookLevel[], asks: BookLevel[]): void {
    for (const level of bids) setLevel(this.bidMap, level);
    for (const level of asks) setLevel(this.askMap, level);
    this.truncate();
  }

  /** De mayor a menor precio. */
  bids(limit = this.depth): BookLevel[] {
    return sorted(this.bidMap, 'desc').slice(0, limit);
  }

  /** De menor a mayor precio. */
  asks(limit = this.depth): BookLevel[] {
    return sorted(this.askMap, 'asc').slice(0, limit);
  }

  /** Checksum según el algoritmo de Kraken (siempre los 10 mejores niveles). */
  checksum(): number {
    const side = (levels: BookLevel[]) =>
      levels
        .map((l) => checksumNumber(l.price, this.pricePrecision) + checksumNumber(l.qty, this.qtyPrecision))
        .join('');
    return crc32(side(this.asks(10)) + side(this.bids(10)));
  }

  verify(expected: number): boolean {
    return this.checksum() === expected >>> 0;
  }

  private truncate(): void {
    trim(this.bidMap, 'desc', this.depth);
    trim(this.askMap, 'asc', this.depth);
  }
}

/**
 * Un número tal como entra en el checksum: con la precisión del instrumento,
 * sin el punto decimal y sin ceros a la izquierda.
 * `45285.2` con precisión 1 → `452852`; `0.001` con precisión 8 → `100000`.
 */
export function checksumNumber(value: number, precision: number): string {
  const digits = value.toFixed(precision).replace('.', '').replace(/^0+/, '');
  return digits === '' ? '0' : digits;
}

function setLevel(map: Map<number, number>, level: BookLevel): void {
  if (level.qty === 0) map.delete(level.price);
  else map.set(level.price, level.qty);
}

function sorted(map: Map<number, number>, order: 'asc' | 'desc'): BookLevel[] {
  const prices = [...map.keys()].sort((a, b) => (order === 'asc' ? a - b : b - a));
  return prices.map((price) => ({ price, qty: map.get(price)! }));
}

function trim(map: Map<number, number>, order: 'asc' | 'desc', depth: number): void {
  if (map.size <= depth) return;
  const prices = [...map.keys()].sort((a, b) => (order === 'asc' ? a - b : b - a));
  for (const price of prices.slice(depth)) map.delete(price);
}
