import { formatCompact, formatPct, marketToSlug, type Ticker } from '@cryptaura/core';
import { Card, ChangeText, Pill, SectionTitle, Stat, Txt, spacing, useTheme } from '@cryptaura/ui';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Gauge, Sparkline } from '@/components/charts';
import { Disclaimer } from '@/components/disclaimer';
import { useTickers } from '@/hooks/use-market-data';
import { fill, useI18n } from '@/i18n';
import { marketBrief } from '@/lib/brief';
import { timeAgo } from '@/lib/describe';
import { DEFAULT_MARKETS } from '@/lib/feed';
import { getHeadlines, getOverview, type Headline, type Overview } from '@/services/api';

function fgLabel(value: number, labels: { extremeFear: string; fear: string; neutral: string; greed: string; extremeGreed: string }) {
  if (value < 25) return labels.extremeFear;
  if (value < 45) return labels.fear;
  if (value <= 55) return labels.neutral;
  if (value <= 75) return labels.greed;
  return labels.extremeGreed;
}

/** Panorama del mercado: índice, capitalización, stablecoins, movimientos, titulares y resumen. */
export default function OverviewScreen() {
  const theme = useTheme();
  const { t, lang, locale } = useI18n();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const tickers = useTickers(DEFAULT_MARKETS, 1);

  useEffect(() => {
    void getOverview().then(setOverview);
  }, []);
  useEffect(() => {
    void getHeadlines(lang).then(setHeadlines);
  }, [lang]);

  const list = Object.values(tickers).filter((tk): tk is Ticker => !!tk);
  const movers = [...list]
    .filter((tk) => !tk.market.startsWith('USD'))
    .sort((a, b) => Math.abs(b.changePct24h) - Math.abs(a.changePct24h))
    .slice(0, 4);
  const brief = marketBrief(t, locale, list);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {brief ? (
        <Card>
          <View style={styles.row}>
            <Ionicons name="sparkles" size={16} color={theme.accent} />
            <Txt variant="label" style={{ flex: 1 }}>
              {t.overview.dailyBrief}
            </Txt>
            <Pill label="Beta" />
          </View>
          <Txt variant="body" style={{ lineHeight: 21 }}>
            {brief}
          </Txt>
          <Txt variant="small">{t.market.briefNote}</Txt>
        </Card>
      ) : null}

      <Card style={{ alignItems: 'center' }}>
        <View style={[styles.row, { alignSelf: 'stretch' }]}>
          <Txt variant="label" style={{ flex: 1 }}>
            {t.overview.fearGreed}
          </Txt>
          {overview?.sample ? <Pill label={t.common.sample} /> : null}
        </View>
        {overview ? (
          <>
            <Gauge value={overview.fearGreed.value} />
            <Txt variant="hero" numeric style={{ marginTop: -spacing.md }}>
              {overview.fearGreed.value}
            </Txt>
            <Txt variant="label" style={{ color: theme.accent }}>
              {fgLabel(overview.fearGreed.value, t.overview.fgLabels)}
            </Txt>
            <View style={{ alignSelf: 'stretch' }}>
              <Sparkline values={overview.fearGreed.history} color={theme.accent} />
            </View>
            <Txt variant="small">{t.overview.fgSource}</Txt>
          </>
        ) : (
          <Txt variant="muted">{t.common.loading}</Txt>
        )}
      </Card>

      {overview ? (
        <Card>
          <View style={styles.row}>
            <Stat label={t.overview.marketCap} value={`$${formatCompact(overview.totalMarketCapUsd, locale)}`}>
              <ChangeText
                value={overview.marketCapChange24hPct}
                text={`${formatPct(overview.marketCapChange24hPct, locale)} · 24h`}
                variant="small"
              />
            </Stat>
            <Stat label={t.overview.stablecoins} value={`$${formatCompact(overview.stablecoinsUsd, locale)}`}>
              <ChangeText
                value={overview.stablecoinsChange7dPct}
                text={fill(t.overview.sevenDays, { v: formatPct(overview.stablecoinsChange7dPct, locale) })}
                variant="small"
              />
            </Stat>
          </View>
          <View style={styles.row}>
            <Stat label={t.overview.dominance} value={`${overview.btcDominancePct.toFixed(1)}%`} />
            <Stat label={t.overview.ethDominance} value={`${overview.ethDominancePct.toFixed(1)}%`} />
          </View>
          <DominanceBar btc={overview.btcDominancePct} eth={overview.ethDominancePct} />
          {overview.sample ? <Txt variant="small">{t.overview.sampleNote}</Txt> : null}
        </Card>
      ) : null}

      <Card>
        <SectionTitle>{t.overview.movers}</SectionTitle>
        {movers.length === 0 ? <Txt variant="muted">{t.common.loading}</Txt> : null}
        {movers.map((tk) => (
          <Pressable
            key={tk.market}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/market/[slug]', params: { slug: marketToSlug(tk.market) } })}
            style={styles.mover}
          >
            <Txt variant="label" style={{ flex: 1 }}>
              {tk.market}
            </Txt>
            <ChangeText value={tk.changePct24h} text={formatPct(tk.changePct24h, locale)} />
          </Pressable>
        ))}
      </Card>

      <Card>
        <SectionTitle right={<Pill label={t.common.sample} />}>{t.overview.headlines}</SectionTitle>
        {headlines.map((h) => (
          <View key={h.id} style={[styles.headline, { borderColor: theme.border }]}>
            <Txt variant="body">{h.title}</Txt>
            <Txt variant="small">{timeAgo(h.publishedAt, locale)}</Txt>
          </View>
        ))}
        <Txt variant="small">{t.overview.headlinesNote}</Txt>
      </Card>

      <Disclaimer />
    </ScrollView>
  );
}

function DominanceBar({ btc, eth }: { btc: number; eth: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.surfaceAlt }]}>
      <View style={{ width: `${btc}%`, backgroundColor: theme.accent }} />
      <View style={{ width: `${eth}%`, backgroundColor: theme.textMuted }} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mover: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  headline: { gap: 2, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
});
