import { formatPrice, formatQty, type Trade } from '@cryptaura/core';
import { Card, Txt, useTheme } from '@cryptaura/ui';
import { StyleSheet, View } from 'react-native';

const time = (ts: number) =>
  new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Operaciones recientes ("the tape"). */
export function TradesTape({ trades }: { trades: Trade[] }) {
  const theme = useTheme();
  return (
    <Card>
      <Txt variant="label">Recent trades</Txt>
      {trades.length === 0 ? <Txt variant="muted">Waiting for trades…</Txt> : null}
      {trades.map((trade) => (
        <View key={trade.id} style={styles.row}>
          <Txt
            variant="small"
            numeric
            style={{ flex: 1, color: trade.side === 'buy' ? theme.up : theme.down }}
          >
            {formatPrice(trade.price)}
          </Txt>
          <Txt variant="small" numeric style={{ flex: 1, textAlign: 'right', color: theme.text }}>
            {formatQty(trade.qty)}
          </Txt>
          <Txt variant="small" numeric style={{ flex: 1, textAlign: 'right' }}>
            {time(trade.ts)}
          </Txt>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 2 },
});
