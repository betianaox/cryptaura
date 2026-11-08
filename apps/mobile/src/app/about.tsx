import { Card, Txt, spacing } from '@cryptaura/ui';
import { ScrollView, StyleSheet } from 'react-native';

import { useI18n } from '@/i18n';

/** Fuentes de datos, atribuciones, privacidad y aviso. */
export default function AboutScreen() {
  const { t } = useI18n();
  const sources = [
    ['Kraken', t.about.kraken],
    ['Coinbase', t.about.coinbase],
    ['Binance', t.about.binance],
    ['alternative.me', t.about.alternative],
  ] as const;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Txt variant="title">{t.about.title}</Txt>
        <Txt variant="muted">{t.about.body}</Txt>
      </Card>
      <Card>
        <Txt variant="title">{t.about.sources}</Txt>
        {sources.map(([name, use]) => (
          <Txt key={name} variant="muted">
            <Txt variant="label">{name}</Txt> — {use}
          </Txt>
        ))}
        <Txt variant="small">{t.about.independent}</Txt>
      </Card>
      <Card>
        <Txt variant="muted">{t.about.privacy}</Txt>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
});
