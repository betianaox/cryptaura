import {
  PAPER_FEE_RATE,
  accountValue,
  formatPct,
  formatPrice,
  formatQty,
  marketToSlug,
  positionValue,
  type MarketId,
  type PaperOrder,
  type PaperPosition,
} from '@cryptaura/core';
import { Button, Card, ChangeText, EmptyState, Pill, SectionTitle, Stat, Txt, spacing, useTheme } from '@cryptaura/ui';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert as NativeAlert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useTickers } from '@/hooks/use-market-data';
import { fill, useI18n } from '@/i18n';
import { timeAgo } from '@/lib/describe';
import { useStore } from '@/state/store';

const usd = (v: number, locale: string) => `$${formatPrice(v, locale, 2)}`;

/** Simulador: cuenta ficticia, posiciones, órdenes abiertas e historial. */
export default function SimulatorScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const paper = useStore((s) => s.paper);
  const cancelOrder = useStore((s) => s.cancelOrder);
  const resetPaper = useStore((s) => s.resetPaper);

  const positions = Object.values(paper.positions).filter((p): p is PaperPosition => !!p);
  const open = paper.orders.filter((o) => o.status === 'open');
  const history = paper.orders.filter((o) => o.status !== 'open').slice(0, 20);
  const markets = useMemo(
    () => [...new Set<MarketId>([...positions.map((p) => p.market), ...open.map((o) => o.market)])].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positions.map((p) => p.market).join(), open.map((o) => o.market).join()],
  );
  const tickers = useTickers(markets, 2);
  const bids = Object.fromEntries(Object.values(tickers).map((tk) => [tk!.market, tk!.bid]));
  const value = accountValue(paper, bids);
  const pnl = value - paper.startingCash;

  const reset = () => {
    const message = fill(t.sim.resetConfirm, { cash: usd(paper.startingCash, locale) });
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(message)) resetPaper();
      return;
    }
    NativeAlert.alert(t.sim.reset, message, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.sim.reset, style: 'destructive', onPress: resetPaper },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Txt variant="small">{t.sim.value}</Txt>
        <Txt variant="hero" numeric>
          {usd(value, locale)}
        </Txt>
        <ChangeText
          value={pnl}
          text={`${pnl >= 0 ? '+' : '−'}${usd(Math.abs(pnl), locale)} (${formatPct((pnl / paper.startingCash) * 100, locale)})`}
        />
        <View style={styles.row}>
          <Stat label={t.sim.cash} value={usd(paper.cash, locale)} />
          <Stat label={t.sim.positions} value={String(positions.length)} />
        </View>
        <Button
          title={t.sim.trade}
          icon={<Ionicons name="swap-horizontal" size={16} color={theme.onAccent} />}
          onPress={() => router.push({ pathname: '/trade/[slug]', params: { slug: 'BTC-USD' } })}
        />
      </Card>

      <Card>
        <SectionTitle>{t.sim.positions}</SectionTitle>
        {positions.length === 0 ? <EmptyState text={t.sim.noPositions} /> : null}
        {positions.map((p) => {
          const bid = tickers[p.market]?.bid;
          const pv = bid ? positionValue(p, bid) : null;
          return (
            <Pressable
              key={p.market}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/trade/[slug]', params: { slug: marketToSlug(p.market) } })}
              style={[styles.line, { borderColor: theme.border }]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="label">{p.market}</Txt>
                <Txt variant="small" numeric>
                  {formatQty(p.qty, locale)} · {t.sim.price} {formatPrice(p.avgPrice, locale)}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Txt variant="label" numeric>
                  {pv ? usd(pv.value, locale) : '—'}
                </Txt>
                {pv ? <ChangeText value={pv.pnl} text={formatPct(pv.pnlPct, locale)} variant="small" /> : null}
              </View>
            </Pressable>
          );
        })}
      </Card>

      {open.length > 0 ? (
        <Card>
          <SectionTitle>{t.sim.openOrders}</SectionTitle>
          {open.map((o) => (
            <OrderLine key={o.id} order={o} onCancel={() => cancelOrder(o.id)} />
          ))}
        </Card>
      ) : null}

      <Card>
        <SectionTitle>{t.sim.history}</SectionTitle>
        {history.length === 0 ? <EmptyState text={t.sim.noHistory} /> : null}
        {history.map((o) => (
          <OrderLine key={o.id} order={o} />
        ))}
      </Card>

      <Txt variant="small" style={{ textAlign: 'center' }}>
        {fill(t.sim.note, { fee: `${(PAPER_FEE_RATE * 100).toFixed(2)}%` })}
      </Txt>
      <Button title={t.sim.reset} variant="ghost" onPress={reset} />
    </ScrollView>
  );
}

function OrderLine({ order, onCancel }: { order: PaperOrder; onCancel?: () => void }) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const status = { open: t.sim.open, filled: t.sim.filled, cancelled: t.sim.cancelled }[order.status];
  const price = order.fillPrice ?? order.limitPrice;
  return (
    <View style={[styles.line, { borderColor: theme.border }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="label" style={{ color: order.side === 'buy' ? theme.up : theme.down }}>
          {order.side === 'buy' ? t.sim.buy : t.sim.sell} {order.market}
        </Txt>
        <Txt variant="small" numeric>
          {formatQty(order.qty, locale)} @ {price ? formatPrice(price, locale) : '—'} ·{' '}
          {order.type === 'limit' ? t.sim.limit : t.sim.market} · {timeAgo(order.filledAt ?? order.createdAt, locale)}
        </Txt>
        {order.reason ? (
          <Txt variant="small" style={{ color: theme.down }}>
            {t.sim.errors[order.reason]}
          </Txt>
        ) : null}
      </View>
      {onCancel ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t.sim.cancel} onPress={onCancel} hitSlop={10}>
          <Ionicons name="close-circle-outline" size={20} color={theme.textMuted} />
        </Pressable>
      ) : (
        <Pill label={status} tone={order.status === 'filled' ? 'up' : 'neutral'} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.md },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
