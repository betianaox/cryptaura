import { crossExchangeGap, formatPrice, type ExchangeId, type Ticker } from '@cryptaura/core';
import { Card, Pill, Txt, spacing, useTheme } from '@cryptaura/ui';
import { StyleSheet, View } from 'react-native';

import { fill, useI18n } from '@/i18n';

const NAMES: Record<ExchangeId, string> = { kraken: 'Kraken', coinbase: 'Coinbase', binance: 'Binance' };

/** El mismo par en varios exchanges: compra, venta, último y diferencia. */
export function ExchangeComparison({
  kraken,
  others,
  unavailable,
}: {
  kraken?: Ticker;
  others: Ticker[];
  unavailable: ExchangeId[];
}) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const all = [...(kraken ? [kraken] : []), ...others];
  const gap = crossExchangeGap(all);
  return (
    <Card>
      <View style={styles.header}>
        <Txt variant="label">{t.market.across}</Txt>
        {gap ? (
          <Pill
            label={fill(t.market.gap, { v: `${gap.gapPct.toFixed(3)}%` })}
            tone={gap.gapPct > 0.5 ? 'down' : 'neutral'}
          />
        ) : null}
      </View>
      <View style={styles.row}>
        <Txt variant="small" style={styles.col}>
          {t.market.exchange}
        </Txt>
        <Txt variant="small" style={styles.num}>
          {t.market.bid}
        </Txt>
        <Txt variant="small" style={styles.num}>
          {t.market.ask}
        </Txt>
        <Txt variant="small" style={styles.num}>
          {t.market.last}
        </Txt>
      </View>
      {all.map((tk) => (
        <View key={tk.exchange} style={styles.row}>
          <Txt variant="small" style={[styles.col, { color: theme.text }]}>
            {NAMES[tk.exchange]}
          </Txt>
          <Txt variant="small" numeric style={[styles.num, { color: gap?.bestBid.exchange === tk.exchange ? theme.up : theme.text }]}>
            {formatPrice(tk.bid, locale)}
          </Txt>
          <Txt variant="small" numeric style={[styles.num, { color: gap?.bestAsk.exchange === tk.exchange ? theme.up : theme.text }]}>
            {formatPrice(tk.ask, locale)}
          </Txt>
          <Txt variant="small" numeric style={[styles.num, { color: theme.text }]}>
            {formatPrice(tk.last, locale)}
          </Txt>
        </View>
      ))}
      {unavailable.map((exchange) => (
        <Txt key={exchange} variant="small">
          {fill(t.market.unavailable, { name: NAMES[exchange] })}
        </Txt>
      ))}
      <Txt variant="small">{t.market.acrossNote}</Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm },
  col: { flex: 1.2 },
  num: { flex: 1, textAlign: 'right' },
});
