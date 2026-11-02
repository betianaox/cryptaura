import { formatPrice, formatQty, spread, type BookLevel } from '@cryptaura/core';
import type { BookUpdate } from '@cryptaura/feeds';
import { Card, Pill, Txt, spacing, useTheme } from '@cryptaura/ui';
import { StyleSheet, View } from 'react-native';

/** Libro de órdenes con barras de profundidad acumulada. */
export function OrderBookView({ update }: { update: BookUpdate | null }) {
  const theme = useTheme();
  if (!update) {
    return (
      <Card>
        <Txt variant="label">Order book</Txt>
        <Txt variant="muted">Loading…</Txt>
      </Card>
    );
  }
  const { book, checksumOk, resyncs } = update;
  const asks = book.asks.slice(0, 10);
  const bids = book.bids.slice(0, 10);
  const total = (levels: BookLevel[]) => levels.reduce((acc, l) => acc + l.qty, 0);
  const max = Math.max(total(asks), total(bids), Number.EPSILON);
  const s = spread(book);

  const rows = (levels: BookLevel[], side: 'ask' | 'bid') => {
    let acc = 0;
    return levels.map((level) => {
      acc += level.qty;
      const color = side === 'ask' ? theme.down : theme.up;
      const soft = side === 'ask' ? theme.downSoft : theme.upSoft;
      return (
        <View key={`${side}-${level.price}`} style={styles.level}>
          <View style={[styles.bar, { width: `${(acc / max) * 100}%`, backgroundColor: soft }]} />
          <Txt variant="small" numeric style={{ color, flex: 1 }}>
            {formatPrice(level.price)}
          </Txt>
          <Txt variant="small" numeric style={{ color: theme.text }}>
            {formatQty(level.qty)}
          </Txt>
        </View>
      );
    });
  };

  return (
    <Card>
      <View style={styles.header}>
        <Txt variant="label">Order book</Txt>
        {checksumOk === true ? (
          <Pill label={resyncs > 0 ? `Checksum ✓ · ${resyncs} resync` : 'Checksum ✓'} tone="up" />
        ) : (
          <Pill label="Verifying…" />
        )}
      </View>
      <View>{rows([...asks].reverse(), 'ask')}</View>
      <View style={[styles.spread, { borderColor: theme.border }]}>
        <Txt variant="small">Spread</Txt>
        <Txt variant="small" numeric>
          {s ? `${formatPrice(s.absolute)} (${s.pct.toFixed(3)}%)` : '—'}
        </Txt>
      </View>
      <View>{rows(bids, 'bid')}</View>
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
});
