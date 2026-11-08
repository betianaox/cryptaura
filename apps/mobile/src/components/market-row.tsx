import { formatCompact, formatPct, formatPrice, type MarketId, type Ticker } from '@cryptaura/core';
import { ChangeText, Txt, radius, spacing, useTheme } from '@cryptaura/ui';
import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { fill } from '@/i18n';
import { ASSET_NAMES } from '@/lib/feed';

interface Props {
  market: MarketId;
  ticker?: Ticker;
  favorite: boolean;
  locale: string;
  volLabel: string;
  onPress: () => void;
}

function MarketRowBase({ market, ticker, favorite, locale, volLabel, onPress }: Props) {
  const theme = useTheme();
  const [base = '', quote = ''] = market.split('/');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${market}${ticker ? `, ${formatPrice(ticker.last, locale)}, ${formatPct(ticker.changePct24h, locale)}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
        <Txt variant="small" style={{ color: theme.accent, fontWeight: '700' }}>
          {base.slice(0, 4)}
        </Txt>
      </View>
      <View style={styles.name}>
        <View style={styles.nameLine}>
          <Txt variant="label">
            {base}
            <Txt variant="small"> / {quote}</Txt>
          </Txt>
          {favorite ? <Ionicons name="star" size={12} color={theme.accent} /> : null}
        </View>
        <Txt variant="small" numeric numberOfLines={1}>
          {ASSET_NAMES[base] ?? base}
          {ticker ? ` · ${fill(volLabel, { v: formatCompact(ticker.volume24h, locale) })}` : ''}
        </Txt>
      </View>
      <View style={styles.values}>
        <Txt variant="label" numeric>
          {ticker ? formatPrice(ticker.last, locale) : '—'}
        </Txt>
        {ticker ? (
          <ChangeText value={ticker.changePct24h} text={formatPct(ticker.changePct24h, locale)} variant="small" />
        ) : null}
      </View>
    </Pressable>
  );
}

/** Memo: con 4 redibujos por segundo, solo se repintan las filas cuyo ticker cambió. */
export const MarketRow = memo(
  MarketRowBase,
  (a, b) => a.ticker === b.ticker && a.market === b.market && a.favorite === b.favorite && a.locale === b.locale,
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, gap: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  values: { alignItems: 'flex-end', gap: 2 },
});
