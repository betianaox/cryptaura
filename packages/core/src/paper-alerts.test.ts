import { describe, expect, it } from 'vitest';

import {
  ALERT_COOLDOWN_MS,
  PAPER_FEE_RATE,
  accountValue,
  cancelOrder,
  fillOpenOrders,
  newPaperAccount,
  placeOrder,
  positionValue,
  shouldTrigger,
  tickerSpreadPct,
  type Alert,
  type Ticker,
} from './index';

const ticker = (last: number, spread = 1, changePct24h = 0, market: Ticker['market'] = 'BTC/USD'): Ticker => ({
  exchange: 'kraken',
  market,
  bid: last - spread / 2,
  ask: last + spread / 2,
  last,
  change24h: 0,
  changePct24h,
  volume24h: 0,
  high24h: 0,
  low24h: 0,
  ts: 0,
});

describe('alertas', () => {
  const alert = (rule: Alert['rule'], extra: Partial<Alert> = {}): Alert => ({
    id: 'a',
    market: 'BTC/USD',
    rule,
    enabled: true,
    createdAt: 0,
    ...extra,
  });

  it('dispara cuando el precio cruza el valor', () => {
    expect(shouldTrigger(alert({ kind: 'price-above', value: 100 }), ticker(100), 0)).toBe(true);
    expect(shouldTrigger(alert({ kind: 'price-above', value: 100 }), ticker(99), 0)).toBe(false);
    expect(shouldTrigger(alert({ kind: 'price-below', value: 100 }), ticker(98), 0)).toBe(true);
  });

  it('usa la variación absoluta de 24 h', () => {
    expect(shouldTrigger(alert({ kind: 'change-above', value: 5 }), ticker(1, 0, -6), 0)).toBe(true);
    expect(shouldTrigger(alert({ kind: 'change-above', value: 5 }), ticker(1, 0, 4), 0)).toBe(false);
  });

  it('calcula el spread porcentual', () => {
    expect(tickerSpreadPct(ticker(100, 2))).toBeCloseTo(2, 6);
    expect(shouldTrigger(alert({ kind: 'spread-above', value: 1.5 }), ticker(100, 2), 0)).toBe(true);
  });

  it('respeta el tiempo de espera, si está apagada y el par', () => {
    const fired = alert({ kind: 'price-above', value: 1 }, { lastTriggeredAt: 1000 });
    expect(shouldTrigger(fired, ticker(5), 1000 + ALERT_COOLDOWN_MS - 1)).toBe(false);
    expect(shouldTrigger(fired, ticker(5), 1000 + ALERT_COOLDOWN_MS)).toBe(true);
    expect(shouldTrigger(alert({ kind: 'price-above', value: 1 }, { enabled: false }), ticker(5), 0)).toBe(false);
    expect(shouldTrigger(alert({ kind: 'price-above', value: 1 }), ticker(5, 1, 0, 'ETH/USD'), 0)).toBe(false);
  });
});

describe('simulador', () => {
  it('compra al ask y cobra la comisión', () => {
    const r = placeOrder(newPaperAccount(1000), { id: '1', market: 'BTC/USD', side: 'buy', type: 'market', qty: 2 }, ticker(100, 2), 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const cost = 2 * 101;
    expect(r.order.fillPrice).toBe(101);
    expect(r.account.cash).toBeCloseTo(1000 - cost * (1 + PAPER_FEE_RATE), 9);
    expect(r.account.positions['BTC/USD']).toEqual({
      market: 'BTC/USD',
      qty: 2,
      avgPrice: (cost * (1 + PAPER_FEE_RATE)) / 2,
    });
  });

  it('vende al bid y cierra la posición', () => {
    const buy = placeOrder(newPaperAccount(1000), { id: '1', market: 'BTC/USD', side: 'buy', type: 'market', qty: 1 }, ticker(100, 0), 0);
    if (!buy.ok) throw new Error();
    const sell = placeOrder(buy.account, { id: '2', market: 'BTC/USD', side: 'sell', type: 'market', qty: 1 }, ticker(110, 2), 1);
    if (!sell.ok) throw new Error();
    expect(sell.order.fillPrice).toBe(109);
    expect(sell.account.positions['BTC/USD']).toBeUndefined();
    expect(sell.account.orders.map((o) => o.id)).toEqual(['2', '1']);
  });

  it('rechaza lo que no se puede', () => {
    const acc = newPaperAccount(100);
    const t = ticker(100, 0);
    const err = (r: ReturnType<typeof placeOrder>) => (r.ok ? null : r.error);
    expect(err(placeOrder(acc, { id: '1', market: 'BTC/USD', side: 'buy', type: 'market', qty: 2 }, t, 0))).toBe('insufficient-cash');
    expect(err(placeOrder(acc, { id: '1', market: 'BTC/USD', side: 'sell', type: 'market', qty: 1 }, t, 0))).toBe('insufficient-position');
    expect(err(placeOrder(acc, { id: '1', market: 'BTC/USD', side: 'buy', type: 'market', qty: 0 }, t, 0))).toBe('invalid-qty');
    expect(err(placeOrder(acc, { id: '1', market: 'BTC/EUR', side: 'buy', type: 'market', qty: 0.1 }, t, 0))).toBe('unsupported-market');
    expect(err(placeOrder(acc, { id: '1', market: 'BTC/USD', side: 'buy', type: 'market', qty: 0.1 }, undefined, 0))).toBe('no-price');
  });

  it('ejecuta una orden límite cuando el precio la alcanza', () => {
    const placed = placeOrder(
      newPaperAccount(1000),
      { id: 'L', market: 'BTC/USD', side: 'buy', type: 'limit', qty: 1, limitPrice: 90 },
      undefined,
      0,
    );
    if (!placed.ok) throw new Error();
    expect(placed.order.status).toBe('open');
    const still = fillOpenOrders(placed.account, ticker(100, 2), 1);
    expect(still.orders[0]!.status).toBe('open');
    const done = fillOpenOrders(still, ticker(89, 2), 2);
    expect(done.orders[0]).toMatchObject({ status: 'filled', fillPrice: 90 });
    expect(done.positions['BTC/USD']!.qty).toBe(1);
  });

  it('cancela una orden abierta', () => {
    const placed = placeOrder(newPaperAccount(1000), { id: 'L', market: 'BTC/USD', side: 'buy', type: 'limit', qty: 1, limitPrice: 90 }, undefined, 0);
    if (!placed.ok) throw new Error();
    expect(cancelOrder(placed.account, 'L').orders[0]!.status).toBe('cancelled');
  });

  it('valúa posiciones y la cuenta al bid', () => {
    expect(positionValue({ market: 'BTC/USD', qty: 2, avgPrice: 100 }, 110)).toEqual({ value: 220, pnl: 20, pnlPct: 10 });
    const acc = { ...newPaperAccount(50), positions: { 'BTC/USD': { market: 'BTC/USD' as const, qty: 2, avgPrice: 100 } } };
    expect(accountValue(acc, { 'BTC/USD': 110 })).toBe(270);
  });
});
