import { bookImbalance, formatPrice, formatQty, spread, type BookLevel } from '@cryptaura/core';
import type { BookUpdate } from '@cryptaura/feeds';
import { Card, Pill, Txt, spacing, useTheme } from '@cryptaura/ui';
import { StyleSheet, View } from 'react-native';

import { fill, useI18n } from '@/i18n';

/** Libro de órdenes con barras de profundidad acumulada. */
export function OrderBookView({ update, rows = 10 }: { update: BookUpdate | null; rows?: number }) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  if (!update) {
    return (
      <Card>
        <Txt variant="label">{t.market.orderBook}</Txt>
        <Txt variant="muted">{t.common.loading}</Txt>
      </Card>
    );
  }
  const { book, checksumOk, resyncs } = update;
  const asks = book.asks.slice(0, rows);
  const bids = book.bids.slice(0, rows);
  const total = (levels: BookLevel[]) => levels.reduce((acc, l) => acc + l.qty, 0);
  const max = Math.max(total(asks), total(bids), Number.EPSILON);
  const s = spread(book);
  const imbalance = bookImbalance(book, rows);

  const levelRows = (levels: BookLevel[], side: 'ask' | 'bid') => {
    let acc = 0;
    return levels.map((level) => {
      acc += level.qty;
      const color = side === 'ask' ? theme.down : theme.up;
      const soft = side === 'ask' ? theme.downSoft : theme.upSoft;
      return (
        <View key={`${side}-${level.price}`} style={styles.level}>
          <View style={[styles.bar, { width: `${(acc / max) * 100}%`, backgroundColor: soft }]} />
          <Txt variant="small" numeric style={{ color, flex: 1 }}>
            {formatPrice(level.price, locale)}
          </Txt>
          <Txt variant="small" numeric style={{ color: theme.text }}>
            {formatQty(level.qty, locale)}
          </Txt>
        </View>
      );
    });
  };

  return (
    <Card>
      <View style={styles.header}>
        <Txt variant="label">{t.market.orderBook}</Txt>
        {checksumOk === true ? (
          <Pill
            label={resyncs > 0 ? `${t.market.checksumOk} · ${fill(t.market.resyncs, { n: resyncs })}` : t.market.checksumOk}
            tone="up"
          />
        ) : (
          <Pill label={t.market.verifying} />
        )}
      </View>
      <View>{levelRows([...asks].reverse(), 'ask')}</View>
      <View style={[styles.spread, { borderColor: theme.border }]}>
        <Txt variant="small">{t.market.spread}</Txt>
        <Txt variant="small" numeric>
          {s ? `${formatPrice(s.absolute, locale)} (${s.pct.toFixed(3)}%)` : '—'}
        </Txt>
      </View>
      <View>{levelRows(bids, 'bid')}</View>
      <View style={styles.imbalance}>
        <Txt variant="small">{t.market.imbalance}</Txt>
        <View style={[styles.imbalanceTrack, { backgroundColor: theme.downSoft }]}>
          <View style={{ width: `${((imbalance + 1) / 2) * 100}%`, backgroundColor: theme.up, height: '100%', borderRadius: 3 }} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  level: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: spacing.xs, overflow: 'hidden' },
  bar: { position: 'absolute', right: 0, top: 0, bottom: 0 },
  spread: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  imbalance: { gap: spacing.xs, marginTop: spacing.xs },
  imbalanceTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
});
