import { marketToSlug, type MarketId } from '@cryptaura/core';
import { ConnectionBadge, Txt, radius, spacing, useTheme } from '@cryptaura/ui';
import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { Disclaimer } from '@/components/disclaimer';
import { MarketRow } from '@/components/market-row';
import { useConnectionState, useTickers } from '@/hooks/use-market-data';
import { DEFAULT_MARKETS } from '@/lib/feed';

type Sort = 'volume' | 'gainers' | 'losers';

/** Mercados: lista en vivo de pares de Kraken. */
export default function MarketsScreen() {
  const theme = useTheme();
  const connection = useConnectionState();
  const tickers = useTickers(DEFAULT_MARKETS);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('volume');

  const markets = useMemo(() => {
    const q = query.trim().toUpperCase();
    const list = DEFAULT_MARKETS.filter((m) => !q || m.includes(q));
    const value = (m: MarketId) => {
      const t = tickers[m];
      if (!t) return -Infinity;
      if (sort === 'volume') return t.volume24h * t.last;
      return sort === 'gainers' ? t.changePct24h : -t.changePct24h;
    };
    return [...list].sort((a, b) => value(b) - value(a));
  }, [query, sort, tickers]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.top}>
        <View style={styles.status}>
          <ConnectionBadge state={connection} />
          <Link href="/about" style={{ color: theme.textMuted, fontSize: 12 }}>
            Data & disclaimer
          </Link>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search a pair (BTC, ETH/EUR…)"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="characters"
          style={[
            styles.search,
            { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
          ]}
        />
        <View style={styles.sorts}>
          {(['volume', 'gainers', 'losers'] as Sort[]).map((s) => (
            <Txt
              key={s}
              variant="small"
              accessibilityRole="button"
              accessibilityState={{ selected: s === sort }}
              onPress={() => setSort(s)}
              style={[
                styles.sort,
                {
                  backgroundColor: s === sort ? theme.surfaceAlt : 'transparent',
                  color: s === sort ? theme.text : theme.textMuted,
                },
              ]}
            >
              {{ volume: 'Top volume', gainers: 'Gainers', losers: 'Losers' }[s]}
            </Txt>
          ))}
        </View>
      </View>
      <FlatList
        data={markets}
        keyExtractor={(m) => m}
        renderItem={({ item }) => (
          <MarketRow
            market={item}
            ticker={tickers[item]}
            onPress={() => router.push({ pathname: '/market/[slug]', params: { slug: marketToSlug(item) } })}
          />
        )}
        ListFooterComponent={
          <View style={{ padding: spacing.lg }}>
            <Disclaimer />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  status: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  sorts: { flexDirection: 'row', gap: spacing.xs },
  sort: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, overflow: 'hidden' },
});
