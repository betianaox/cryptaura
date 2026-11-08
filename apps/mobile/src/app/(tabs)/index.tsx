import { marketToSlug, type MarketId } from '@cryptaura/core';
import { EmptyState, Segmented, radius, spacing, useTheme } from '@cryptaura/ui';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { LiveBadge } from '@/components/app-shell';
import { Disclaimer } from '@/components/disclaimer';
import { MarketRow } from '@/components/market-row';
import { useTickers } from '@/hooks/use-market-data';
import { fill, useI18n } from '@/i18n';
import { ASSET_NAMES, DEFAULT_MARKETS } from '@/lib/feed';
import { useStore } from '@/state/store';

type Filter = 'favorites' | 'all' | 'gainers' | 'losers' | 'volume';

/** Mercados: lista en vivo, con favoritos, buscador y orden. */
export default function MarketsScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const favorites = useStore((s) => s.favorites);
  const tickers = useTickers(DEFAULT_MARKETS);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const markets = useMemo(() => {
    const q = query.trim().toUpperCase();
    let list: MarketId[] = filter === 'favorites' ? DEFAULT_MARKETS.filter((m) => favorites.includes(m)) : DEFAULT_MARKETS;
    if (q) list = list.filter((m) => m.includes(q) || (ASSET_NAMES[m.split('/')[0]!] ?? '').toUpperCase().includes(q));
    const value = (m: MarketId) => {
      const tk = tickers[m];
      if (!tk) return -Infinity;
      if (filter === 'gainers') return tk.changePct24h;
      if (filter === 'losers') return -tk.changePct24h;
      if (filter === 'volume') return tk.volume24h * tk.last;
      return 0;
    };
    return filter === 'all' || filter === 'favorites' ? list : [...list].sort((a, b) => value(b) - value(a));
  }, [query, filter, tickers, favorites]);

  const empty =
    query.trim() !== ''
      ? fill(t.markets.noResults, { q: query.trim() })
      : filter === 'favorites'
        ? t.markets.noFavorites
        : t.common.loading;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerRight: () => <View style={{ paddingRight: spacing.lg }}><LiveBadge /></View> }} />
      <View style={styles.top}>
        <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={16} color={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.markets.search}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'favorites', label: t.markets.favorites },
            { value: 'all', label: t.markets.all },
            { value: 'gainers', label: t.markets.gainers },
            { value: 'losers', label: t.markets.losers },
            { value: 'volume', label: t.markets.volume },
          ]}
        />
      </View>
      <FlatList
        data={markets}
        keyExtractor={(m) => m}
        renderItem={({ item }) => (
          <MarketRow
            market={item}
            ticker={tickers[item]}
            favorite={favorites.includes(item)}
            locale={locale}
            volLabel={t.markets.vol}
            onPress={() => router.push({ pathname: '/market/[slug]', params: { slug: marketToSlug(item) } })}
          />
        )}
        ListEmptyComponent={<EmptyState text={empty} />}
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  searchInput: { flex: 1, height: '100%' },
});
