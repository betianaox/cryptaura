import { formatPrice, marketToSlug } from '@cryptaura/core';
import { Button, Card, EmptyState, SectionTitle, Txt, spacing, useTheme } from '@cryptaura/ui';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { fill, useI18n } from '@/i18n';
import { describeRule, timeAgo } from '@/lib/describe';
import { useStore } from '@/state/store';

/** Alertas: activas, disparadas y botón para crear una nueva. */
export default function AlertsScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const alerts = useStore((s) => s.alerts);
  const events = useStore((s) => s.alertEvents);
  const setEnabled = useStore((s) => s.setAlertEnabled);
  const remove = useStore((s) => s.removeAlert);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Button
        title={t.alerts.new}
        icon={<Ionicons name="add" size={18} color={theme.onAccent} />}
        onPress={() => router.push('/alert/new')}
      />

      <Card>
        <SectionTitle>{t.alerts.active}</SectionTitle>
        {alerts.length === 0 ? <EmptyState text={t.alerts.empty} /> : null}
        {alerts.map((alert) => (
          <View key={alert.id} style={[styles.alert, { borderColor: theme.border }]}>
            <Pressable
              style={{ flex: 1, gap: 2 }}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/market/[slug]', params: { slug: marketToSlug(alert.market) } })}
            >
              <Txt variant="label">{alert.market}</Txt>
              <Txt variant="small">{describeRule(t, alert.rule, locale)}</Txt>
              {alert.lastTriggeredAt ? (
                <Txt variant="small" style={{ color: theme.accent }}>
                  {timeAgo(alert.lastTriggeredAt, locale)}
                </Txt>
              ) : null}
            </Pressable>
            <Switch
              value={alert.enabled}
              onValueChange={(v) => setEnabled(alert.id, v)}
              trackColor={{ true: theme.accent, false: theme.surfaceAlt }}
              thumbColor={theme.surface}
            />
            <Pressable accessibilityRole="button" accessibilityLabel={t.common.delete} hitSlop={10} onPress={() => remove(alert.id)}>
              <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
            </Pressable>
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle>{t.alerts.history}</SectionTitle>
        {events.length === 0 ? <EmptyState text={t.alerts.noHistory} /> : null}
        {events.slice(0, 20).map((e) => (
          <View key={e.id} style={[styles.event, { borderColor: theme.border }]}>
            <Ionicons name="notifications" size={16} color={theme.accent} />
            <View style={{ flex: 1 }}>
              <Txt variant="label">
                {e.market} · {describeRule(t, e.rule, locale)}
              </Txt>
              <Txt variant="small" numeric>
                {fill(t.alerts.triggeredAt, { time: timeAgo(e.at, locale), price: formatPrice(e.price, locale) })}
              </Txt>
            </View>
          </View>
        ))}
      </Card>

      <Txt variant="small" style={{ textAlign: 'center' }}>
        {t.alerts.pushNote}
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
