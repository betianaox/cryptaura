import {
  PAPER_FEE_RATE,
  formatPrice,
  formatQty,
  isPaperMarket,
  slugToMarket,
  type MarketId,
  type OrderType,
  type TradeSide,
} from '@cryptaura/core';
import { Button, Card, Chip, Field, Segmented, Txt, spacing, useTheme } from '@cryptaura/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { useTicker } from '@/hooks/use-market-data';
import { fill, useI18n } from '@/i18n';
import { DEFAULT_MARKETS } from '@/lib/feed';
import { useStore } from '@/state/store';

const PAPER_MARKETS = DEFAULT_MARKETS.filter(isPaperMarket);

/** Operar en el simulador: compra o venta, de mercado o límite. */
export default function TradeScreen() {
  const params = useLocalSearchParams<{ slug?: string }>();
  const theme = useTheme();
  const { t, locale } = useI18n();
  const initial = params.slug ? slugToMarket(params.slug) : 'BTC/USD';
  const [market, setMarket] = useState<MarketId>(isPaperMarket(initial) ? initial : 'BTC/USD');
  const [side, setSide] = useState<TradeSide>('buy');
  const [type, setType] = useState<OrderType>('market');
  const [qtyText, setQtyText] = useState('');
  const [limitText, setLimitText] = useState('');
  const [error, setError] = useState<string | undefined>();
  const ticker = useTicker(market);
  const cash = useStore((s) => s.paper.cash);
  const held = useStore((s) => s.paper.positions[market]?.qty ?? 0);
  const placeOrder = useStore((s) => s.placeOrder);
  const showToast = useStore((s) => s.showToast);
  const [base, quote] = market.split('/') as [string, string];

  const qty = Number(qtyText.replace(',', '.'));
  const limit = Number(limitText.replace(',', '.'));
  const price = type === 'limit' ? limit : side === 'buy' ? ticker?.ask : ticker?.bid;
  const gross = qty > 0 && price && price > 0 ? qty * price : 0;
  const fee = gross * PAPER_FEE_RATE;
  const total = side === 'buy' ? gross + fee : gross - fee;

  const submit = () => {
    const result = placeOrder(
      { market, side, type, qty, limitPrice: type === 'limit' ? limit : undefined },
      ticker,
    );
    if (!result.ok) return setError(t.sim.errors[result.error]);
    showToast({
      title: result.order.status === 'filled' ? t.sim.filled : t.sim.placed,
      body: `${side === 'buy' ? t.sim.buy : t.sim.sell} ${formatQty(qty, locale)} ${base}`,
    });
    router.back();
  };

  const setMax = () => {
    if (side === 'sell') return setQtyText(String(held));
    if (price && price > 0) setQtyText(String(Math.floor((cash / (price * (1 + PAPER_FEE_RATE))) * 1e6) / 1e6));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.chips}>
          {PAPER_MARKETS.map((m) => (
            <Chip
              key={m}
              label={m}
              selected={m === market}
              onPress={() => {
                setMarket(m);
                setError(undefined);
              }}
            />
          ))}
        </View>

        <Card>
          <View style={styles.row}>
            <Txt variant="small">{t.market.bid}</Txt>
            <Txt variant="label" numeric style={{ color: theme.up }}>
              {ticker ? formatPrice(ticker.bid, locale) : '—'}
            </Txt>
            <Txt variant="small">{t.market.ask}</Txt>
            <Txt variant="label" numeric style={{ color: theme.down }}>
              {ticker ? formatPrice(ticker.ask, locale) : '—'}
            </Txt>
          </View>
        </Card>

        <Segmented<TradeSide>
          value={side}
          onChange={(s) => {
            setSide(s);
            setError(undefined);
          }}
          options={[
            { value: 'buy', label: t.sim.buy },
            { value: 'sell', label: t.sim.sell },
          ]}
        />
        <Segmented<OrderType>
          value={type}
          onChange={(v) => {
            setType(v);
            setError(undefined);
            if (v === 'limit' && !limitText && ticker) setLimitText(String(Number(ticker.last.toPrecision(6))));
          }}
          options={[
            { value: 'market', label: t.sim.market },
            { value: 'limit', label: t.sim.limit },
          ]}
        />

        <Field
          label={fill(t.sim.qty, { base })}
          value={qtyText}
          onChangeText={(v) => {
            setQtyText(v);
            setError(undefined);
          }}
          keyboardType="decimal-pad"
          placeholder="0.00"
          hint={`${t.sim.available}: ${side === 'buy' ? `$${formatPrice(cash, locale, 2)}` : `${formatQty(held, locale)} ${base}`}`}
          error={error}
        />
        <Button title="Max" variant="ghost" onPress={setMax} />
        {type === 'limit' ? (
          <Field
            label={fill(t.sim.limitPrice, { quote })}
            value={limitText}
            onChangeText={(v) => {
              setLimitText(v);
              setError(undefined);
            }}
            keyboardType="decimal-pad"
          />
        ) : null}

        <Card>
          <View style={styles.summary}>
            <Txt variant="small">{t.sim.price}</Txt>
            <Txt variant="small" numeric>
              {price && price > 0 ? formatPrice(price, locale) : '—'}
            </Txt>
          </View>
          <View style={styles.summary}>
            <Txt variant="small">
              {t.sim.fee} ({(PAPER_FEE_RATE * 100).toFixed(2)}%)
            </Txt>
            <Txt variant="small" numeric>
              ${formatPrice(fee, locale, 2)}
            </Txt>
          </View>
          <View style={styles.summary}>
            <Txt variant="label">{t.sim.estimate}</Txt>
            <Txt variant="label" numeric>
              ${formatPrice(total, locale, 2)}
            </Txt>
          </View>
        </Card>

        <Button
          title={fill(t.sim.place, { side: side === 'buy' ? t.sim.buy : t.sim.sell, base })}
          variant={side === 'buy' ? 'up' : 'down'}
          onPress={submit}
        />
        <Txt variant="small" style={{ textAlign: 'center' }}>
          {t.sim.onlyUsd}
        </Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  summary: { flexDirection: 'row', justifyContent: 'space-between' },
});
