import { formatPrice, slugToMarket, tickerSpreadPct, type AlertKind, type MarketId } from '@cryptaura/core';
import { Button, Chip, Field, Segmented, Txt, spacing } from '@cryptaura/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { useTicker } from '@/hooks/use-market-data';
import { fill, useI18n } from '@/i18n';
import { DEFAULT_MARKETS } from '@/lib/feed';
import { useStore } from '@/state/store';

const KINDS: AlertKind[] = ['price-above', 'price-below', 'change-above', 'spread-above'];

/** Crear una alerta: par, condición y valor. */
export default function NewAlertScreen() {
  const params = useLocalSearchParams<{ market?: string }>();
  const { t, locale } = useI18n();
  const addAlert = useStore((s) => s.addAlert);
  const [market, setMarket] = useState<MarketId>(params.market ? slugToMarket(params.market) : 'BTC/USD');
  const [kind, setKind] = useState<AlertKind>('price-above');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | undefined>();
  const ticker = useTicker(market);

  const current = !ticker
    ? '—'
    : kind === 'change-above'
      ? `${Math.abs(ticker.changePct24h).toFixed(2)}%`
      : kind === 'spread-above'
        ? `${tickerSpreadPct(ticker).toFixed(3)}%`
        : formatPrice(ticker.last, locale);

  const create = () => {
    const value = Number(text.replace(',', '.'));
    if (!(value > 0)) return setError(t.alerts.invalid);
    addAlert(market, { kind, value });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ gap: spacing.sm }}>
          <Txt variant="label">{t.alerts.market}</Txt>
          <View style={styles.chips}>
            {DEFAULT_MARKETS.map((m) => (
              <Chip key={m} label={m} selected={m === market} onPress={() => setMarket(m)} />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Txt variant="label">{t.alerts.condition}</Txt>
          <Segmented<AlertKind>
            value={kind}
            onChange={(k) => {
              setKind(k);
              setError(undefined);
            }}
            options={KINDS.map((k) => ({ value: k, label: t.alerts.short[k] }))}
          />
          <Txt variant="small">{t.alerts.kinds[kind]}</Txt>
        </View>

        <Field
          label={kind === 'price-above' || kind === 'price-below' ? `${t.alerts.value} (${market.split('/')[1]})` : `${t.alerts.value} (%)`}
          value={text}
          onChangeText={(v) => {
            setText(v);
            setError(undefined);
          }}
          keyboardType="decimal-pad"
          placeholder={current === '—' ? '' : current}
          hint={fill(t.alerts.current, { v: current })}
          error={error}
        />

        <Button title={t.alerts.create} onPress={create} />
        <Txt variant="small" style={{ textAlign: 'center' }}>
          {t.alerts.pushNote}
        </Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
