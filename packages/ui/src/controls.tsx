import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { Txt } from './components';
import { font, radius, spacing, useTheme } from './theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'up' | 'down';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const bg = {
    primary: theme.accent,
    secondary: theme.surfaceAlt,
    ghost: 'transparent',
    up: theme.up,
    down: theme.down,
  }[variant];
  const fg = variant === 'secondary' || variant === 'ghost' ? theme.text : theme.onAccent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
        style,
      ]}
    >
      {icon}
      <Text style={{ color: fg, fontSize: font.body, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}

/** Selector de opciones en una sola fila (pestañas chicas). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.surfaceAlt }, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && { backgroundColor: theme.surface }]}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: font.small,
                fontWeight: selected ? '700' : '500',
                color: selected ? theme.text : theme.textMuted,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Fila de chips que se pueden desplazar o envolver. */
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.accent : theme.surfaceAlt,
        },
      ]}
    >
      <Text style={{ color: selected ? theme.onAccent : theme.text, fontSize: font.small, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({ label, hint, error, ...input }: TextInputProps & { label: string; hint?: string; error?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Txt variant="label">{label}</Txt>
      <TextInput
        placeholderTextColor={theme.textMuted}
        {...input}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.surface,
            borderColor: error ? theme.down : theme.border,
          },
        ]}
      />
      {error ? (
        <Txt variant="small" style={{ color: theme.down }}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="small">{hint}</Txt>
      ) : null}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Txt variant="label" style={{ flex: 1 }}>
        {children}
      </Txt>
      {right}
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <Txt variant="muted" style={{ textAlign: 'center', paddingVertical: spacing.lg }}>
      {text}
    </Txt>
  );
}

/** Dato con etiqueta chica arriba y valor grande abajo. */
export function Stat({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Txt variant="small">{label}</Txt>
      <Txt variant="title" numeric>
        {value}
      </Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  segmented: { flexDirection: 'row', borderRadius: radius.md, padding: 3, gap: 3 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: radius.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    fontSize: font.body,
  },
  section: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
