import { formatCompact, formatPct, formatPrice, slugToMarket, type Interval } from '@cryptaura/core';
import { ChangeText, ConnectionBadge, Txt, spacing } from '@cryptaura/ui';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ExchangeComparison } from '@/components/comparison';
import { Disclaimer } from '@/components/disclaimer';
import { OrderBookView } from '@/components/order-book';
import { PriceChart } from '@/components/price-chart';
import { TradesTape } from '@/components/trades-tape';
import {
  useCandles,
  useComparison,
  useConnectionState,
  useOrderBook,
  useTickers,
  useTrades,
} from '@/hooks/use-market-data';

/** Detalle de un par: precio, velas, libro, operaciones y comparación. */
export default function MarketScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const market = slugToMarket(slug);
  const [interval, setChartInterval] = useState<Interval>('1h');

  const connection = useConnectionState();
  const ticker = useTickers([market])[market];
  const book = useOrderBook(market);
  const trades = useTrades(market);
  const candles = useCandles(market, interval);
  const comparison = useComparison(market);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: market }} />
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="hero" numeric>
            {ticker ? formatPrice(ticker.last) : '—'}
          </Txt>
          {ticker ? (
            <ChangeText value={ticker.changePct24h} text={`${formatPct(ticker.changePct24h)} · 24h`} />
          ) : null}
        </View>
        <ConnectionBadge state={connection} />
      </View>
      {ticker ? (
        <View style={styles.stats}>
          <Txt variant="small" numeric>
            High {formatPrice(ticker.high24h)}
          </Txt>
          <Txt variant="small" numeric>
            Low {formatPrice(ticker.low24h)}
          </Txt>
          <Txt variant="small" numeric>
            Vol {formatCompact(ticker.volume24h)}
          </Txt>
        </View>
      ) : null}

      <PriceChart candles={candles} interval={interval} onInterval={setChartInterval} />
      <OrderBookView update={book} />
      <ExchangeComparison
        kraken={ticker}
        others={comparison?.tickers ?? []}
        unavailable={comparison?.unavailable ?? []}
      />
      <TradesTape trades={trades} />
      <Disclaimer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
});
