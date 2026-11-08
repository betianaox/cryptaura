import { Button, Card, Segmented, Txt, spacing, useTheme } from '@cryptaura/ui';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert as NativeAlert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { fill, LANGUAGES, useI18n, type Language } from '@/i18n';
import { useStore, type DataSource, type ThemePreference } from '@/state/store';

/** Ajustes: apariencia, idioma, fuente de datos, aviso legal y borrar datos. */
export default function SettingsScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const themePref = useStore((s) => s.theme);
  const language = useStore((s) => s.language);
  const source = useStore((s) => s.source);
  const setTheme = useStore((s) => s.setTheme);
  const setLanguage = useStore((s) => s.setLanguage);
  const setSource = useStore((s) => s.setSource);
  const resetAll = useStore((s) => s.resetAll);
  const showToast = useStore((s) => s.showToast);

  const reset = () => {
    const done = () => {
      resetAll();
      showToast({ title: t.settings.resetDone });
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(t.settings.resetConfirm)) done();
      return;
    }
    NativeAlert.alert(t.settings.reset, t.settings.resetConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: done },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Txt variant="label">{t.settings.appearance}</Txt>
        <Segmented<ThemePreference>
          value={themePref}
          onChange={setTheme}
          options={[
            { value: 'system', label: t.settings.system },
            { value: 'light', label: t.settings.light },
            { value: 'dark', label: t.settings.dark },
          ]}
        />
      </Card>

      <Card>
        <Txt variant="label">{t.settings.language}</Txt>
        <Segmented<Language | 'system'>
          value={language}
          onChange={setLanguage}
          options={[{ value: 'system', label: t.settings.system }, ...LANGUAGES.map((l) => ({ value: l.id, label: l.label }))]}
        />
      </Card>

      <Card>
        <Txt variant="label">{t.settings.source}</Txt>
        <Segmented<DataSource>
          value={source}
          onChange={setSource}
          options={[
            { value: 'live', label: t.settings.sourceLive },
            { value: 'demo', label: t.settings.sourceDemo },
          ]}
        />
        <Txt variant="small">{t.settings.sourceNote}</Txt>
      </Card>

      <Card style={{ paddingVertical: spacing.sm }}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/about')} style={styles.link}>
          <Ionicons name="shield-checkmark-outline" size={18} color={theme.accent} />
          <Txt variant="label" style={{ flex: 1 }}>
            {t.settings.data}
          </Txt>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>
      </Card>

      <Button title={t.settings.reset} variant="ghost" onPress={reset} />
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Txt variant="small">Cryptaura · ImagoStack</Txt>
        <Txt variant="small">{fill(t.settings.version, { v: Constants.expoConfig?.version ?? '1.0.0' })}</Txt>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
});
