import type { ConnectionState } from '@cryptaura/core';
import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { font, radius, spacing, tabular, useTheme } from './theme';

type Variant = 'hero' | 'title' | 'body' | 'label' | 'small' | 'muted';

export function Txt({
  variant = 'body',
  style,
  numeric,
  ...rest
}: TextProps & { variant?: Variant; numeric?: boolean; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  const base: TextStyle = {
    hero: { fontSize: font.hero, fontWeight: '700' as const, color: theme.text },
    title: { fontSize: font.title, fontWeight: '700' as const, color: theme.text },
    body: { fontSize: font.body, color: theme.text },
    label: { fontSize: font.body, fontWeight: '600' as const, color: theme.text },
    small: { fontSize: font.small, color: theme.textMuted },
    muted: { fontSize: font.body, color: theme.textMuted },
  }[variant];
  return <Text {...rest} style={[base, numeric ? tabular : null, style]} />;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

/** Variación con color y signo. */
export function ChangeText({
  value,
  text,
  variant = 'label',
}: {
  value: number;
  text: string;
  variant?: Variant;
}) {
  const theme = useTheme();
  const color = value > 0 ? theme.up : value < 0 ? theme.down : theme.textMuted;
  return (
    <Txt variant={variant} numeric style={{ color }}>
      {text}
    </Txt>
  );
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'up' | 'down' }) {
  const theme = useTheme();
  const bg = tone === 'up' ? theme.upSoft : tone === 'down' ? theme.downSoft : theme.surfaceAlt;
  const fg = tone === 'up' ? theme.up : tone === 'down' ? theme.down : theme.textMuted;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: font.small, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  idle: 'Offline',
  connecting: 'Connecting',
  open: 'Live',
  reconnecting: 'Reconnecting',
  closed: 'Offline',
};

/** Punto de estado de la conexión en vivo. */
export function ConnectionBadge({ state, label }: { state: ConnectionState; label?: string }) {
  const theme = useTheme();
  const color = state === 'open' ? theme.up : state === 'closed' || state === 'idle' ? theme.down : '#F5B544';
  return (
    <View
      style={styles.connection}
      accessibilityRole="text"
      accessibilityLabel={label ?? CONNECTION_LABEL[state]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Txt variant="small">{label ?? CONNECTION_LABEL[state]}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  connection: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
