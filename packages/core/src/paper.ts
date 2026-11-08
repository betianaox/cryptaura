import { parseMarketId } from './market';
import type { MarketId, Ticker, TradeSide } from './types';

// Simulador de trading con dinero ficticio. Las órdenes se ejecutan contra
// precios reales: compra al mejor precio de venta (ask) y vende al mejor
// precio de compra (bid), como en un exchange. Todo es puro e inmutable: cada
// operación devuelve una cuenta nueva.

/** Comisión simulada por operación (0,25 %). */
export const PAPER_FEE_RATE = 0.0025;
export const PAPER_STARTING_CASH = 10_000;
/** La cuenta está en USD: solo se operan pares contra USD. */
export const PAPER_QUOTE = 'USD';

export type OrderType = 'market' | 'limit';
export type OrderStatus = 'open' | 'filled' | 'cancelled';

export interface PaperOrder {
  id: string;
  market: MarketId;
  side: TradeSide;
  type: OrderType;
  qty: number;
  limitPrice?: number;
  status: OrderStatus;
  createdAt: number;
  filledAt?: number;
  fillPrice?: number;
  fee?: number;
  /** Por qué se canceló, si fue el sistema. */
  reason?: PaperError;
}

export interface PaperPosition {
  market: MarketId;
  qty: number;
  /** Precio promedio de compra, con comisiones incluidas. */
  avgPrice: number;
}

export interface PaperAccount {
  cash: number;
  startingCash: number;
  positions: Partial<Record<MarketId, PaperPosition>>;
  orders: PaperOrder[];
}

export type PaperError =
  | 'invalid-qty'
  | 'invalid-price'
  | 'unsupported-market'
  | 'no-price'
  | 'insufficient-cash'
  | 'insufficient-position';

export function newPaperAccount(startingCash = PAPER_STARTING_CASH): PaperAccount {
  return { cash: startingCash, startingCash, positions: {}, orders: [] };
}

export function isPaperMarket(market: MarketId): boolean {
  return parseMarketId(market).quote === PAPER_QUOTE;
}

export interface OrderInput {
  id: string;
  market: MarketId;
  side: TradeSide;
  type: OrderType;
  qty: number;
  limitPrice?: number;
}

export type OrderResult = { ok: true; account: PaperAccount; order: PaperOrder } | { ok: false; error: PaperError };

/** Crea una orden. Las de mercado se ejecutan en el acto; las límite quedan abiertas. */
export function placeOrder(account: PaperAccount, input: OrderInput, ticker: Ticker | undefined, now: number): OrderResult {
  if (!isPaperMarket(input.market)) return { ok: false, error: 'unsupported-market' };
  if (!(input.qty > 0) || !Number.isFinite(input.qty)) return { ok: false, error: 'invalid-qty' };

  if (input.type === 'limit') {
    if (!(input.limitPrice !== undefined && input.limitPrice > 0)) return { ok: false, error: 'invalid-price' };
    const check = canFill(account, input.market, input.side, input.qty, input.limitPrice);
    if (check) return { ok: false, error: check };
    const order: PaperOrder = { ...input, status: 'open', createdAt: now };
    return { ok: true, order, account: { ...account, orders: [order, ...account.orders] } };
  }

  if (!ticker) return { ok: false, error: 'no-price' };
  const price = input.side === 'buy' ? ticker.ask : ticker.bid;
  if (!(price > 0)) return { ok: false, error: 'no-price' };
  const pending: PaperOrder = { ...input, status: 'open', createdAt: now };
  const filled = fill(account, pending, price, now);
  if (!filled.ok) return filled;
  return { ok: true, account: filled.account, order: filled.order };
}

export function cancelOrder(account: PaperAccount, orderId: string): PaperAccount {
  return {
    ...account,
    orders: account.orders.map((o) => (o.id === orderId && o.status === 'open' ? { ...o, status: 'cancelled' } : o)),
  };
}

/**
 * Ejecuta las órdenes límite abiertas de ese par que el precio alcanzó: una
 * compra cuando el ask baja hasta el límite, una venta cuando el bid sube.
 * Se ejecutan al precio límite. Si al momento de ejecutar ya no alcanza el
 * saldo, la orden se cancela con el motivo.
 */
export function fillOpenOrders(account: PaperAccount, ticker: Ticker, now: number): PaperAccount {
  let current = account;
  for (const order of account.orders) {
    if (order.status !== 'open' || order.type !== 'limit' || order.market !== ticker.market) continue;
    const limit = order.limitPrice!;
    const reached = order.side === 'buy' ? ticker.ask > 0 && ticker.ask <= limit : ticker.bid >= limit;
    if (!reached) continue;
    const result = fill(current, order, limit, now);
    current = result.ok
      ? result.account
      : {
          ...current,
          orders: current.orders.map((o) =>
            o.id === order.id ? { ...o, status: 'cancelled' as const, reason: result.error } : o,
          ),
        };
  }
  return current;
}

function canFill(account: PaperAccount, market: MarketId, side: TradeSide, qty: number, price: number): PaperError | null {
  if (side === 'buy') return qty * price * (1 + PAPER_FEE_RATE) > account.cash + 1e-9 ? 'insufficient-cash' : null;
  return (account.positions[market]?.qty ?? 0) + 1e-12 < qty ? 'insufficient-position' : null;
}

function fill(
  account: PaperAccount,
  order: PaperOrder,
  price: number,
  now: number,
): { ok: true; account: PaperAccount; order: PaperOrder } | { ok: false; error: PaperError } {
  const problem = canFill(account, order.market, order.side, order.qty, price);
  if (problem) return { ok: false, error: problem };

  const gross = order.qty * price;
  const fee = gross * PAPER_FEE_RATE;
  const position = account.positions[order.market];
  const positions = { ...account.positions };
  let cash = account.cash;

  if (order.side === 'buy') {
    cash -= gross + fee;
    const prevQty = position?.qty ?? 0;
    const prevCost = prevQty * (position?.avgPrice ?? 0);
    const qty = prevQty + order.qty;
    positions[order.market] = { market: order.market, qty, avgPrice: (prevCost + gross + fee) / qty };
  } else {
    cash += gross - fee;
    const qty = (position?.qty ?? 0) - order.qty;
    if (qty <= 1e-12) delete positions[order.market];
    else positions[order.market] = { ...position!, qty };
  }

  const filled: PaperOrder = { ...order, status: 'filled', filledAt: now, fillPrice: price, fee };
  const exists = account.orders.some((o) => o.id === order.id);
  const orders = exists ? account.orders.map((o) => (o.id === order.id ? filled : o)) : [filled, ...account.orders];
  return { ok: true, order: filled, account: { ...account, cash, positions, orders } };
}

export interface PositionValue {
  value: number;
  pnl: number;
  pnlPct: number;
}

/** Valor y resultado de una posición al precio de venta actual (bid). */
export function positionValue(position: PaperPosition, bid: number): PositionValue {
  const value = position.qty * bid;
  const cost = position.qty * position.avgPrice;
  return { value, pnl: value - cost, pnlPct: cost === 0 ? 0 : ((value - cost) / cost) * 100 };
}

/** Valor total de la cuenta: efectivo más posiciones valuadas al bid. */
export function accountValue(account: PaperAccount, bids: Partial<Record<MarketId, number>>): number {
  let total = account.cash;
  for (const position of Object.values(account.positions)) {
    if (!position) continue;
    total += position.qty * (bids[position.market] ?? position.avgPrice);
  }
  return total;
}
