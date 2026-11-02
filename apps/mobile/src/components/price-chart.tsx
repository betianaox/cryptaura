import { INTERVALS, type Candle, type Interval } from '@cryptaura/core';
import { Card, Txt, radius, spacing, useTheme } from '@cryptaura/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Rect } from 'react-native-svg';

const HEIGHT = 180;

/**
 * Gráfico de velas simple con react-native-svg. Fase 0: alcanza para ver la
 * forma del mercado; en la fase 1 se suma zoom, cruz de lectura y volumen.
 */
export function PriceChart({
  candles,
  interval,
  onInterval,
}: {
  candles: Candle[];
  interval: Interval;
  onInterval: (interval: Interval) => void;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const visible = candles.slice(-60);

  let body = null;
  if (width > 0 && visible.length > 1) {
    const highs = visible.map((c) => c.high);
    const lows = visible.map((c) => c.low);
    const max = Math.max(...highs);
    const min = Math.min(...lows);
    const range = max - min || 1;
    const y = (v: number) => ((max - v) / range) * (HEIGHT - 8) + 4;
    const step = width / visible.length;
    const bodyWidth = Math.max(1, step * 0.6);
    body = (
      <Svg width={width} height={HEIGHT}>
        {visible.map((c, i) => {
          const x = i * step + step / 2;
          const up = c.close >= c.open;
          const color = up ? theme.up : theme.down;
          const top = y(Math.max(c.open, c.close));
          const bottom = y(Math.min(c.open, c.close));
          return (
            <G key={c.ts}>
              <Line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} />
              <Rect
                x={x - bodyWidth / 2}
                y={top}
                width={bodyWidth}
                height={Math.max(1, bottom - top)}
                fill={color}
              />
            </G>
          );
        })}
      </Svg>
    );
  }

  return (
    <Card>
      <View style={styles.intervals}>
        {INTERVALS.map((i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityState={{ selected: i === interval }}
            onPress={() => onInterval(i)}
            style={[styles.interval, { backgroundColor: i === interval ? theme.surfaceAlt : 'transparent' }]}
          >
            <Txt variant="small" style={{ color: i === interval ? theme.text : theme.textMuted }}>
              {i}
            </Txt>
          </Pressable>
        ))}
      </View>
      <View style={{ height: HEIGHT }} onLayout={onLayout}>
        {body ?? <Txt variant="muted">Loading chart…</Txt>}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  intervals: { flexDirection: 'row', gap: spacing.xs },
  interval: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
});
