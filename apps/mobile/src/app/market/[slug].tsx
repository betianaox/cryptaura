import { formatCompact, formatPct, formatPrice, isPaperMarket, marketToSlug, slugToMarket, type Interval } from '@cryptaura/core';
import { Button, Card, ChangeText, Pill, Txt, spacing, useTheme } from '@cryptaura/ui';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LiveBadge } from '@/components/app-shell';
import { DepthChart, PriceChart } from '@/components/charts';
import { ExchangeComparison } from '@/components/comparison';
import { Disclaimer } from '@/components/disclaimer';
import { OrderBookView } from '@/components/order-book';
import { TradesTape } from '@/components/trades-tape';
import { useCandles, useComparison, useOrderBook, useTicker, useTrades } from '@/hooks/use-market-data';
import { useI18n } from '@/i18n';
import { pairBrief } from '@/lib/brief';
import { ASSET_NAMES } from '@/lib/feed';
import { useStore } from '@/state/store';

/** Detalle de un par: precio, velas, resumen, libro, profundidad, comparación y operaciones. */
export default function MarketScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const market = slugToMarket(slug ?? 'BTC-USD');
  const theme = useTheme();
  const { t, locale } = useI18n();
  const [interval, setChartInterval] = useState<Interval>('1h');
  const favorite = useStore((s) => s.favorites.includes(market));
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  const ticker = useTicker(market);
  const book = useOrderBook(market);
  const trades = useTrades(market);
  const candles = useCandles(market, interval);
  const comparison = useComparison(market, ticker);
  const base = market.split('/')[0]!;
  const brief = ticker ? pairBrief(t, locale, ticker, book?.book ?? null, comparison?.tickers ?? []) : [];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: market,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={favorite ? t.market.unfavorite : t.market.favorite}
              onPress={() => toggleFavorite(market)}
              hitSlop={12}
            >
              <Ionicons name={favorite ? 'star' : 'star-outline'} size={22} color={favorite ? theme.accent : theme.text} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="small">{ASSET_NAMES[base] ?? base}</Txt>
          <Txt variant="hero" numeric>
            {ticker ? formatPrice(ticker.last, locale) : '—'}
          </Txt>
          {ticker ? (
            <ChangeText
              value={ticker.changePct24h}
              text={`${formatPct(ticker.changePct24h, locale)} · ${t.market.h24}`}
            />
          ) : null}
        </View>
        <LiveBadge />
      </View>
      {ticker ? (
        <View style={styles.stats}>
          <Txt variant="small" numeric>
            {t.market.high} {formatPrice(ticker.high24h, locale)}
          </Txt>
          <Txt variant="small" numeric>
            {t.market.low} {formatPrice(ticker.low24h, locale)}
          </Txt>
          <Txt variant="small" numeric>
            {t.market.vol} {formatCompact(ticker.volume24h, locale)}
          </Txt>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          title={t.market.createAlert}
          variant="secondary"
          style={{ flex: 1 }}
          icon={<Ionicons name="notifications-outline" size={16} color={theme.text} />}
          onPress={() => router.push({ pathname: '/alert/new', params: { market: marketToSlug(market) } })}
        />
        <Button
          title={t.market.trade}
          style={{ flex: 1 }}
          disabled={!isPaperMarket(market)}
          icon={<Ionicons name="swap-horizontal" size={16} color={theme.onAccent} />}
          onPress={() => router.push({ pathname: '/trade/[slug]', params: { slug: marketToSlug(market) } })}
        />
      </View>

      <PriceChart candles={candles} interval={interval} onInterval={setChartInterval} />

      {brief.length > 0 ? (
        <Card>
          <View style={styles.row}>
            <Ionicons name="sparkles" size={16} color={theme.accent} />
            <Txt variant="label" style={{ flex: 1 }}>
              {t.market.brief}
            </Txt>
            <Pill label="Beta" />
          </View>
          <Txt variant="body" style={{ lineHeight: 21 }}>
            {brief.join(' ')}
          </Txt>
          <Txt variant="small">{t.market.briefNote}</Txt>
        </Card>
      ) : null}

      <OrderBookView update={book} />
      <DepthChart book={book?.book ?? null} />
      <ExchangeComparison kraken={ticker} others={comparison?.tickers ?? []} unavailable={comparison?.unavailable ?? []} />
      <TradesTape trades={trades} />
      <Disclaimer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
