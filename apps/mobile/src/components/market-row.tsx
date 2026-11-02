import { formatCompact, formatPct, formatPrice, type MarketId, type Ticker } from '@cryptaura/core';
import { ChangeText, Txt, spacing, useTheme } from '@cryptaura/ui';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

function MarketRowBase({
  market,
  ticker,
  onPress,
}: {
  market: MarketId;
  ticker?: Ticker;
  onPress: () => void;
}) {
  const theme = useTheme();
  const [base, quote] = market.split('/');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${market}${ticker ? `, ${formatPrice(ticker.last)}, ${formatPct(ticker.changePct24h)}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={styles.name}>
        <Txt variant="label">
          {base}
          <Txt variant="small"> / {quote}</Txt>
        </Txt>
        <Txt variant="small" numeric>
          {ticker ? `Vol ${formatCompact(ticker.volume24h)}` : '—'}
        </Txt>
      </View>
      <View style={styles.values}>
        <Txt variant="label" numeric>
          {ticker ? formatPrice(ticker.last) : '—'}
        </Txt>
        {ticker ? (
          <ChangeText value={ticker.changePct24h} text={formatPct(ticker.changePct24h)} variant="small" />
        ) : null}
      </View>
    </Pressable>
  );
}

/** Memo: con 4 redibujos por segundo, solo se repintan las filas cuyo ticker cambió. */
export const MarketRow = memo(MarketRowBase, (a, b) => a.ticker === b.ticker && a.market === b.market);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { flex: 1, gap: 2 },
  values: { alignItems: 'flex-end', gap: 2 },
});
