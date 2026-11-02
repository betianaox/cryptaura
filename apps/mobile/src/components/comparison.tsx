import { crossExchangeGap, formatPrice, type ExchangeId, type Ticker } from '@cryptaura/core';
import { Card, Pill, Txt, spacing, useTheme } from '@cryptaura/ui';
import { StyleSheet, View } from 'react-native';

const NAMES: Record<ExchangeId, string> = { kraken: 'Kraken', coinbase: 'Coinbase', binance: 'Binance' };

/** El mismo par en varios exchanges: precio, compra, venta y diferencia. */
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
  const all = [...(kraken ? [kraken] : []), ...others];
  const gap = crossExchangeGap(all);
  return (
    <Card>
      <View style={styles.header}>
        <Txt variant="label">Across exchanges</Txt>
        {gap ? (
          <Pill label={`Gap ${gap.gapPct.toFixed(3)}%`} tone={gap.gapPct > 0.5 ? 'down' : 'neutral'} />
        ) : null}
      </View>
      <View style={styles.row}>
        <Txt variant="small" style={styles.col}>
          Exchange
        </Txt>
        <Txt variant="small" style={styles.num}>
          Bid
        </Txt>
        <Txt variant="small" style={styles.num}>
          Ask
        </Txt>
        <Txt variant="small" style={styles.num}>
          Last
        </Txt>
      </View>
      {all.map((t) => (
        <View key={t.exchange} style={styles.row}>
          <Txt variant="small" style={[styles.col, { color: theme.text }]}>
            {NAMES[t.exchange]}
          </Txt>
          <Txt
            variant="small"
            numeric
            style={[styles.num, { color: gap?.bestBid.exchange === t.exchange ? theme.up : theme.text }]}
          >
            {formatPrice(t.bid)}
          </Txt>
          <Txt
            variant="small"
            numeric
            style={[styles.num, { color: gap?.bestAsk.exchange === t.exchange ? theme.up : theme.text }]}
          >
            {formatPrice(t.ask)}
          </Txt>
          <Txt variant="small" numeric style={[styles.num, { color: theme.text }]}>
            {formatPrice(t.last)}
          </Txt>
        </View>
      ))}
      {unavailable.map((exchange) => (
        <Txt key={exchange} variant="small">
          {NAMES[exchange]}: not available for this pair or region.
        </Txt>
      ))}
      <Txt variant="small">Binance is compared against USDT pairs. Highlighted: best bid and best ask.</Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm },
  col: { flex: 1.2 },
  num: { flex: 1, textAlign: 'right' },
});
