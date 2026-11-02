import { Card, Txt, spacing } from '@cryptaura/ui';
import { ScrollView, StyleSheet } from 'react-native';

const SOURCES = [
  ['Kraken', 'Live prices, order book, trades and candles (public WebSocket API v2).'],
  ['Coinbase', 'Price comparison (public market data).'],
  ['Binance', 'Price comparison (public market data endpoints).'],
] as const;

/** Fuentes de datos, atribuciones y aviso. */
export default function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Txt variant="title">Not financial advice</Txt>
        <Txt variant="muted">
          Cryptaura shows public market data for information purposes only. It does not buy, sell or hold
          assets, and nothing in the app is a recommendation to trade.
        </Txt>
      </Card>
      <Card>
        <Txt variant="title">Data sources</Txt>
        {SOURCES.map(([name, use]) => (
          <Txt key={name} variant="muted">
            <Txt variant="label">{name}</Txt> — {use}
          </Txt>
        ))}
        <Txt variant="small">
          Cryptaura is an independent app and is not affiliated with or endorsed by any exchange.
        </Txt>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
});
